import { NextRequest } from "next/server"
import { gcpClient } from "@/lib/gcpClient"

export async function GET(req: NextRequest) {
  // Optionally filter by ?active=true
  const url = new URL(req.url)
  const active = url.searchParams.get("active")

  // Fetch real alerts from GCP Monitoring or Logging via your gcpClient
  // This assumes gcpClient.getActiveAlerts() returns an array of alert objects
  try {
    let alerts = await gcpClient.getActiveAlerts?.()
    if (!alerts) alerts = []

    // Optionally filter for only active alerts
    if (active === "true") {
      alerts = alerts.filter((a: any) => a.status === "active" || a.status === "open")
    }

    return Response.json({ data: alerts })
  } catch (error) {
    console.error("Error fetching alerts:", error)
    return Response.json({ error: "Failed to fetch alerts" }, { status: 500 })
  }
}
