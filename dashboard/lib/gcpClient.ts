import { Monitoring } from "@google-cloud/monitoring"
import { Logging } from "@google-cloud/logging"
import { PubSub } from "@google-cloud/pubsub"
import { google } from "googleapis"

// Initialize GCP clients
const monitoring = new Monitoring({
  projectId: process.env.GOOGLE_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
})

const logging = new Logging({
  projectId: process.env.GOOGLE_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
})

const pubsub = new PubSub({
  projectId: process.env.GOOGLE_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
})

const compute = google.compute("v1")

export interface MetricData {
  timestamp: string
  value: number
  resource?: string
}

export interface LogEntry {
  timestamp: string
  severity: string
  message: string
  resource: string
  labels?: Record<string, string>
}

export interface ServiceStatus {
  name: string
  type: "gce" | "cloud_run" | "gke"
  status: "healthy" | "warning" | "critical" | "unknown"
  lastCheck: string
  metrics?: {
    cpu?: number
    memory?: number
    uptime?: number
  }
}

export class GCPClient {
  private projectId: string
  private region: string
  private zone: string

  constructor() {
    this.projectId = process.env.GOOGLE_PROJECT_ID || ""
    this.region = process.env.GCP_REGION || "us-central1"
    this.zone = process.env.GCP_ZONE || "us-central1-a"
  }

  /**
   * Get CPU usage metrics for a specific resource
   */
  async getCPUMetrics(resourceName: string, hours = 1): Promise<MetricData[]> {
    try {
      const request = {
        name: `projects/${this.projectId}`,
        filter: `metric.type="compute.googleapis.com/instance/cpu/utilization" AND resource.labels.instance_name="${resourceName}"`,
        interval: {
          endTime: {
            seconds: Math.floor(Date.now() / 1000),
          },
          startTime: {
            seconds: Math.floor(Date.now() / 1000) - hours * 3600,
          },
        },
        aggregation: {
          alignmentPeriod: {
            seconds: 300, // 5 minutes
          },
          perSeriesAligner: "ALIGN_MEAN",
        },
      }

      const [timeSeries] = await monitoring.listTimeSeries(request)

      return timeSeries.flatMap(
        (series) =>
          series.points?.map((point) => ({
            timestamp: point.interval?.endTime?.seconds
              ? new Date(Number.parseInt(point.interval.endTime.seconds) * 1000).toISOString()
              : new Date().toISOString(),
            value: point.value?.doubleValue || 0,
            resource: resourceName,
          })) || [],
      )
    } catch (error) {
      console.error("Error fetching CPU metrics:", error)
      return []
    }
  }

  /**
   * Get memory usage metrics
   */
  async getMemoryMetrics(resourceName: string, hours = 1): Promise<MetricData[]> {
    try {
      const request = {
        name: `projects/${this.projectId}`,
        filter: `metric.type="compute.googleapis.com/instance/memory/utilization" AND resource.labels.instance_name="${resourceName}"`,
        interval: {
          endTime: {
            seconds: Math.floor(Date.now() / 1000),
          },
          startTime: {
            seconds: Math.floor(Date.now() / 1000) - hours * 3600,
          },
        },
        aggregation: {
          alignmentPeriod: {
            seconds: 300,
          },
          perSeriesAligner: "ALIGN_MEAN",
        },
      }

      const [timeSeries] = await monitoring.listTimeSeries(request)

      return timeSeries.flatMap(
        (series) =>
          series.points?.map((point) => ({
            timestamp: point.interval?.endTime?.seconds
              ? new Date(Number.parseInt(point.interval.endTime.seconds) * 1000).toISOString()
              : new Date().toISOString(),
            value: point.value?.doubleValue || 0,
            resource: resourceName,
          })) || [],
      )
    } catch (error) {
      console.error("Error fetching memory metrics:", error)
      return []
    }
  }

