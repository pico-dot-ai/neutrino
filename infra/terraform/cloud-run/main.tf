terraform {
  required_version = ">= 1.6.0"

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
  name     = var.service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    timeout                          = "300s"
    max_instance_request_concurrency = 40

    containers {
      image = var.container_image

      env {
        name  = "PORT"
        value = "8080"
      }

      env {
        name = "OPENAI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = var.openai_api_key_secret_name
            version = "latest"
          }
        }
      }

      env {
        name  = "OPENAI_MODEL"
        value = var.openai_model
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
        http_get {
          path = "/readyz"
        }
        initial_delay_seconds = 2
        period_seconds        = 10
      }

      liveness_probe {
        http_get {
          path = "/healthz"
        }
        initial_delay_seconds = 10
        period_seconds        = 20
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 4
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  location = google_cloud_run_v2_service.api.location
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
