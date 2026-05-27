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

output "artifact_bucket_name" {
  value = google_storage_bucket.artifacts.name
}

output "artifact_bucket_url" {
  value = google_storage_bucket.artifacts.url
}

output "kratos_enabled" {
  value = var.enable_kratos
}

output "kratos_public_service_name" {
  value = try(google_cloud_run_v2_service.kratos_public[0].name, null)
}

output "kratos_public_service_url" {
  value = try(google_cloud_run_v2_service.kratos_public[0].uri, null)
}

output "kratos_admin_service_name" {
  value = try(google_cloud_run_v2_service.kratos_admin[0].name, null)
}

output "kratos_admin_service_url" {
  value = try(google_cloud_run_v2_service.kratos_admin[0].uri, null)
}

output "kratos_migrate_job_name" {
  value = try(google_cloud_run_v2_job.kratos_migrate[0].name, null)
}

output "kratos_db_bootstrap_job_name" {
  value = try(google_cloud_run_v2_job.kratos_db_bootstrap[0].name, null)
}
