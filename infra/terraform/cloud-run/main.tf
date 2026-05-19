terraform {
  required_version = ">= 1.5.7"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_secret_manager_secret" "postgres_app_password" {
  count     = var.enable_self_managed_postgres ? 1 : 0
  secret_id = var.postgres_password_secret_name

  replication {
    auto {}
  }
}

resource "google_project_iam_member" "postgres_vm_secret_accessor" {
  count   = var.enable_self_managed_postgres ? 1 : 0
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${var.runtime_service_account_email}"
}

resource "google_vpc_access_connector" "serverless" {
  count         = var.enable_self_managed_postgres ? 1 : 0
  name          = var.serverless_vpc_connector_name
  region        = var.region
  network       = var.postgres_network
  ip_cidr_range = var.serverless_vpc_connector_cidr
  min_instances = var.serverless_vpc_connector_min_instances
  max_instances = var.serverless_vpc_connector_max_instances
}

resource "google_compute_disk" "postgres_data" {
  count = var.enable_self_managed_postgres ? 1 : 0
  name  = "${var.postgres_instance_name}-data"
  type  = "pd-balanced"
  zone  = var.postgres_zone
  size  = var.postgres_disk_size_gb

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_compute_instance" "postgres" {
  count        = var.enable_self_managed_postgres ? 1 : 0
  name         = var.postgres_instance_name
  machine_type = var.postgres_machine_type
  zone         = var.postgres_zone
  tags         = ["pico-postgres"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 20
      type  = "pd-balanced"
    }
  }

  attached_disk {
    source      = google_compute_disk.postgres_data[0].id
    device_name = "postgres-data"
  }

  network_interface {
    network = var.postgres_network
  }

  service_account {
    email = var.runtime_service_account_email
    scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }

  metadata_startup_script = templatefile("${path.module}/postgres-startup.sh.tftpl", {
    app_database         = var.postgres_app_database
    app_user             = var.postgres_app_user
    container_image      = var.postgres_container_image
    password_secret_name = var.postgres_password_secret_name
    project_id           = var.project_id
  })

  allow_stopping_for_update = true
  deletion_protection       = var.deletion_protection
}

resource "google_compute_firewall" "postgres_from_serverless" {
  count   = var.enable_self_managed_postgres ? 1 : 0
  name    = "${var.postgres_instance_name}-from-serverless"
  network = var.postgres_network

  allow {
    protocol = "tcp"
    ports    = ["5432"]
  }

  source_ranges = [
    var.serverless_vpc_connector_cidr
  ]

  target_tags = [
    "pico-postgres"
  ]
}

resource "google_compute_router" "postgres_nat" {
  count   = var.enable_self_managed_postgres ? 1 : 0
  name    = "${var.postgres_instance_name}-router"
  network = var.postgres_network
  region  = var.region
}

resource "google_compute_router_nat" "postgres_nat" {
  count                              = var.enable_self_managed_postgres ? 1 : 0
  name                               = "${var.postgres_instance_name}-nat"
  router                             = google_compute_router.postgres_nat[0].name
  region                             = google_compute_router.postgres_nat[0].region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}

resource "google_cloud_run_v2_service" "api" {
  name                 = var.service_name
  location             = var.region
  ingress              = var.ingress
  deletion_protection  = var.deletion_protection
  invoker_iam_disabled = var.invoker_iam_disabled
  client               = "terraform"

  template {
    service_account                  = var.runtime_service_account_email
    timeout                          = "${var.timeout_seconds}s"
    max_instance_request_concurrency = var.max_instance_request_concurrency

    containers {
      image = var.container_image
      name  = var.container_name

      env {
        name = "OPENAI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = var.openai_api_key_secret_name
            version = "latest"
          }
        }
      }

      dynamic "env" {
        for_each = var.openai_model == null ? [] : [var.openai_model]
        content {
          name  = "OPENAI_MODEL"
          value = env.value
        }
      }

      env {
        name = "API_PROXY_SHARED_SECRET"
        value_source {
          secret_key_ref {
            secret  = var.api_proxy_secret_name
            version = "latest"
          }
        }
      }

      env {
        name = "CORE_DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = var.core_database_url_secret_name
            version = "latest"
          }
        }
      }

      ports {
        container_port = 8080
      }

      startup_probe {
        tcp_socket {
          port = 8080
        }
        initial_delay_seconds = var.startup_probe_initial_delay_seconds
        period_seconds        = var.startup_probe_period_seconds
        timeout_seconds       = var.startup_probe_timeout_seconds
        failure_threshold     = var.startup_probe_failure_threshold
      }

      resources {
        cpu_idle          = var.cpu_idle
        startup_cpu_boost = var.startup_cpu_boost
        limits = {
          cpu    = var.cpu_limit
          memory = var.memory_limit
        }
      }
    }

    scaling {
      min_instance_count = var.min_instance_count
      max_instance_count = var.max_instance_count
    }

    dynamic "vpc_access" {
      for_each = var.enable_self_managed_postgres ? [google_vpc_access_connector.serverless[0].id] : []
      content {
        connector = vpc_access.value
        egress    = "PRIVATE_RANGES_ONLY"
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      client
    ]
  }
}

resource "google_cloud_run_v2_job" "core_migrate" {
  name     = "${var.service_name}-core-migrate"
  location = var.region
  client   = "terraform"

  template {
    template {
      service_account = var.runtime_service_account_email
      timeout         = "${var.timeout_seconds}s"

      containers {
        image = var.container_image
        name  = var.container_name
        command = [
          "node"
        ]
        args = [
          "apps/api/dist/migrate.js"
        ]

        env {
          name = "CORE_DATABASE_URL"
          value_source {
            secret_key_ref {
              secret  = var.core_database_url_secret_name
              version = "latest"
            }
          }
        }

        resources {
          limits = {
            cpu    = var.cpu_limit
            memory = var.memory_limit
          }
        }
      }

      dynamic "vpc_access" {
        for_each = var.enable_self_managed_postgres ? [google_vpc_access_connector.serverless[0].id] : []
        content {
          connector = vpc_access.value
          egress    = "PRIVATE_RANGES_ONLY"
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].template[0].containers[0].image,
      client
    ]
  }
}

resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  count    = var.allow_public_invoker && !var.invoker_iam_disabled ? 1 : 0
  location = google_cloud_run_v2_service.api.location
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloudbuild_trigger" "api_main_deploy" {
  count       = var.enable_github_deploy_trigger ? 1 : 0
  name        = "${var.service_name}-main-deploy"
  description = "Build and deploy ${var.service_name} to Cloud Run when ${var.github_owner}/${var.github_repo} main changes."
  location    = var.region
  filename    = "cloudbuild.yaml"

  github {
    owner = var.github_owner
    name  = var.github_repo

    push {
      branch = var.github_deploy_branch_regex
    }
  }

  included_files = [
    "apps/api/**",
    "packages/**",
    "package.json",
    "package-lock.json",
    "tsconfig.base.json",
    "cloudbuild.yaml"
  ]

  substitutions = {
    _AR_HOSTNAME   = var.artifact_registry_hostname
    _AR_REPOSITORY = var.artifact_registry_repository
    _IMAGE_NAME    = var.api_image_name
    _SERVICE_NAME  = var.service_name
    _MIGRATION_JOB = google_cloud_run_v2_job.core_migrate.name
    _DEPLOY_REGION = var.region
  }
}
