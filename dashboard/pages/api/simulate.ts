import type { NextApiRequest, NextApiResponse } from "next"
import { gcpClient } from "@/lib/gcpClient"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { type, alertType, resourceName, failureType, duration } = req.body

    if (!type || !resourceName) {
      return res.status(400).json({
        error: "Type and resourceName are required",
      })
    }

    let result = false

    switch (type) {
      case "alert":
        if (!alertType) {
          return res.status(400).json({ error: "alertType is required for alert simulation" })
        }
        result = await gcpClient.sendTestAlert(alertType, resourceName)
        break

      case "failure":
        if (!failureType) {
          return res.status(400).json({ error: "failureType is required for failure simulation" })
        }
        // For failure simulation, we'll send a test alert and also trigger the actual simulation
        result = await simulateFailure(failureType, resourceName, duration || 300)
        break

      default:
        return res.status(400).json({ error: "Invalid simulation type" })
    }

    res.status(200).json({
      success: result,
      message: result ? `${type} simulation started successfully` : `Failed to start ${type} simulation`,
      details: {
        type,
        alertType,
        failureType,
        resourceName,
        duration,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Simulation API error:", error)
    res.status(500).json({
      success: false,
      error: "Failed to start simulation",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

async function simulateFailure(failureType: string, resourceName: string, duration: number): Promise<boolean> {
  try {
    // Send test alert first
    const alertSent = await gcpClient.sendTestAlert(failureType, resourceName)

    // Here you would trigger the actual failure simulation
    // For now, we'll just simulate by sending the alert
    console.log(`Simulating ${failureType} on ${resourceName} for ${duration} seconds`)

    return alertSent
  } catch (error) {
    console.error("Failure simulation error:", error)
    return false
  }
}
