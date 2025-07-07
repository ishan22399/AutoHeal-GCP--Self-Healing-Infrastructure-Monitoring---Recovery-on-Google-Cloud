import { apiClient } from "./fetcher"

export interface TestAlertOptions {
  alertType: "high_cpu" | "memory_leak" | "service_down" | "error_spike"
  resourceName: string
  resourceType: "gce_instance" | "cloud_run_revision" | "gke_pod"
  severity?: "low" | "medium" | "high" | "critical"
  duration?: number // in seconds
}

export const sendTestAlert = async (options: TestAlertOptions): Promise<boolean> => {
  try {
    const response = await apiClient.post("/simulate", {
      type: "alert",
      ...options,
    })

    return response.data.success
  } catch (error) {
    console.error("Error sending test alert:", error)
    return false
  }
}

export const simulateFailure = async (
  failureType: "cpu_spike" | "memory_leak" | "error_storm",
  resourceName: string,
  duration = 300,
): Promise<boolean> => {
  try {
    const response = await apiClient.post("/simulate", {
      type: "failure",
      failureType,
      resourceName,
      duration,
    })

    return response.data.success
  } catch (error) {
    console.error("Error simulating failure:", error)
    return false
  }
}

export const triggerManualHealing = async (
  action: "restart_vm" | "restart_service" | "scale_service",
  resourceName: string,
  options?: Record<string, any>,
): Promise<boolean> => {
  try {
    const response = await apiClient.post("/controls", {
      action,
      resourceName,
      options,
    })

    return response.data.success
  } catch (error) {
    console.error("Error triggering manual healing:", error)
    return false
  }
}
