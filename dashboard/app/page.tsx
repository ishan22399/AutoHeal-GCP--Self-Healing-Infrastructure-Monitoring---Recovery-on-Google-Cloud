"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Cpu,
  Database,
  Globe,
  Heart,
  MemoryStick,
  RefreshCw,
  Server,
  Zap,
} from "lucide-react"

interface SystemMetric {
  name: string
  value: number
  unit: string
  status: "healthy" | "warning" | "critical"
  trend: "up" | "down" | "stable"
}

interface HealingAction {
  id: string
  timestamp: string
  alertType: string
  resource: string
  action: string
  status: "success" | "failed" | "in_progress"
  duration: number
}

interface AlertItem {
  id: string
  timestamp: string
  severity: "low" | "medium" | "high" | "critical"
  message: string
  resource: string
  status: "active" | "resolved" | "acknowledged"
}

export default function AutoHealDashboard() {
  const [metrics, setMetrics] = useState<SystemMetric[]>([
    { name: "CPU Usage", value: 45, unit: "%", status: "healthy", trend: "stable" },
    { name: "Memory Usage", value: 67, unit: "%", status: "warning", trend: "up" },
    { name: "Disk Usage", value: 23, unit: "%", status: "healthy", trend: "down" },
    { name: "Network I/O", value: 156, unit: "MB/s", status: "healthy", trend: "stable" },
  ])

  const [healingActions, setHealingActions] = useState<HealingAction[]>([
    {
      id: "1",
      timestamp: "2024-01-15T10:30:00Z",
      alertType: "High CPU Usage",
      resource: "autoheal-test-vm",
      action: "VM Restart",
      status: "success",
      duration: 45,
    },
    {
      id: "2",
      timestamp: "2024-01-15T09:15:00Z",
      alertType: "Service Down",
      resource: "autoheal-test-service",
      action: "Container Restart",
      status: "success",
      duration: 12,
    },
    {
      id: "3",
      timestamp: "2024-01-15T08:45:00Z",
      alertType: "Memory Leak",
      resource: "web-server-pod",
      action: "Pod Restart",
      status: "in_progress",
      duration: 0,
    },
  ])

  const [alerts, setAlerts] = useState<AlertItem[]>([
    {
      id: "1",
      timestamp: "2024-01-15T10:35:00Z",
      severity: "high",
      message: "CPU usage exceeded 90% for 5 minutes",
      resource: "autoheal-test-vm",
      status: "resolved",
    },
    {
      id: "2",
      timestamp: "2024-01-15T10:20:00Z",
      severity: "critical",
      message: "Service health check failed",
      resource: "autoheal-test-service",
      status: "resolved",
    },
    {
      id: "3",
      timestamp: "2024-01-15T08:45:00Z",
      severity: "medium",
      message: "Memory usage trending upward",
      resource: "web-server-pod",
      status: "active",
    },
  ])

  const [isRefreshing, setIsRefreshing] = useState(false)

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) =>
        prev.map((metric) => ({
          ...metric,
          value: Math.max(0, Math.min(100, metric.value + (Math.random() - 0.5) * 10)),
          status: metric.value > 80 ? "critical" : metric.value > 60 ? "warning" : "healthy",
        })),
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600"
      case "warning":
        return "text-yellow-600"
      case "critical":
        return "text-red-600"
      case "success":
        return "text-green-600"
      case "failed":
        return "text-red-600"
      case "in_progress":
        return "text-blue-600"
      default:
        return "text-gray-600"
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "healthy":
      case "success":
      case "resolved":
        return "default"
      case "warning":
      case "medium":
        return "secondary"
      case "critical":
      case "failed":
      case "high":
        return "destructive"
      case "in_progress":
      case "active":
        return "outline"
      default:
        return "secondary"
    }
  }

  const totalActions = healingActions.length
  const successfulActions = healingActions.filter((a) => a.status === "success").length
  const successRate = totalActions > 0 ? (successfulActions / totalActions) * 100 : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Heart className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AutoHeal-GCP</h1>
              <p className="text-gray-600">Self-Healing Infrastructure Dashboard</p>
            </div>
          </div>
          <Button onClick={handleRefresh} disabled={isRefreshing} className="flex items-center space-x-2">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>

        {/* System Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                {metric.name === "CPU Usage" && <Cpu className="h-4 w-4 text-muted-foreground" />}
                {metric.name === "Memory Usage" && <MemoryStick className="h-4 w-4 text-muted-foreground" />}
                {metric.name === "Disk Usage" && <Database className="h-4 w-4 text-muted-foreground" />}
                {metric.name === "Network I/O" && <Globe className="h-4 w-4 text-muted-foreground" />}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metric.value.toFixed(1)}
                  {metric.unit}
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Progress value={metric.value} className="flex-1" />
                  <Badge variant={getStatusBadgeVariant(metric.status)}>{metric.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Success Rate Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Healing Success Rate</span>
            </CardTitle>
            <CardDescription>Overall success rate of automated healing actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600 mb-2">{successRate.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">
              {successfulActions} successful out of {totalActions} total actions
            </div>
            <Progress value={successRate} className="mt-4" />
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="actions" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="actions">Healing Actions</TabsTrigger>
            <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>

          <TabsContent value="actions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Recent Healing Actions</span>
                </CardTitle>
                <CardDescription>Automated recovery actions performed by the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {healingActions.map((action) => (
                    <div key={action.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div
                          className={`p-2 rounded-full ${
                            action.status === "success"
                              ? "bg-green-100"
                              : action.status === "failed"
                                ? "bg-red-100"
                                : "bg-blue-100"
                          }`}
                        >
                          {action.status === "success" && <CheckCircle className="h-4 w-4 text-green-600" />}
                          {action.status === "failed" && <AlertTriangle className="h-4 w-4 text-red-600" />}
                          {action.status === "in_progress" && (
                            <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{action.alertType}</div>
                          <div className="text-sm text-gray-600">
                            {action.resource} • {action.action}
                          </div>
                          <div className="text-xs text-gray-500">{new Date(action.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={getStatusBadgeVariant(action.status)}>{action.status.replace("_", " ")}</Badge>
                        {action.duration > 0 && <div className="text-xs text-gray-500 mt-1">{action.duration}s</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>System Alerts</span>
                </CardTitle>
                <CardDescription>Current and recent system alerts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <Alert
                      key={alert.id}
                      className={
                        alert.severity === "critical"
                          ? "border-red-200 bg-red-50"
                          : alert.severity === "high"
                            ? "border-orange-200 bg-orange-50"
                            : alert.severity === "medium"
                              ? "border-yellow-200 bg-yellow-50"
                              : "border-blue-200 bg-blue-50"
                      }
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle className="flex items-center justify-between">
                        <span>{alert.message}</span>
                        <Badge variant={getStatusBadgeVariant(alert.status)}>{alert.status}</Badge>
                      </AlertTitle>
                      <AlertDescription>
                        <div className="flex items-center justify-between mt-2">
                          <span>Resource: {alert.resource}</span>
                          <span className="text-xs text-gray-500">{new Date(alert.timestamp).toLocaleString()}</span>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Server className="h-5 w-5" />
                    <span>Compute Instances</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>autoheal-test-vm</span>
                      <Badge variant="default">Running</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>web-server-01</span>
                      <Badge variant="default">Running</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>api-server-01</span>
                      <Badge variant="secondary">Stopped</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Globe className="h-5 w-5" />
                    <span>Cloud Run Services</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>autoheal-test-service</span>
                      <Badge variant="default">Healthy</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>api-gateway</span>
                      <Badge variant="default">Healthy</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>worker-service</span>
                      <Badge variant="destructive">Error</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Monitoring Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Cloud Monitoring</span>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Pub/Sub Topic</span>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Healing Function</span>
                      <Badge variant="default">Active</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
