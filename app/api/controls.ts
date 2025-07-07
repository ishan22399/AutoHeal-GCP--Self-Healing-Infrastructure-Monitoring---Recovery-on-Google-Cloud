import type { NextApiRequest, NextApiResponse } from "next"
import { gcpClient } from "@/lib/gcpClient"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { action, resourceName, options = {} } = req.body

    if (!action || !resourceName) {
      return res.status(400).json({
        error: "Action and resourceName are required",
      })
    }

    let result = false
    let message = ""

    switch (action) {
      case "restart_vm":
        result = await gcpClient.restartInstance(resourceName)
        message = result ? `VM ${resourceName} restart initiated` : `Failed to restart VM ${resourceName}`
        break

      case "restart_service":
        // Implement Cloud Run service restart
        result = await restartCloudRunService(resourceName)
        message = result ? `Service ${resourceName} restart initiated` : `Failed to restart service ${resourceName}`
        break

      case "scale_service":
        // Implement service scaling
        const { instances = 2 } = options
        result = await scaleService(resourceName, instances)
        message = result
          ? `Service ${resourceName} scaled to ${instances} instances`
          : `Failed to scale service ${resourceName}`
        break

      default:
        return res.status(400).json({ error: "Invalid action" })
    }

    res.status(200).json({
      success: result,
      message,
      details: {
        action,
        resourceName,
        options,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Controls API error:", error)
    res.status(500).json({
      success: false,
      error: "Failed to execute control action",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

async function restartCloudRunService(serviceName: string): Promise<boolean> {
  try {
    // Implement Cloud Run service restart logic
    console.log(`Restarting Cloud Run service: ${serviceName}`)
    // This would involve updating the service to trigger a new revision
    return true
  } catch (error) {
    console.error("Cloud Run restart error:", error)
    return false
  }
}

async function scaleService(serviceName: string, instances: number): Promise<boolean> {
  try {
    // Implement service scaling logic
    console.log(`Scaling service ${serviceName} to ${instances} instances`)
    // This would involve updating the service configuration
    return true
  } catch (error) {
    console.error("Service scaling error:", error)
    return false
  }
}
