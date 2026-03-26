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
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
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
