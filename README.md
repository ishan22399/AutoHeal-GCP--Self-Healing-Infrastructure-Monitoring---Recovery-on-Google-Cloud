# 🛠️ AutoHeal-GCP: Self-Healing Infrastructure Monitoring & Recovery on Google Cloud

A fully automated, scalable, and intelligent cloud infrastructure recovery system that detects, diagnoses, and heals failures across GCP services in real time. Think of it as a smart DevOps engineer watching over your infrastructure 24/7.

## 🚀 Features

- 🔍 **Real-Time Monitoring** of CPU, memory, uptime, errors across services
- 📉 **Anomaly Detection** using both rule-based thresholds & optional ML
- 🔁 **Automatic Recovery** (restart services, recreate VMs, scale clusters)
- 📬 **Alerting System** via Email (SendGrid), Slack, or Discord
- 📦 **Infrastructure-as-Code** using Terraform for full GCP provisioning
- 📊 **Dashboard**: View system health and recovery actions
- 🧪 **Failure Simulation Tools** for testing resiliency
- 🗂️ **Auditing Logs** for traceability and transparency

## 🧠 Why AutoHeal-GCP?

While GCP services like GKE and Cloud Run provide basic container-level self-healing, they:
- ❌ Lack cross-service recovery orchestration
- ❌ Don't support custom rule chains (log + CPU + network latency)
- ❌ Can't correlate patterns between different services
- ❌ Don't provide audit trails or anomaly learning

AutoHeal-GCP fixes these gaps — bringing real intelligence, automation, and transparency to your cloud infra.

## 📌 Architecture

\`\`\`
┌──────────────────────────┐
│   Application Services   │  <-- Hosted on GCE, GKE, or Cloud Run
└────────────┬─────────────┘
             │
             ▼
  ┌────────────────────────────┐
  │ Cloud Monitoring + Logging │  <-- Watch for CPU, memory, HTTP 5xx, logs
  └────────────┬───────────────┘
               │
               ▼
         ┌──────────────┐
         │   Pub/Sub    │  <-- Events published here on failure detection
         └────┬─────────┘
              ▼
       ┌────────────────┐
       │ Cloud Function │  <-- Reads Pub/Sub, executes recovery logic
       └─────┬──────────┘
             ▼
 ┌──────────────────────────────┐
 │  GCP APIs: Compute, GKE, Run │  <-- Restart, scale, redeploy, etc.
 └─────┬────────────────────────┘
       ▼
 ┌─────────────────────┐
 │ SendGrid / Slack API│  <-- Sends alert notifications
 └─────────────────────┘
\`\`\`

## 🔧 Tech Stack

| Category | Tech/Tool |
|----------|-----------|
| Cloud Provider | Google Cloud Platform |
| Compute | GCE, GKE, Cloud Run |
| Monitoring | Cloud Monitoring, Uptime Checks |
| Logging | Cloud Logging |
| Messaging | Pub/Sub |
| Automation | Cloud Functions (Python) |
| Workflow Orchestration | Cloud Workflows |
| Notifications | SendGrid, Slack |
| Infra-as-Code | Terraform for GCP |
| Dashboard | Next.js + Tailwind CSS |

## 🛠️ Quick Start

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/your-username/autoheal-gcp.git
   cd autoheal-gcp
   \`\`\`

2. **Set up GCP credentials**
   \`\`\`bash
   gcloud auth application-default login
   export GOOGLE_PROJECT_ID="your-project-id"
   \`\`\`

3. **Deploy infrastructure**
   \`\`\`bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   \`\`\`

4. **Deploy Cloud Functions**
   \`\`\`bash
   cd ../cloud-functions
   ./deploy.sh
   \`\`\`

5. **Start the dashboard**
   \`\`\`bash
   cd ../dashboard
   npm install
   npm run dev
   \`\`\`

6. **Test with failure simulation**
   \`\`\`bash
   cd ../simulator
   python simulate_cpu_spike.py
   \`\`\`

## 📦 Directory Structure

\`\`\`
autoheal-gcp/
├── terraform/            # GCP Infra provisioning scripts
├── cloud-functions/      # Healing logic in Python
├── dashboard/            # Real-time monitoring UI
├── simulator/            # Failure simulation tools
├── logs/                 # Collected and structured logs
├── docs/                 # Documentation
├── scripts/              # Utility scripts
└── README.md             # This document
\`\`\`

## 🧪 Example Recovery Rules

| Scenario | Action Taken |
|----------|--------------|
| CPU > 90% for 10 min | Scale up new VM or GKE pod |
| HTTP 500 errors spike | Restart affected Cloud Run container |
| App crash detected in logs | Cloud Function redeploys instance |
| Memory leak pattern over time | Alert + quarantine unhealthy instance |
| 3 failures in 15 minutes | Pause scaling and escalate to email |

## 🎯 How to Mention in Resume

**AutoHeal-GCP – Self-Healing Infrastructure System (GCP)**
*Designed and implemented a cloud-native infrastructure recovery engine on Google Cloud. Used real-time monitoring, Pub/Sub, Cloud Functions, and Terraform to auto-detect and remediate service failures like crashes, CPU spikes, and error rate anomalies. Logged all actions, sent alerts via SendGrid, and orchestrated multi-service healing workflows.*

## 📚 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## ❤️ Credits

Created by **Ishan Shivankar**
- Email: ishanshivankar14@gmail.com
- GitHub: [@ishan-shivankar](https://github.com/ishan-shivankar)

---

⭐ **Star this repo if it helped you!**
\`\`\`

```hcl file="terraform/main.tf"
# AutoHeal-GCP Terraform Configuration
# This file sets up the complete GCP infrastructure for the self-healing system

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# Configure the Google Cloud Provider
provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "compute.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "pubsub.googleapis.com",
    "cloudfunctions.googleapis.com",
    "cloudbuild.googleapis.com",
    "run.googleapis.com",
    "container.googleapis.com"
  ])
  
  service = each.value
  disable_on_destroy = false
}

