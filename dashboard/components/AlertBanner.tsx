"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, X, Bell, Clock } from "lucide-react"
import { formatRelativeTime } from "../lib/time"
import { cn } from "@/lib/utils"

export interface AlertData {
  id: string
  severity: "low" | "medium" | "high" | "critical"
  title: string
  message: string
  resource: string
  timestamp: string
  acknowledged?: boolean
  autoHealTriggered?: boolean
}

interface AlertBannerProps {
  alerts: AlertData[]
  onAcknowledge?: (alertId: string) => void
  onDismiss?: (alertId: string) => void
  maxVisible?: number
  autoHide?: boolean
  autoHideDelay?: number
}

export function AlertBanner({
  alerts,
  onAcknowledge,
  onDismiss,
  maxVisible = 3,
  autoHide = false,
  autoHideDelay = 10000,
}: AlertBannerProps) {
  const [visibleAlerts, setVisibleAlerts] = useState<AlertData[]>([])
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  useEffect(() => {
    const activeAlerts = alerts
      .filter((alert) => !alert.acknowledged && !dismissedAlerts.has(alert.id))
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        return severityOrder[b.severity] - severityOrder[a.severity]
      })
      .slice(0, maxVisible)

    setVisibleAlerts(activeAlerts)
  }, [alerts, dismissedAlerts, maxVisible])

  useEffect(() => {
    if (autoHide && visibleAlerts.length > 0) {
      const timer = setTimeout(() => {
        visibleAlerts.forEach((alert) => {
          handleDismiss(alert.id)
        })
      }, autoHideDelay)

      return () => clearTimeout(timer)
    }
  }, [visibleAlerts, autoHide, autoHideDelay])

  const handleAcknowledge = (alertId: string) => {
    onAcknowledge?.(alertId)
  }

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts((prev) => new Set([...prev, alertId]))
    onDismiss?.(alertId)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-red-500 bg-red-50 text-red-800"
      case "high":
        return "border-orange-500 bg-orange-50 text-orange-800"
      case "medium":
        return "border-yellow-500 bg-yellow-50 text-yellow-800"
      case "low":
        return "border-blue-500 bg-blue-50 text-blue-800"
      default:
        return "border-gray-500 bg-gray-50 text-gray-800"
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
      case "high":
        return <AlertTriangle className="h-4 w-4" />
      case "medium":
        return <Bell className="h-4 w-4" />
      case "low":
        return <Clock className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  if (visibleAlerts.length === 0) {
    return null
  }

  return (
    <div className="space-y-2 mb-6">
      {visibleAlerts.map((alert) => (
        <Alert
          key={alert.id}
          className={cn("relative border-l-4 shadow-sm transition-all duration-300", getSeverityColor(alert.severity))}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              {getSeverityIcon(alert.severity)}
              <div className="flex-1 min-w-0">
                <AlertTitle className="flex items-center space-x-2 mb-1">
                  <span className="font-semibold">{alert.title}</span>
                  <Badge variant="outline" className={cn("text-xs", getSeverityColor(alert.severity))}>
                    {alert.severity.toUpperCase()}
                  </Badge>
                  {alert.autoHealTriggered && (
                    <Badge variant="secondary" className="text-xs">
                      Auto-Heal Triggered
                    </Badge>
                  )}
                </AlertTitle>
                <AlertDescription className="text-sm">
                  <div className="mb-2">{alert.message}</div>
                  <div className="flex items-center space-x-4 text-xs opacity-75">
                    <span>
                      Resource: <strong>{alert.resource}</strong>
                    </span>
                    <span>{formatRelativeTime(alert.timestamp)}</span>
                  </div>
                </AlertDescription>
              </div>
            </div>

            <div className="flex items-center space-x-2 ml-4">
              {onAcknowledge && (
                <Button variant="outline" size="sm" onClick={() => handleAcknowledge(alert.id)} className="text-xs">
                  Acknowledge
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismiss(alert.id)}
                className="h-6 w-6 p-0 hover:bg-black/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Alert>
      ))}

      {alerts.length > maxVisible && (
        <div className="text-center">
          <Button variant="outline" size="sm" className="text-xs bg-transparent">
            View {alerts.length - maxVisible} more alerts
          </Button>
        </div>
      )}
    </div>
  )
}
