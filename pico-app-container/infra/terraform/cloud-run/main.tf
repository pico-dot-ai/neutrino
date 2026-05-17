resource "google_cloud_run_v2_service" "api" {
  name     = var.service_name
  location = var.region

  template {
    containers {
      image = var.image

      env {
        name  = "PORT"
        value = "8080"
      }

      env {
        name  = "PICO_APP_ID"
        value = var.pico_app_id
      }

      env {
        name  = "NEUTRINO_TOKEN_URL"
        value = var.neutrino_token_url
      }

      env {
        name  = "NEUTRINO_GRPC_ENDPOINT"
        value = var.neutrino_grpc_endpoint
      }
    }
  }
}