# Create Pub/Sub topic for alerts
resource "google_pubsub_topic" "healing_alerts" {
  name = "autoheal-alerts"
  
  depends_on = [google_project_service.required_apis]
}

# Create Pub/Sub subscription
resource "google_pubsub_subscription" "healing_subscription" {
  name  = "autoheal-subscription"
  topic = google_pubsub_topic.healing_alerts.name

  ack_deadline_seconds = 20
  
  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }
}

# Create Cloud Storage bucket for function source code
resource "google_storage_bucket" "function_source" {
  name     = "${var.project_id}-autoheal-functions"
  location = var.region
  
  uniform_bucket_level_access = true
  
  versioning {
    enabled = true
  }
}

# Create service account for Cloud Functions
resource "google_service_account" "autoheal_function_sa" {
  account_id   = "autoheal-function"
  display_name = "AutoHeal Cloud Function Service Account"
  description  = "Service account for AutoHeal Cloud Functions"
}

# Grant necessary permissions to the service account
resource "google_project_iam_member" "function_permissions" {
  for_each = toset([
    "roles/compute.instanceAdmin.v1",
    "roles/run.admin",
    "roles/container.admin",
    "roles/monitoring.viewer",
    "roles/logging.viewer",
    "roles/pubsub.subscriber"
  ])
  
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.autoheal_function_sa.email}"
}

# Create test VM instance
resource "google_compute_instance" "test_vm" {
  name         = "autoheal-test-vm"
  machine_type = "e2-micro"
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
      size  = 10
    }
  }

  network_interface {
    network = "default"
    access_config {
      // Ephemeral public IP
    }
  }

  metadata_startup_script = file("${path.module}/scripts/startup.sh")

  tags = ["autoheal-monitored"]
  
  labels = {
    environment = "test"
    autoheal    = "enabled"
  }
}

# Create Cloud Run service for testing
resource "google_cloud_run_service" "test_service" {
  name     = "autoheal-test-service"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/cloudrun/hello"
        
        resources {
          limits = {
            cpu    = "1000m"
            memory = "512Mi"
          }
        }
        
        ports {
          container_port = 8080
        }
      }
    }
    
    metadata {
      labels = {
        autoheal = "enabled"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
  
  depends_on = [google_project_service.required_apis]
}

# Make Cloud Run service publicly accessible
resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.test_service.name
  location = google_cloud_run_service.test_service.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Create monitoring alert policy for high CPU
resource "google_monitoring_alert_policy" "high_cpu_alert" {
  display_name = "AutoHeal - High CPU Usage"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "VM Instance - High CPU usage"
    
    condition_threshold {
      filter          = "resource.type=\"gce_instance\" AND resource.labels.instance_name=\"${google_compute_instance.test_vm.name}\""
      duration        = "300s"
      comparison      = "COMPARISON_GREATER_THAN"
      threshold_value = 0.8
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = []

  alert_strategy {
    auto_close = "1800s"
  }

  documentation {
    content = "High CPU usage detected on ${google_compute_instance.test_vm.name}"
  }
}

# Create log-based alert for application errors
resource "google_logging_metric" "error_rate" {
  name   = "autoheal_error_rate"
  filter = "resource.type=\"cloud_run_revision\" AND severity=\"ERROR\""
  
  metric_descriptor {
    metric_kind = "GAUGE"
    value_type  = "INT64"
  }
}

# Create notification channel for Pub/Sub
resource "google_monitoring_notification_channel" "pubsub_channel" {
  display_name = "AutoHeal Pub/Sub Channel"
  type         = "pubsub"
  
  labels = {
    topic = google_pubsub_topic.healing_alerts.id
  }
}

# Update alert policy to use Pub/Sub notification
resource "google_monitoring_alert_policy" "updated_high_cpu_alert" {
  display_name = "AutoHeal - High CPU Usage (Updated)"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "VM Instance - High CPU usage"
    
    condition_threshold {
      filter          = "resource.type=\"gce_instance\" AND resource.labels.instance_name=\"${google_compute_instance.test_vm.name}\""
      duration        = "300s"
      comparison      = "COMPARISON_GREATER_THAN"
      threshold_value = 0.8
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.pubsub_channel.id]

  alert_strategy {
    auto_close = "1800s"
  }

  documentation {
    content = "High CPU usage detected - AutoHeal will attempt recovery"
  }
}
