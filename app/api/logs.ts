import type { NextApiRequest, NextApiResponse } from "next"
import { gcpClient } from "@/lib/gcpClient"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { limit = "100", hours = "24" } = req.query

    const limitNum = Number.parseInt(limit as string, 10)
    const hoursNum = Number.parseInt(hours as string, 10)

    const logs = await gcpClient.getHealingLogs(limitNum, hoursNum)

    // Transform logs to match our interface
    const transformedLogs = logs.map((log, index) => ({
      id: `log-${index}-${Date.now()}`,
      timestamp: log.timestamp,
      alertType: extractAlertType(log.message),
      resource: log.resource,
      resourceType: extractResourceType(log.message),
      action: extractAction(log.message),
      status: extractStatus(log.message),
      duration: extractDuration(log.message),
      reason: log.message,
      details: JSON.stringify(log.labels || {}),
    }))

    res.status(200).json({
      success: true,
      data: transformedLogs,
      total: transformedLogs.length,
      timeRange: `${hoursNum}h`,
    })
  } catch (error) {
    console.error("Logs API error:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch logs",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

// Helper functions to extract information from log messages
function extractAlertType(message: string): string {
  if (message.includes("High CPU")) return "High CPU Usage"
  if (message.includes("Memory")) return "Memory Issue"
  if (message.includes("Service Down")) return "Service Down"
  if (message.includes("Error")) return "Error Rate Spike"
  return "Unknown Alert"
}

function extractResourceType(message: string): "gce" | "cloud_run" | "gke" {
  if (message.includes("instance") || message.includes("VM")) return "gce"
  if (message.includes("cloud_run") || message.includes("service")) return "cloud_run"
  if (message.includes("pod") || message.includes("container")) return "gke"
  return "gce"
}

function extractAction(message: string): string {
  if (message.includes("restart")) return "restart"
  if (message.includes("scale")) return "scale"
  if (message.includes("redeploy")) return "redeploy"
  return "alert_only"
}

function extractStatus(message: string): "success" | "failed" | "in_progress" {
  if (message.includes("success") || message.includes("completed")) return "success"
  if (message.includes("failed") || message.includes("error")) return "failed"
  if (message.includes("progress") || message.includes("starting")) return "in_progress"
  return "success"
}

function extractDuration(message: string): number {
  const match = message.match(/(\d+)\s*seconds?/)
  return match ? Number.parseInt(match[1], 10) : 0
}
