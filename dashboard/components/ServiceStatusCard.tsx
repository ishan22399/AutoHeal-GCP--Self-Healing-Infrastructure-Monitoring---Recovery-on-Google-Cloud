"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Server,
  Globe,
  Container,
  Activity,
  Cpu,
  MemoryStick,
  Clock,
  RefreshCw,
  Settings,
  type LucideIcon,
} from "lucide-react"
import { formatRelativeTime, formatDuration } from "@/lib/time"
import { cn } from "@/lib/utils"

export interface ServiceStatus {
  name: string
  type: "gce" | "cloud_run" | "gke"
  status: "healthy" | "warning" | "critical" | "unknown"
  lastCheck: string
  uptime?: number // in hours
  metrics?: {
    cpu?: number
    memory?: number
    requests?: number
    errors?: number
  }
  region?: string
  zone?: string
}

interface ServiceStatusCardProps {
  service: ServiceStatus
  onRestart?: (serviceName: string) => void
  onScale?: (serviceName: string) => void
  onViewDetails?: (serviceName: string) => void
  loading?: boolean
}

export function ServiceStatusCard({
  service,
  onRestart,
  onScale,
  onViewDetails,
  loading = false,
}: ServiceStatusCardProps) {
  const getServiceIcon = (): LucideIcon => {
    switch (service.type) {
      case "gce":
        return Server
      case "cloud_run":
        return Globe
      case "gke":
        return Container
      default:
        return Activity
    }
  }

  const getStatusColor = () => {
    switch (service.status) {
      case "healthy":
        return "text-green-600 bg-green-50 border-green-200"
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "critical":
        return "text-red-600 bg-red-50 border-red-200"
      case "unknown":
        return "text-gray-600 bg-gray-50 border-gray-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const getStatusBadgeVariant = () => {
    switch (service.status) {
      case "healthy":
        return "default"
      case "warning":
        return "secondary"
      case "critical":
        return "destructive"
      default:
        return "outline"
    }
  }

  const ServiceIcon = getServiceIcon()

  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md",
        service.status === "critical" && "ring-2 ring-red-200",
        service.status === "warning" && "ring-1 ring-yellow-200",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-base">
            <ServiceIcon className="h-5 w-5" />
            <span className="truncate">{service.name}</span>
          </CardTitle>
          <Badge variant={getStatusBadgeVariant()} className={getStatusColor()}>
            {service.status}
          </Badge>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Badge variant="outline" className="text-xs">
            {service.type.toUpperCase()}
          </Badge>
          {service.region && <span className="text-xs">{service.region}</span>}
          {service.zone && <span className="text-xs">({service.zone})</span>}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Metrics */}
        {service.metrics && (
          <div className="space-y-3">
            {service.metrics.cpu !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-1">
                    <Cpu className="h-3 w-3" />
                    <span>CPU</span>
                  </div>
                  <span className="font-medium">{service.metrics.cpu.toFixed(1)}%</span>
                </div>
                <Progress value={service.metrics.cpu} className="h-1.5" />
              </div>
            )}

            {service.metrics.memory !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-1">
                    <MemoryStick className="h-3 w-3" />
                    <span>Memory</span>
                  </div>
                  <span className="font-medium">{service.metrics.memory.toFixed(1)}%</span>
                </div>
                <Progress value={service.metrics.memory} className="h-1.5" />
              </div>
            )}

            {service.metrics.requests !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span>Requests/min</span>
                <span className="font-medium">{service.metrics.requests}</span>
              </div>
            )}

            {service.metrics.errors !== undefined && service.metrics.errors > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-600">Errors/min</span>
                <span className="font-medium text-red-600">{service.metrics.errors}</span>
              </div>
            )}
          </div>
        )}

        {/* Uptime and Last Check */}
        <div className="space-y-2 text-sm text-gray-600">
          {service.uptime !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>Uptime</span>
              </div>
              <span className="font-medium">{formatDuration(service.uptime * 3600)}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span>Last Check</span>
            <span className="font-medium">{formatRelativeTime(service.lastCheck)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          {onRestart && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRestart(service.name)}
              disabled={loading}
              className="flex-1 text-xs"
            >
              <RefreshCw className={cn("h-3 w-3 mr-1", loading && "animate-spin")} />
              Restart
            </Button>
          )}

          {onScale && service.type !== "gce" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onScale(service.name)}
              disabled={loading}
              className="flex-1 text-xs"
            >
              Scale
            </Button>
          )}

          {onViewDetails && (
            <Button variant="ghost" size="sm" onClick={() => onViewDetails(service.name)} className="px-2">
              <Settings className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
