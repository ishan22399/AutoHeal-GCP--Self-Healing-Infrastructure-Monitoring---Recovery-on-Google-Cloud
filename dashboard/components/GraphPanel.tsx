"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { TrendingUp, TrendingDown, BarChart3, LineChartIcon, Activity } from "lucide-react"
import { formatTimestamp } from "@/lib/time"
import { CHART_COLORS, TIME_RANGES } from "@/lib/constants"
import { cn } from "@/lib/utils"

export interface ChartDataPoint {
  timestamp: string
  value: number
  label?: string
  threshold?: number
}

export interface GraphPanelProps {
  title: string
  data: ChartDataPoint[]
  type?: "line" | "area" | "bar"
  color?: string
  unit?: string
  threshold?: {
    warning?: number
    critical?: number
  }
  timeRange?: keyof typeof TIME_RANGES
  onTimeRangeChange?: (range: keyof typeof TIME_RANGES) => void
  loading?: boolean
  error?: string
  height?: number
  showTrend?: boolean
  className?: string
}

export function GraphPanel({
  title,
  data,
  type = "line",
  color = CHART_COLORS.primary,
  unit = "",
  threshold,
  timeRange = "1h",
  onTimeRangeChange,
  loading = false,
  error,
  height = 300,
  showTrend = true,
  className,
}: GraphPanelProps) {
  const [chartType, setChartType] = useState<"line" | "area" | "bar">(type)

  const formatTooltipValue = (value: number) => {
    return `${value.toFixed(2)}${unit}`
  }

  const formatXAxisLabel = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffHours < 24) {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    }
  }

  const calculateTrend = () => {
    if (data.length < 2) return null

    const recent = data.slice(-5).reduce((sum, point) => sum + point.value, 0) / Math.min(5, data.length)
    const earlier = data.slice(0, 5).reduce((sum, point) => sum + point.value, 0) / Math.min(5, data.length)

    const change = ((recent - earlier) / earlier) * 100
    return {
      direction: change > 0 ? "up" : change < 0 ? "down" : "stable",
      percentage: Math.abs(change).toFixed(1),
    }
  }

  const trend = showTrend ? calculateTrend() : null

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    }

    const xAxisProps = {
      dataKey: "timestamp",
      tickFormatter: formatXAxisLabel,
      tick: { fontSize: 12 },
    }

    const yAxisProps = {
      tick: { fontSize: 12 },
      tickFormatter: (value: number) => `${value}${unit}`,
    }

    const tooltipProps = {
      labelFormatter: (timestamp: string) => formatTimestamp(timestamp),
      formatter: (value: number) => [formatTooltipValue(value), title],
      contentStyle: {
        backgroundColor: "white",
        border: "1px solid #e2e8f0",
        borderRadius: "6px",
        fontSize: "12px",
      },
    }

    switch (chartType) {
      case "area":
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip {...tooltipProps} />
            {threshold?.warning && (
              <ReferenceLine
                y={threshold.warning}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                label={{ value: `Warning: ${threshold.warning}${unit}`, position: "topRight" }}
              />
            )}
            {threshold?.critical && (
              <ReferenceLine
                y={threshold.critical}
                stroke="#ef4444"
                strokeDasharray="5 5"
                label={{ value: `Critical: ${threshold.critical}${unit}`, position: "topRight" }}
              />
            )}
            <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.3} strokeWidth={2} />
          </AreaChart>
        )

      case "bar":
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip {...tooltipProps} />
            {threshold?.warning && <ReferenceLine y={threshold.warning} stroke="#f59e0b" strokeDasharray="5 5" />}
            {threshold?.critical && <ReferenceLine y={threshold.critical} stroke="#ef4444" strokeDasharray="5 5" />}
            <Bar dataKey="value" fill={color} />
          </BarChart>
        )

      default: // line
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip {...tooltipProps} />
            {threshold?.warning && (
              <ReferenceLine
                y={threshold.warning}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                label={{ value: `Warning: ${threshold.warning}${unit}`, position: "topRight" }}
              />
            )}
            {threshold?.critical && (
              <ReferenceLine
                y={threshold.critical}
                stroke="#ef4444"
                strokeDasharray="5 5"
                label={{
                  value: `Critical: ${threshold.critical}
                strokeDasharray="5 5"
                label={{ value: \`Critical: ${threshold.critical}${unit}`,
                  position: "topRight",
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, stroke: color, strokeWidth: 2 }}
            />
          </LineChart>
        )
    }
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-red-600">Error Loading {title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">{error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>{title}</span>
            </CardTitle>
            {trend && (
              <div className="flex items-center space-x-1">
                {trend.direction === "up" && <TrendingUp className="h-4 w-4 text-red-500" />}
                {trend.direction === "down" && <TrendingDown className="h-4 w-4 text-green-500" />}
                {trend.direction === "stable" && <div className="h-4 w-4" />}
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    trend.direction === "up" && "text-red-600",
                    trend.direction === "down" && "text-green-600",
                  )}
                >
                  {trend.percentage}%
                </Badge>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Chart Type Selector */}
            <div className="flex items-center space-x-1 border rounded-md p-1">
              <Button
                variant={chartType === "line" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType("line")}
                className="h-6 w-6 p-0"
              >
                <LineChartIcon className="h-3 w-3" />
              </Button>
              <Button
                variant={chartType === "area" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType("area")}
                className="h-6 w-6 p-0"
              >
                <Activity className="h-3 w-3" />
              </Button>
              <Button
                variant={chartType === "bar" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType("bar")}
                className="h-6 w-6 p-0"
              >
                <BarChart3 className="h-3 w-3" />
              </Button>
            </div>

            {/* Time Range Selector */}
            {onTimeRangeChange && (
              <Select value={timeRange} onValueChange={onTimeRangeChange}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIME_RANGES).map(([key, range]) => (
                    <SelectItem key={key} value={key}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center" style={{ height }}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center text-gray-500" style={{ height }}>
            No data available for the selected time range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            {renderChart()}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
