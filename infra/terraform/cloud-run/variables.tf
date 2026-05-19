variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "ingress" {
  type    = string
  default = "INGRESS_TRAFFIC_ALL"
}

variable "deletion_protection" {
  type    = bool
  default = true
}

variable "invoker_iam_disabled" {
  type    = bool
  default = true
}

variable "service_name" {
  type    = string
  default = "neutrino-api"
}

variable "runtime_service_account_email" {
  type    = string
  default = "695331385631-compute@developer.gserviceaccount.com"
}

variable "container_image" {
  type = string
}

variable "openai_api_key_secret_name" {
  type = string
}

variable "api_proxy_secret_name" {
  type = string
}

variable "core_database_url_secret_name" {
  type = string
}

variable "openai_model" {
  type    = string
  default = null
}

variable "allow_public_invoker" {
  type    = bool
  default = false
}

variable "container_name" {
  type    = string
  default = "placeholder-1"
}

variable "timeout_seconds" {
  type    = number
  default = 300
}

variable "max_instance_request_concurrency" {
  type    = number
  default = 80
}

variable "min_instance_count" {
  type    = number
  default = 0
}

variable "max_instance_count" {
  type    = number
  default = 3
}

variable "cpu_limit" {
  type    = string
  default = "1000m"
}

variable "memory_limit" {
  type    = string
  default = "512Mi"
}

variable "cpu_idle" {
  type    = bool
  default = true
}

variable "startup_cpu_boost" {
  type    = bool
  default = true
}

variable "startup_probe_period_seconds" {
  type    = number
  default = 240
}

variable "startup_probe_timeout_seconds" {
  type    = number
  default = 240
}

variable "startup_probe_failure_threshold" {
  type    = number
  default = 1
}

variable "startup_probe_initial_delay_seconds" {
  type    = number
  default = 0
}

variable "enable_github_deploy_trigger" {
  type    = bool
  default = false
}

variable "github_owner" {
  type    = string
  default = "pico-dot-ai"
}

variable "github_repo" {
  type    = string
  default = "neutrino"
}

variable "github_deploy_branch_regex" {
  type    = string
  default = "^main$"
}

variable "github_connection_name" {
  type    = string
  default = "neutrino-github"
}

variable "github_repository_name" {
  type    = string
  default = "neutrino"
}

variable "artifact_registry_hostname" {
  type    = string
  default = "us-central1-docker.pkg.dev"
}

variable "artifact_registry_repository" {
  type    = string
  default = "cloud-run-source-deploy"
}

variable "api_image_name" {
  type    = string
  default = "neutrino-api"
}

variable "enable_self_managed_postgres" {
  type    = bool
  default = false
}

variable "postgres_deployment_mode" {
  type    = string
  default = "prototype"

  validation {
    condition     = contains(["prototype", "hardened"], var.postgres_deployment_mode)
    error_message = "postgres_deployment_mode must be either \"prototype\" or \"hardened\"."
  }
}

variable "postgres_instance_name" {
  type    = string
  default = "pico-postgres"
}

variable "postgres_zone" {
  type    = string
  default = "us-central1-a"
}

variable "postgres_machine_type" {
  type    = string
  default = "e2-small"
}

variable "postgres_disk_size_gb" {
  type    = number
  default = 20
}

variable "postgres_network" {
  type    = string
  default = "default"
}

variable "postgres_app_database" {
  type    = string
  default = "platform_prod"
}

variable "postgres_app_user" {
  type    = string
  default = "platform_user"
}

variable "postgres_password_secret_name" {
  type    = string
  default = "POSTGRES_APP_PASSWORD"
}

variable "postgres_container_image" {
  type    = string
  default = "pgvector/pgvector:pg17"
}

variable "serverless_vpc_connector_name" {
  type    = string
  default = "pico-serverless"
}

variable "serverless_vpc_connector_cidr" {
  type    = string
  default = "10.8.0.0/28"
}

variable "serverless_vpc_connector_min_instances" {
  type    = number
  default = 2
}

variable "serverless_vpc_connector_max_instances" {
  type    = number
  default = 3
}

variable "postgres_public_allowed_cidrs" {
  type    = list(string)
  default = ["0.0.0.0/0"]
}
