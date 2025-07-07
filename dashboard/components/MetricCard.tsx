"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: number
  unit: string
  icon: LucideIcon
  status: "healthy" | "warning" | "critical"
  trend?: "up" | "down" | "stable"
  previousValue?: number
  threshold?: {
    warning: number
    critical: number
  }
  className?: string
}

export function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  status,
  trend = "stable",
  previousValue,
  threshold,
  className,
}: MetricCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case "healthy":
        return "text-green-600 bg-green-50 border-green-200"
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "critical":
        return "text-red-600 bg-red-50 border-red-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-red-500" />
      case "down":
        return <TrendingDown className="h-4 w-4 text-green-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getProgressValue = () => {
    if (threshold) {
      return Math.min((value / threshold.critical) * 100, 100)
    }
    return value
  }

  const getProgressColor = () => {
    if (threshold) {
      if (value >= threshold.critical) return "bg-red-500"
      if (value >= threshold.warning) return "bg-yellow-500"
      return "bg-green-500"
    }
    return "bg-blue-500"
  }

  const calculateChange = () => {
    if (previousValue === undefined) return null
    const change = ((value - previousValue) / previousValue) * 100
    return change.toFixed(1)
  }

  const change = calculateChange()

  return (
    <Card className={cn("transition-all duration-200 hover:shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{label}</CardTitle>
        <div className="flex items-center space-x-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <Badge variant="outline" className={getStatusColor()}>
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-3">
          <div className="text-2xl font-bold">
            {typeof value === "number" ? value.toFixed(1) : value}
            <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>
          </div>
          <div className="flex items-center space-x-1">
            {getTrendIcon()}
            {change && (
              <span
                className={cn(
                  "text-xs font-medium",
                  trend === "up" ? "text-red-500" : trend === "down" ? "text-green-500" : "text-gray-500",
                )}
              >
                {change}%
              </span>
            )}
          </div>
        </div>

        {threshold && (
          <div className="space-y-2">
            <Progress
              value={getProgressValue()}
              className="h-2"
              // Custom progress color would need to be implemented in the Progress component
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0</span>
              <span className="text-yellow-600">
                Warning: {threshold.warning}
                {unit}
              </span>
              <span className="text-red-600">
                Critical: {threshold.critical}
                {unit}
              </span>
            </div>
          </div>
        )}

        {!threshold && <Progress value={Math.min(value, 100)} className="h-2" />}
      </CardContent>
    </Card>
  )
}