  /**
   * Get healing logs from Cloud Logging
   */
  async getHealingLogs(limit = 100, hours = 24): Promise<LogEntry[]> {
    try {
      const filter = `
        resource.type="cloud_function" 
        AND resource.labels.function_name="autoheal-function"
        AND (textPayload:"AutoHeal" OR textPayload:"healing" OR textPayload:"recovery")
        AND timestamp >= "${new Date(Date.now() - hours * 3600 * 1000).toISOString()}"
      `

      const [entries] = await logging.getEntries({
        filter,
        pageSize: limit,
        orderBy: "timestamp desc",
      })

      return entries.map((entry) => ({
        timestamp: entry.metadata.timestamp || new Date().toISOString(),
        severity: entry.metadata.severity || "INFO",
        message: entry.data || "No message",
        resource: entry.metadata.resource?.labels?.function_name || "unknown",
        labels: entry.metadata.labels,
      }))
    } catch (error) {
      console.error("Error fetching healing logs:", error)
      return []
    }
  }

  /**
   * Get service status for all monitored services
   */
  async getServiceStatus(): Promise<ServiceStatus[]> {
    try {
      const services: ServiceStatus[] = []

      // Get GCE instances
      const auth = await google.auth.getClient({
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      })
      google.options({ auth })

      const gceResponse = await compute.instances.list({
        project: this.projectId,
        zone: this.zone,
      })

      if (gceResponse.data.items) {
        for (const instance of gceResponse.data.items) {
          if (instance.labels?.autoheal === "enabled") {
            const cpuMetrics = await this.getCPUMetrics(instance.name || "", 0.5)
            const latestCpu = cpuMetrics.length > 0 ? cpuMetrics[cpuMetrics.length - 1].value : 0

            services.push({
              name: instance.name || "unknown",
              type: "gce",
              status: this.determineHealthStatus(latestCpu, "cpu"),
              lastCheck: new Date().toISOString(),
              metrics: {
                cpu: latestCpu * 100, // Convert to percentage
                uptime: this.calculateUptime(instance.creationTimestamp),
              },
            })
          }
        }
      }

      // Get Cloud Run services
      const run = google.run("v1")
      const runResponse = await run.namespaces.services.list({
        parent: `namespaces/${this.projectId}`,
      })

      if (runResponse.data.items) {
        for (const service of runResponse.data.items) {
          if (service.metadata?.labels?.autoheal === "enabled") {
            services.push({
              name: service.metadata?.name || "unknown",
              type: "cloud_run",
              status: service.status?.conditions?.[0]?.status === "True" ? "healthy" : "warning",
              lastCheck: new Date().toISOString(),
            })
          }
        }
      }

      return services
    } catch (error) {
      console.error("Error fetching service status:", error)
      return []
    }
  }

  /**
   * Send test alert to Pub/Sub
   */
  async sendTestAlert(alertType: string, resourceName: string): Promise<boolean> {
    try {
      const topic = pubsub.topic(process.env.PUBSUB_TOPIC || "autoheal-alerts")

      const testAlert = {
        incident: {
          condition_display_name: `Test Alert - ${alertType}`,
          resource: {
            type: "gce_instance",
            labels: {
              instance_name: resourceName,
            },
          },
        },
        timestamp: new Date().toISOString(),
        test: true,
      }

      await topic.publishMessage({
        data: Buffer.from(JSON.stringify(testAlert)),
      })

      return true
    } catch (error) {
      console.error("Error sending test alert:", error)
      return false
    }
  }

  /**
   * Restart a GCE instance
   */
  async restartInstance(instanceName: string): Promise<boolean> {
    try {
      const auth = await google.auth.getClient({
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      })
      google.options({ auth })

      await compute.instances.reset({
        project: this.projectId,
        zone: this.zone,
        instance: instanceName,
      })

      return true
    } catch (error) {
      console.error("Error restarting instance:", error)
      return false
    }
  }

  private determineHealthStatus(value: number, type: "cpu" | "memory"): ServiceStatus["status"] {
    if (type === "cpu") {
      if (value > 0.9) return "critical"
      if (value > 0.7) return "warning"
      return "healthy"
    }
    if (type === "memory") {
      if (value > 0.85) return "critical"
      if (value > 0.7) return "warning"
      return "healthy"
    }
    return "unknown"
  }

  private calculateUptime(creationTimestamp?: string): number {
    if (!creationTimestamp) return 0
    const created = new Date(creationTimestamp)
    const now = new Date()
    return Math.floor((now.getTime() - created.getTime()) / 1000 / 60 / 60) // hours
  }
}

export const gcpClient = new GCPClient()
