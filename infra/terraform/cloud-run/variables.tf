variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "service_name" {
  type    = string
  default = "neutrino-api"
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
