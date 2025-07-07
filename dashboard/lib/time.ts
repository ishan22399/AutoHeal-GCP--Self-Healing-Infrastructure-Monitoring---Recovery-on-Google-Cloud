import { format, formatDistanceToNow, parseISO, isValid } from "date-fns"

export const formatTimestamp = (timestamp: string | Date): string => {
  try {
    const date = typeof timestamp === "string" ? parseISO(timestamp) : timestamp
    if (!isValid(date)) return "Invalid date"
    return format(date, "MMM dd, yyyy HH:mm:ss")
  } catch (error) {
    console.error("Error formatting timestamp:", error)
    return "Invalid date"
  }
}

export const formatRelativeTime = (timestamp: string | Date): string => {
  try {
    const date = typeof timestamp === "string" ? parseISO(timestamp) : timestamp
    if (!isValid(date)) return "Invalid date"
    return formatDistanceToNow(date, { addSuffix: true })
  } catch (error) {
    console.error("Error formatting relative time:", error)
    return "Invalid date"
  }
}

export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  } else {
    const hours = Math.floor(seconds / 3600)
    const remainingMinutes = Math.floor((seconds % 3600) / 60)
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }
}

export const getTimeRangeFilter = (hours: number): { start: string; end: string } => {
  const end = new Date()
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000)

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

export const groupDataByTimeInterval = <T extends { timestamp: string }>(data: T[], intervalMinutes = 5): T[] => {
  const grouped = new Map<string, T>()

  data.forEach((item) => {
    const date = new Date(item.timestamp)
    const intervalStart = new Date(
      Math.floor(date.getTime() / (intervalMinutes * 60 * 1000)) * intervalMinutes * 60 * 1000,
    )
    const key = intervalStart.toISOString()

    if (!grouped.has(key) || new Date(item.timestamp) > new Date(grouped.get(key)!.timestamp)) {
      grouped.set(key, item)
    }
  })

  return Array.from(grouped.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}
