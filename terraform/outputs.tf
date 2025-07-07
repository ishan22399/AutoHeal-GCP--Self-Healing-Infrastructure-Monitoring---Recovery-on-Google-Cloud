# Outputs for AutoHeal-GCP Terraform configuration

output "project_id" {
  description = "The GCP project ID"
  value       = var.project_id
}

output "pubsub_topic" {
  description = "The Pub/Sub topic for healing alerts"
  value       = google_pubsub_topic.healing_alerts.name
}

output "test_vm_name" {
  description = "Name of the test VM instance"
  value       = google_compute_instance.test_vm.name
}

output "test_vm_external_ip" {
  description = "External IP of the test VM"
  value       = google_compute_instance.test_vm.network_interface[0].access_config[0].nat_ip
}

output "cloud_run_url" {
  description = "URL of the test Cloud Run service"
  value       = google_cloud_run_service.test_service.status[0].url
}

output "function_service_account" {
  description = "Service account email for Cloud Functions"
  value       = google_service_account.autoheal_function_sa.email
}

output "storage_bucket" {
  description = "Storage bucket for function source code"
  value       = google_storage_bucket.function_source.name
}
