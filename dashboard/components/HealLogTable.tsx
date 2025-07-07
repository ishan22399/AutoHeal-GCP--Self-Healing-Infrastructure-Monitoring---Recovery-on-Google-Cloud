"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Download, Filter, RefreshCw, CheckCircle, AlertTriangle, Clock } from "lucide-react"
import { formatTimestamp, formatRelativeTime, formatDuration } from "../../dashboard/lib/time"
import { cn } from "@/lib/utils"

export interface HealingLog {
  id: string
  timestamp: string
  alertType: string
  resource: string
  resourceType: "gce" | "cloud_run" | "gke"
  action: string
  status: "success" | "failed" | "in_progress"
  duration: number
  reason?: string
  details?: string
  error?: string
}

interface HealLogTableProps {
  logs: HealingLog[]
  loading?: boolean
  onRefresh?: () => void
  onExport?: (format: "csv" | "pdf") => void
}

export function HealLogTable({ logs, loading = false, onRefresh, onExport }: HealLogTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>("all")

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.alertType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === "all" || log.status === statusFilter
      const matchesAction = actionFilter === "all" || log.action === actionFilter
      const matchesResourceType = resourceTypeFilter === "all" || log.resourceType === resourceTypeFilter

      return matchesSearch && matchesStatus && matchesAction && matchesResourceType
    })
  }, [logs, searchTerm, statusFilter, actionFilter, resourceTypeFilter])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "failed":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-600 animate-pulse" />
      default:
        return null
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "success":
        return "default"
      case "failed":
        return "destructive"
      case "in_progress":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getResourceTypeColor = (type: string) => {
    switch (type) {
      case "gce":
        return "bg-blue-100 text-blue-800"
      case "cloud_run":
        return "bg-green-100 text-green-800"
      case "gke":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const uniqueActions = [...new Set(logs.map((log) => log.action))]
  const uniqueResourceTypes = [...new Set(logs.map((log) => log.resourceType))]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <RefreshCw className={cn("h-5 w-5", loading && "animate-spin")} />
            <span>Healing Action Logs</span>
            <Badge variant="outline">{filteredLogs.length}</Badge>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Refresh
              </Button>
            )}
            {onExport && (
              <Select onValueChange={(value) => onExport(value as "csv" | "pdf")}>
                <SelectTrigger className="w-32">
                  <Download className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Export" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">Export CSV</SelectItem>
                  <SelectItem value="pdf">Export PDF</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
            </SelectContent>
          </Select>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {uniqueActions.map((action) => (
                <SelectItem key={action} value={action}>
                  {action.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Resource" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              {uniqueResourceTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Alert Type</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    {loading ? "Loading logs..." : "No healing logs found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{formatTimestamp(log.timestamp)}</div>
                        <div className="text-xs text-gray-500">{formatRelativeTime(log.timestamp)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{log.alertType}</div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{log.resource}</div>
                        <Badge variant="outline" className={cn("text-xs", getResourceTypeColor(log.resourceType))}>
                          {log.resourceType.toUpperCase()}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {log.action.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(log.status)}
                        <Badge variant={getStatusBadgeVariant(log.status)}>{log.status.replace("_", " ")}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>{log.duration > 0 ? formatDuration(log.duration) : "-"}</TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        {log.error && <div className="text-red-600 text-sm font-medium mb-1">Error: {log.error}</div>}
                        {log.reason && <div className="text-gray-600 text-sm">{log.reason}</div>}
                        {log.details && <div className="text-gray-500 text-xs mt-1 truncate">{log.details}</div>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        {filteredLogs.length > 0 && (
          <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
            <div>
              Showing {filteredLogs.length} of {logs.length} logs
            </div>
            <div className="flex space-x-4">
              <span className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                {filteredLogs.filter((l) => l.status === "success").length} successful
              </span>
              <span className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-red-600 mr-1" />
                {filteredLogs.filter((l) => l.status === "failed").length} failed
              </span>
              <span className="flex items-center">
                <Clock className="h-4 w-4 text-blue-600 mr-1" />
                {filteredLogs.filter((l) => l.status === "in_progress").length} in progress
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
