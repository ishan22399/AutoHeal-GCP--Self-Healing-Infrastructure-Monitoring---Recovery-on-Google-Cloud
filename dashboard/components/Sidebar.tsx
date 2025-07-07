"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Home,
  FileText,
  Settings,
  BarChart3,
  Activity,
  Menu,
  X,
  Heart,
  AlertTriangle,
  CheckCircle,
} from "lucide-react"

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
    <aside
      className={cn(
        "flex flex-col h-screen bg-gradient-to-b from-white via-blue-50 to-blue-100 border-r border-gray-200 shadow-sm transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white/80 backdrop-blur sticky top-0 z-10">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-600 rounded-lg shadow">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">AutoHeal</h1>
              <p className="text-xs text-gray-500 font-medium">GCP Monitor</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 p-0 hover:bg-blue-100"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </Button>
      </div>

      {/* Status Summary */}
      {!isCollapsed && (
        <div className="p-4 border-b border-gray-200 bg-white/70">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-gray-700 font-medium">System Status</span>
              </div>
              <Badge variant="default" className="bg-green-100 text-green-800 font-semibold">
                Healthy
              </Badge>
            </div>
            {activeIncidents > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-gray-700 font-medium">Active Incidents</span>
                </div>
                <Badge variant="destructive" className="font-semibold">{activeIncidents}</Badge>
              </div>
            )}
            {alertCount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-yellow-600" />
                  <span className="text-gray-700 font-medium">Pending Alerts</span>
                </div>
                <Badge variant="secondary" className="font-semibold">{alertCount}</Badge>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors group",
                    isActive
                      ? "bg-blue-100 text-blue-700 shadow"
                      : "text-gray-600 hover:bg-blue-50 hover:text-blue-900",
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon
                    className={cn(
                      "flex-shrink-0 transition-transform duration-200",
                      isCollapsed ? "h-6 w-6" : "h-5 w-5",
                      isActive && "text-blue-700"
                    )}
                  />
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-semibold">{item.name}</div>
                      <div className="text-xs text-gray-500 truncate">{item.description}</div>
                    </div>
                  )}
                  {!isCollapsed && item.name === "Logs" && alertCount > 0 && (
                    <Badge variant="secondary" className="ml-auto font-semibold">
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
        <div className="p-4 border-t border-gray-200 bg-white/80 mt-auto">
          <div className="text-xs text-gray-500 space-y-1">
            <div className="font-semibold">AutoHeal-GCP v2.0</div>
            <div>Last updated: <span className="font-mono">{new Date().toLocaleTimeString()}</span></div>
          </div>
        </div>
      )}
    </aside>
  )
}
