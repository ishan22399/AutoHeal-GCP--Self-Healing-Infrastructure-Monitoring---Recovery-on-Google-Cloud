"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Sidebar } from "@/components/Sidebar"
import { MetricCard } from "@/components/MetricCard"
import { HealLogTable, type HealingLog } from "@/components/HealLogTable"
import { AlertBanner, type AlertData } from "@/components/AlertBanner"
import { ServiceStatusCard, type ServiceStatus } from "@/components/ServiceStatusCard"
import { GraphPanel } from "@/components/GraphPanel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { fetcher } from "@/lib/fetcher"
import { MONITORING_THRESHOLDS, REFRESH_INTERVALS } from "@/lib/constants"
import { Cpu, MemoryStick, HardDrive, Network, RefreshCw, TrendingUp, CheckCircle } from "lucide-react"

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState<"1h" | "6h" | "24h">("1h")
  const [refreshInterval, setRefreshInterval] = useState(REFRESH_INTERVALS.NORMAL)

  // Fetch system metrics
  const {
    data: cpuData,
    error: cpuError,
    mutate: mutateCpu,
  } = useSWR(`/api/metrics?resource=autoheal-test-vm&type=cpu&hours=${timeRange.replace("h", "")}`, fetcher, {
    refreshInterval,
  })

  const {
    data: memoryData,
    error: memoryError,
    mutate: mutateMemory,
  } = useSWR(`/api/metrics?resource=autoheal-test-vm&type=memory&hours=${timeRange.replace("h", "")}`, fetcher, {
    refreshInterval,
  })

  // Fetch healing logs
  const {
    data: logsData,
    error: logsError,
    mutate: mutateLogs,
  } = useSWR("/api/logs?limit=50&hours=24", fetcher, { refreshInterval })

  // Mock data for demonstration (replace with real API calls)
  const [currentMetrics, setCurrentMetrics] = useState({
    cpu: 45.2,
    memory: 67.8,
    disk: 23.1,
    network: 156.7,
  })

  const [alerts, setAlerts] = useState<AlertData[]>([
    {
      id: "alert-1",
      severity: "high",
      title: "High CPU Usage Detected",
      message: "CPU usage has exceeded 90% for the past 5 minutes on autoheal-test-vm",
      resource: "autoheal-test-vm",
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      autoHealTriggered: true,
    },
  ])

  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: "autoheal-test-vm",
      type: "gce",
      status: "warning",
      lastCheck: new Date().toISOString(),
      uptime: 72,
      metrics: {
        cpu: 89.5,
        memory: 67.8,
      },
      region: "us-central1",
      zone: "us-central1-a",
    },
    {
      name: "autoheal-test-service",
      type: "cloud_run",
      status: "healthy",
      lastCheck: new Date().toISOString(),
      uptime: 168,
      metrics: {
        cpu: 23.1,
        memory: 45.2,
        requests: 1250,
        errors: 0,
      },
      region: "us-central1",
    },
    {
      name: "web-server-pod",
      type: "gke",
      status: "critical",
      lastCheck: new Date().toISOString(),
      uptime: 12,
      metrics: {
        cpu: 95.2,
        memory: 87.3,
        requests: 890,
        errors: 15,
      },
      region: "us-central1",
    },
  ])

  // Simulate real-time metric updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMetrics((prev) => ({
        cpu: Math.max(0, Math.min(100, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(0, Math.min(100, prev.memory + (Math.random() - 0.5) * 5)),
        disk: Math.max(0, Math.min(100, prev.disk + (Math.random() - 0.5) * 2)),
        network: Math.max(0, prev.network + (Math.random() - 0.5) * 50),
      }))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const handleRefreshAll = () => {
    mutateCpu()
    mutateMemory()
    mutateLogs()
  }

  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts((prev) => prev.map((alert) => (alert.id === alertId ? { ...alert, acknowledged: true } : alert)))
  }

  const handleDismissAlert = (alertId: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId))
  }

  const handleServiceAction = async (action: string, serviceName: string) => {
    console.log(`${action} ${serviceName}`)
    // Implement service actions
    return true
  }

  const healingLogs: HealingLog[] = logsData?.data || []
  const successRate =
    healingLogs.length > 0
      ? (healingLogs.filter((log) => log.status === "success").length / healingLogs.length) * 100
      : 0

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar alertCount={alerts.length} activeIncidents={services.filter((s) => s.status === "critical").length} />

      <main className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">System Dashboard</h1>
              <p className="text-gray-600">Real-time monitoring and healing status</p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="bg-green-50 text-green-700">
                <CheckCircle className="h-3 w-3 mr-1" />
                AutoHeal Active
              </Badge>
              <Button onClick={handleRefreshAll} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Alert Banner */}
          <AlertBanner alerts={alerts} onAcknowledge={handleAcknowledgeAlert} onDismiss={handleDismissAlert} />

          {/* System Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              label="CPU Usage"
              value={currentMetrics.cpu}
              unit="%"
              icon={Cpu}
              status={
                currentMetrics.cpu > MONITORING_THRESHOLDS.CPU.CRITICAL
                  ? "critical"
                  : currentMetrics.cpu > MONITORING_THRESHOLDS.CPU.WARNING
                    ? "warning"
                    : "healthy"
              }
              threshold={{
                warning: MONITORING_THRESHOLDS.CPU.WARNING,
                critical: MONITORING_THRESHOLDS.CPU.CRITICAL,
              }}
              trend="up"
            />
            <MetricCard
              label="Memory Usage"
              value={currentMetrics.memory}
              unit="%"
              icon={MemoryStick}
              status={
                currentMetrics.memory > MONITORING_THRESHOLDS.MEMORY.CRITICAL
                  ? "critical"
                  : currentMetrics.memory > MONITORING_THRESHOLDS.MEMORY.WARNING
                    ? "warning"
                    : "healthy"
              }
              threshold={{
                warning: MONITORING_THRESHOLDS.MEMORY.WARNING,
                critical: MONITORING_THRESHOLDS.MEMORY.CRITICAL,
              }}
              trend="stable"
            />
            <MetricCard
              label="Disk Usage"
              value={currentMetrics.disk}
              unit="%"
              icon={HardDrive}
              status={
                currentMetrics.disk > MONITORING_THRESHOLDS.DISK.CRITICAL
                  ? "critical"
                  : currentMetrics.disk > MONITORING_THRESHOLDS.DISK.WARNING
                    ? "warning"
                    : "healthy"
              }
              threshold={{
                warning: MONITORING_THRESHOLDS.DISK.WARNING,
                critical: MONITORING_THRESHOLDS.DISK.CRITICAL,
              }}
              trend="down"
            />
            <MetricCard
              label="Network I/O"
              value={currentMetrics.network}
              unit=" MB/s"
              icon={Network}
              status="healthy"
              trend="stable"
            />
          </div>

          {/* Success Rate Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span>Healing Success Rate</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-6">
                <div>
                  <div className="text-4xl font-bold text-green-600">{successRate.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">
                    {healingLogs.filter((l) => l.status === "success").length} successful out of {healingLogs.length}{" "}
                    total actions
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-semibold text-green-600">
                      {healingLogs.filter((l) => l.status === "success").length}
                    </div>
                    <div className="text-xs text-gray-500">Successful</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-red-600">
                      {healingLogs.filter((l) => l.status === "failed").length}
                    </div>
                    <div className="text-xs text-gray-500">Failed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-blue-600">
                      {healingLogs.filter((l) => l.status === "in_progress").length}
                    </div>
                    <div className="text-xs text-gray-500">In Progress</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GraphPanel
              title="CPU Usage"
              data={cpuData?.data || []}
              type="area"
              unit="%"
              threshold={{
                warning: MONITORING_THRESHOLDS.CPU.WARNING,
                critical: MONITORING_THRESHOLDS.CPU.CRITICAL,
              }}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              loading={!cpuData && !cpuError}
              error={cpuError?.message}
            />
            <GraphPanel
              title="Memory Usage"
              data={memoryData?.data || []}
              type="line"
              unit="%"
              threshold={{
                warning: MONITORING_THRESHOLDS.MEMORY.WARNING,
                critical: MONITORING_THRESHOLDS.MEMORY.CRITICAL,
              }}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              loading={!memoryData && !memoryError}
              error={memoryError?.message}
            />
          </div>

          {/* Service Status */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => (
                <ServiceStatusCard
                  key={service.name}
                  service={service}
                  onRestart={(name) => handleServiceAction("restart", name)}
                  onScale={(name) => handleServiceAction("scale", name)}
                  onViewDetails={(name) => console.log("View details:", name)}
                />
              ))}
            </div>
          </div>

          {/* Recent Healing Actions */}
          <HealLogTable logs={healingLogs.slice(0, 10)} loading={!logsData && !logsError} onRefresh={mutateLogs} />
        </div>
      </main>
    </div>
  )
}
