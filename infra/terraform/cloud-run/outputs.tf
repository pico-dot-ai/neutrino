output "service_name" {
  value = google_cloud_run_v2_service.api.name
}

output "service_url" {
  value = google_cloud_run_v2_service.api.uri
}

output "api_main_deploy_trigger_id" {
  value = try(google_cloudbuild_trigger.api_main_deploy[0].trigger_id, null)
}
