import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type")
  // Return mock data for cpu/memory
  if (type === "cpu") {
    return Response.json({
      current: 45.2,
      data: [
        { timestamp: new Date(Date.now() - 3600 * 1000).toISOString(), value: 40 },
        { timestamp: new Date(Date.now() - 1800 * 1000).toISOString(), value: 50 },
        { timestamp: new Date().toISOString(), value: 45.2 },
      ],
    })
  }
  if (type === "memory") {
    return Response.json({
      current: 67.8,
      data: [
        { timestamp: new Date(Date.now() - 3600 * 1000).toISOString(), value: 60 },
        { timestamp: new Date(Date.now() - 1800 * 1000).toISOString(), value: 70 },
        { timestamp: new Date().toISOString(), value: 67.8 },
      ],
    })
  }
  return Response.json({ error: "Unknown metric type" }, { status: 400 })
}
