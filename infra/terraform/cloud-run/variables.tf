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

variable "service_name" {
  type    = string
  default = "neutrino-api"
}

variable "runtime_service_account_email" {
  type    = string
  default = null
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
  default = "gpt-5-mini"
}

variable "allow_public_invoker" {
  type    = bool
  default = true
}

variable "timeout_seconds" {
  type    = number
  default = 300
}

variable "max_instance_request_concurrency" {
  type    = number
  default = 40
}

variable "min_instance_count" {
  type    = number
  default = 0
}

variable "max_instance_count" {
  type    = number
  default = 4
}

variable "cpu_limit" {
  type    = string
  default = "1"
}

variable "memory_limit" {
  type    = string
  default = "512Mi"
}

variable "startup_probe_path" {
  type    = string
  default = "/readyz"
}

variable "startup_probe_initial_delay_seconds" {
  type    = number
  default = 2
}

variable "startup_probe_period_seconds" {
  type    = number
  default = 10
}

variable "liveness_probe_path" {
  type    = string
  default = "/healthz"
}

variable "liveness_probe_initial_delay_seconds" {
  type    = number
  default = 10
}

variable "liveness_probe_period_seconds" {
  type    = number
  default = 20
}
