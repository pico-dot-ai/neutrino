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
