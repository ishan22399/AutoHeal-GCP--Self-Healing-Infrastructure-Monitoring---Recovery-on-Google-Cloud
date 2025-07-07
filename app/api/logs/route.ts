export async function GET() {
  return Response.json({
    data: [
      {
        id: "log-1",
        timestamp: new Date().toISOString(),
        alertType: "High CPU Usage",
        resource: "autoheal-test-vm",
        resourceType: "gce",
        action: "restart_vm",
        status: "success",
        duration: 45,
        reason: "CPU usage exceeded threshold",
      },
      {
        id: "log-2",
        timestamp: new Date(Date.now() - 3600 * 1000).toISOString(),
        alertType: "Memory Leak",
        resource: "web-server-pod",
        resourceType: "gke",
        action: "restart_pod",
        status: "failed",
        duration: 30,
        reason: "Memory usage exceeded threshold",
        error: "Pod restart failed",
      },
    ],
  })
}
