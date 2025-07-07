"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Home, FileText, Settings, BarChart3, Activity, Menu, X, Heart, AlertTriangle, CheckCircle } from "lucide-react"

interface SidebarProps {
  alertCount?: number
  activeIncidents?: number
  className?: string
}

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home,
    description: "System overview and metrics",
  },
  {
    name: "Logs",
    href: "/logs",
    icon: FileText,
    description: "Healing action logs and history",
  },
  {
    name: "Metrics",
    href: "/metrics",
    icon: BarChart3,
    description: "Detailed performance metrics",
  },
  {
    name: "Controls",
    href: "/controls",
    icon: Settings,
    description: "Manual controls and testing",
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: Activity,
    description: "Trends and analytics",
  },
]

export function Sidebar({ alertCount = 0, activeIncidents = 0, className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <div
      className={cn(
        "flex flex-col bg-white border-r border-gray-200 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <Heart className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">AutoHeal</h1>
              <p className="text-xs text-gray-500">GCP Monitor</p>
            </div>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={() => setIsCollapsed(!isCollapsed)} className="h-8 w-8 p-0">
          {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      {/* Status Summary */}
      {!isCollapsed && (
        <div className="p-4 border-b border-gray-200">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-gray-600">System Status</span>
              </div>
              <Badge variant="default" className="bg-green-100 text-green-800">
                Healthy
              </Badge>
            </div>

            {activeIncidents > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-gray-600">Active Incidents</span>
                </div>
                <Badge variant="destructive">{activeIncidents}</Badge>
              </div>
            )}

            {alertCount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-yellow-600" />
                  <span className="text-gray-600">Pending Alerts</span>
                </div>
                <Badge variant="secondary">{alertCount}</Badge>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className={cn("flex-shrink-0", isCollapsed ? "h-5 w-5" : "h-4 w-4")} />
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{item.name}</div>
                      <div className="text-xs text-gray-500 truncate">{item.description}</div>
                    </div>
                  )}
                  {!isCollapsed && item.name === "Logs" && alertCount > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {alertCount}
                    </Badge>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <div>AutoHeal-GCP v2.0</div>
            <div>Last updated: {new Date().toLocaleTimeString()}</div>
          </div>
        </div>
      )}
    </div>
  )
}
