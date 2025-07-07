export interface IncidentReport {
  id: string
  title: string
  service: string
  severity: "low" | "medium" | "high" | "critical"
  startTime: Date
  endTime?: Date
  description: string
  rootCause?: string
  impactAssessment: {
    usersAffected: number
    servicesAffected: string[]
    estimatedRevenueLoss: number
    reputationImpact: "none" | "low" | "medium" | "high"
  }
  timeline: TimelineEvent[]
  recoveryActions: RecoveryAction[]
  preventionMeasures: string[]
  lessonsLearned: string[]
  followUpActions: FollowUpAction[]
  createdBy: string
  createdAt: Date
}

export interface TimelineEvent {
  timestamp: Date
  event: string
  type: "detection" | "action" | "communication" | "resolution"
  details?: string
}

export interface RecoveryAction {
  timestamp: Date
  action: string
  result: "success" | "failed" | "partial"
  duration: number // seconds
  performedBy: "autoheal" | "manual"
  details?: string
}

export interface FollowUpAction {
  action: string
  assignee: string
  dueDate: Date
  priority: "low" | "medium" | "high"
  status: "pending" | "in_progress" | "completed"
}
