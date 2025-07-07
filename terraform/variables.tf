# Variables for AutoHeal-GCP Terraform configuration

variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "The GCP zone"
  type        = string
  default     = "us-central1-a"
}

variable "sendgrid_api_key" {
  description = "SendGrid API key for email notifications"
  type        = string
  sensitive   = true
  default     = ""
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications"
  type        = string
  sensitive   = true
  default     = ""
}

variable "notification_email" {
  description = "Email address for notifications"
  type        = string
  default     = "admin@example.com"
}
