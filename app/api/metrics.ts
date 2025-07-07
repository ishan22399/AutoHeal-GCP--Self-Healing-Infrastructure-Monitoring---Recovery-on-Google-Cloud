import type { NextApiRequest, NextApiResponse } from "next"
import { gcpClient } from "@/lib/gcpClient"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { resource, type, hours = "1" } = req.query

    if (!resource || !type) {
      return res.status(400).json({ error: "Resource and type parameters are required" })
    }

    const hoursNum = Number.parseInt(hours as string, 10)
    let metrics = []

    switch (type) {
      case "cpu":
        metrics = await gcpClient.getCPUMetrics(resource as string, hoursNum)
        break
      case "memory":
        metrics = await gcpClient.getMemoryMetrics(resource as string, hoursNum)
        break
      default:
        return res.status(400).json({ error: "Invalid metric type" })
    }

    res.status(200).json({
      success: true,
      data: metrics,
      resource,
      type,
      timeRange: `${hoursNum}h`,
    })
  } catch (error) {
    console.error("Metrics API error:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch metrics",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
