export const MONITORING_THRESHOLDS = {
  CPU: {
    WARNING: 70,
    CRITICAL: 90,
  },
  MEMORY: {
    WARNING: 75,
    CRITICAL: 85,
  },
  DISK: {
    WARNING: 80,
    CRITICAL: 95,
  },
  ERROR_RATE: {
    WARNING: 5,
    CRITICAL: 10,
  },
} as const

export const SERVICE_TYPES = {
  GCE: "gce",
  CLOUD_RUN: "cloud_run",
  GKE: "gke",
} as const

export const ALERT_SEVERITIES = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const

export const HEALING_ACTIONS = {
  VM_RESTART: "vm_restart",
  CONTAINER_RESTART: "container_restart",
  SERVICE_SCALE: "service_scale",
  TRAFFIC_REROUTE: "traffic_reroute",
  ALERT_ONLY: "alert_only",
} as const

export const STATUS_COLORS = {
  healthy: "text-green-600 bg-green-50 border-green-200",
  warning: "text-yellow-600 bg-yellow-50 border-yellow-200",
  critical: "text-red-600 bg-red-50 border-red-200",
  unknown: "text-gray-600 bg-gray-50 border-gray-200",
} as const

export const CHART_COLORS = {
  primary: "#3B82F6",
  secondary: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#6366F1",
} as const

export const REFRESH_INTERVALS = {
  FAST: 5000, // 5 seconds
  NORMAL: 30000, // 30 seconds
  SLOW: 60000, // 1 minute
} as const

export const TIME_RANGES = {
  "1h": { label: "1 Hour", hours: 1 },
  "6h": { label: "6 Hours", hours: 6 },
  "24h": { label: "24 Hours", hours: 24 },
  "7d": { label: "7 Days", hours: 168 },
  "30d": { label: "30 Days", hours: 720 },
} as const

export const ICON_MAPPINGS = {
  [SERVICE_TYPES.GCE]: "Server",
  [SERVICE_TYPES.CLOUD_RUN]: "Globe",
  [SERVICE_TYPES.GKE]: "Container",
} as const
