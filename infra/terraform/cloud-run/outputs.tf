output "service_name" {
  value = google_cloud_run_v2_service.api.name
}

output "service_url" {
  value = google_cloud_run_v2_service.api.uri
}

output "api_main_deploy_trigger_id" {
  value = try(google_cloudbuild_trigger.api_main_deploy[0].trigger_id, null)
}

output "migration_job_name" {
  value = google_cloud_run_v2_job.core_migrate.name
}

output "postgres_internal_ip" {
  value = try(google_compute_instance.postgres[0].network_interface[0].network_ip, null)
}

output "postgres_public_ip" {
  value = try(google_compute_instance.postgres[0].network_interface[0].access_config[0].nat_ip, null)
}

output "postgres_deployment_mode" {
  value = var.enable_self_managed_postgres ? var.postgres_deployment_mode : null
}

output "postgres_database" {
  value = var.postgres_app_database
}

output "postgres_user" {
  value = var.postgres_app_user
}

output "postgres_password_secret_name" {
  value = var.postgres_password_secret_name
}
