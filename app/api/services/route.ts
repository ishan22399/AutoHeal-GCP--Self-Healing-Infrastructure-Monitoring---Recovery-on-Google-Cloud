export async function GET() {
  return Response.json({
    data: [
      {
        name: "autoheal-test-vm",
        type: "gce",
        status: "warning",
        lastCheck: new Date().toISOString(),
        uptime: 72,
        metrics: { cpu: 89.5, memory: 67.8 },
        region: "us-central1",
        zone: "us-central1-a",
      },
      {
        name: "autoheal-test-service",
        type: "cloud_run",
        status: "healthy",
        lastCheck: new Date().toISOString(),
        uptime: 168,
        metrics: { cpu: 23.1, memory: 45.2, requests: 1250, errors: 0 },
        region: "us-central1",
      },
      {
        name: "web-server-pod",
        type: "gke",
        status: "critical",
        lastCheck: new Date().toISOString(),
        uptime: 12,
        metrics: { cpu: 95.2, memory: 87.3, requests: 890, errors: 15 },
        region: "us-central1",
      },
    ],
  })
}
