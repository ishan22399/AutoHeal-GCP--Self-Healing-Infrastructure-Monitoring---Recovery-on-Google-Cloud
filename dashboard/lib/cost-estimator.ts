export interface DowntimeEvent {
  service: string
  startTime: Date
  endTime?: Date
  severity: "low" | "medium" | "high" | "critical"
  affectedUsers?: number
  recoveryActions: string[]
}

export interface CostBreakdown {
  downtimeCost: number
  recoveryActionCost: number
  userImpactCost: number
  reputationCost: number
  totalCost: number
  details: CostDetail[]
}

export interface CostDetail {
  category: string
  description: string
  cost: number
  calculation: string
}

export interface ServiceCostConfig {
  name: string
  revenuePerSecond: number
  usersAffected: number
  criticalityMultiplier: number
  slaThreshold: number // minutes
  slaPenalty: number // per minute over threshold
}

export class DowntimeCostEstimator {
  private serviceCosts: Map<string, ServiceCostConfig> = new Map()
  private actionCosts: Map<string, number> = new Map()

  constructor() {
    this.initializeDefaultCosts()
  }

  private initializeDefaultCosts(): void {
    // Default service cost configurations
    this.serviceCosts.set("autoheal-test-vm", {
      name: "autoheal-test-vm",
      revenuePerSecond: 2.5,
      usersAffected: 1000,
      criticalityMultiplier: 2.0,
      slaThreshold: 5, // 5 minutes
      slaPenalty: 100, // $100 per minute over SLA
    })

    this.serviceCosts.set("autoheal-test-service", {
      name: "autoheal-test-service",
      revenuePerSecond: 5.0,
      usersAffected: 5000,
      criticalityMultiplier: 3.0,
      slaThreshold: 2, // 2 minutes
      slaPenalty: 500, // $500 per minute over SLA
    })

    this.serviceCosts.set("web-server-pod", {
      name: "web-server-pod",
      revenuePerSecond: 1.8,
      usersAffected: 800,
      criticalityMultiplier: 1.5,
      slaThreshold: 10, // 10 minutes
      slaPenalty: 50, // $50 per minute over SLA
    })

    // Recovery action costs
    this.actionCosts.set("restart", 0.1)
    this.actionCosts.set("scale", 0.25)
    this.actionCosts.set("failover", 5.0)
    this.actionCosts.set("rollback", 1.0)
    this.actionCosts.set("redeploy", 2.0)
    this.actionCosts.set("investigate", 0.05)
    this.actionCosts.set("notify", 0.01)
  }

  public calculateDowntimeCost(event: DowntimeEvent): CostBreakdown {
    const serviceConfig = this.serviceCosts.get(event.service)
    if (!serviceConfig) {
      throw new Error(`No cost configuration found for service: ${event.service}`)
    }

    const downtimeSeconds = event.endTime
      ? (event.endTime.getTime() - event.startTime.getTime()) / 1000
      : (Date.now() - event.startTime.getTime()) / 1000

    const downtimeMinutes = downtimeSeconds / 60

    const details: CostDetail[] = []

    // 1. Direct Revenue Loss
    const revenuePerSecond = serviceConfig.revenuePerSecond * this.getSeverityMultiplier(event.severity)
    const downtimeCost = downtimeSeconds * revenuePerSecond
    details.push({
      category: "Revenue Loss",
      description: "Direct revenue impact from service downtime",
      cost: downtimeCost,
      calculation: `${downtimeSeconds.toFixed(0)}s × $${revenuePerSecond.toFixed(2)}/s`,
    })

    // 2. Recovery Action Costs
    const recoveryActionCost = event.recoveryActions.reduce((total, action) => {
      const actionCost = this.actionCosts.get(action) || 0
      details.push({
        category: "Recovery Actions",
        description: `Cost of ${action} action`,
        cost: actionCost,
        calculation: `Fixed cost for ${action}`,
      })
      return total + actionCost
    }, 0)

    // 3. User Impact Cost
    const affectedUsers = event.affectedUsers || serviceConfig.usersAffected
    const userImpactCostPerUser = this.calculateUserImpactCost(event.severity, downtimeMinutes)
    const userImpactCost = affectedUsers * userImpactCostPerUser
    details.push({
      category: "User Impact",
      description: "Cost of user experience degradation",
      cost: userImpactCost,
      calculation: `${affectedUsers} users × $${userImpactCostPerUser.toFixed(4)}/user`,
    })

    // 4. SLA Penalty
    let slaPenaltyCost = 0
    if (downtimeMinutes > serviceConfig.slaThreshold) {
      const excessMinutes = downtimeMinutes - serviceConfig.slaThreshold
      slaPenaltyCost = excessMinutes * serviceConfig.slaPenalty
      details.push({
        category: "SLA Penalty",
        description: "Penalty for exceeding SLA threshold",
        cost: slaPenaltyCost,
        calculation: `${excessMinutes.toFixed(1)} min × $${serviceConfig.slaPenalty}/min`,
      })
    }

    // 5. Reputation Cost (estimated)
    const reputationCost = this.calculateReputationCost(event.severity, downtimeMinutes, affectedUsers)
    if (reputationCost > 0) {
      details.push({
        category: "Reputation Impact",
        description: "Estimated long-term reputation cost",
        cost: reputationCost,
        calculation: "Based on severity and user impact",
      })
    }

    const totalCost = downtimeCost + recoveryActionCost + userImpactCost + slaPenaltyCost + reputationCost

    return {
      downtimeCost,
      recoveryActionCost,
      userImpactCost: userImpactCost + slaPenaltyCost,
      reputationCost,
      totalCost,
      details,
    }
  }

  private getSeverityMultiplier(severity: string): number {
    switch (severity) {
      case "critical":
        return 3.0
      case "high":
        return 2.0
      case "medium":
        return 1.5
      case "low":
        return 1.0
      default:
        return 1.0
    }
  }

  private calculateUserImpactCost(severity: string, downtimeMinutes: number): number {
    // Base cost per user affected
    const baseCostPerUser = 0.05 // $0.05 per user

    // Severity multiplier
    const severityMultiplier = this.getSeverityMultiplier(severity)

    // Duration multiplier (logarithmic scale)
    const durationMultiplier = Math.log10(Math.max(1, downtimeMinutes)) + 1

    return baseCostPerUser * severityMultiplier * durationMultiplier
  }

  private calculateReputationCost(severity: string, downtimeMinutes: number, affectedUsers: number): number {
    // Only calculate reputation cost for significant incidents
    if (severity === "low" || downtimeMinutes < 5) {
      return 0
    }

    // Base reputation cost
    let baseCost = 0
    switch (severity) {
      case "critical":
        baseCost = 1000
        break
      case "high":
        baseCost = 500
        break
      case "medium":
        baseCost = 100
        break
      default:
        baseCost = 0
    }

    // Scale by affected users and duration
    const userScale = Math.log10(affectedUsers / 100) // Logarithmic scaling
    const durationScale = Math.sqrt(downtimeMinutes / 10) // Square root scaling

    return baseCost * Math.max(1, userScale) * Math.max(1, durationScale)
  }

  public estimatePreventionValue(service: string, preventedDowntimeMinutes: number): number {
    const serviceConfig = this.serviceCosts.get(service)
    if (!serviceConfig) return 0

    // Estimate the cost that would have been incurred
    const mockEvent: DowntimeEvent = {
      service,
      startTime: new Date(),
      endTime: new Date(Date.now() + preventedDowntimeMinutes * 60 * 1000),
      severity: "high", // Assume high severity for prevented incidents
      affectedUsers: serviceConfig.usersAffected,
      recoveryActions: ["restart"], // Minimal recovery action
    }

    const costBreakdown = this.calculateDowntimeCost(mockEvent)
    return costBreakdown.totalCost
  }

  public getServiceCostConfig(service: string): ServiceCostConfig | undefined {
    return this.serviceCosts.get(service)
  }

  public updateServiceCostConfig(service: string, config: Partial<ServiceCostConfig>): void {
    const existing = this.serviceCosts.get(service)
    if (existing) {
      this.serviceCosts.set(service, { ...existing, ...config })
    } else {
      this.serviceCosts.set(service, {
        name: service,
        revenuePerSecond: 1.0,
        usersAffected: 100,
        criticalityMultiplier: 1.0,
        slaThreshold: 10,
        slaPenalty: 50,
        ...config,
      })
    }
  }

  public generateCostReport(events: DowntimeEvent[]): {
    totalCost: number
    eventCount: number
    averageCostPerEvent: number
    costByService: Record<string, number>
    costByCategory: Record<string, number>
    preventionOpportunities: Array<{ service: string; potentialSavings: number }>
  } {
    let totalCost = 0
    const costByService: Record<string, number> = {}
    const costByCategory: Record<string, number> = {}

    for (const event of events) {
      const breakdown = this.calculateDowntimeCost(event)
      totalCost += breakdown.totalCost

      // Track by service
      costByService[event.service] = (costByService[event.service] || 0) + breakdown.totalCost

      // Track by category
      for (const detail of breakdown.details) {
        costByCategory[detail.category] = (costByCategory[detail.category] || 0) + detail.cost
      }
    }

    // Identify prevention opportunities
    const preventionOpportunities = Object.entries(costByService)
      .map(([service, cost]) => ({
        service,
        potentialSavings: cost * 0.8, // Assume 80% of costs could be prevented
      }))
      .sort((a, b) => b.potentialSavings - a.potentialSavings)

    return {
      totalCost,
      eventCount: events.length,
      averageCostPerEvent: events.length > 0 ? totalCost / events.length : 0,
      costByService,
      costByCategory,
      preventionOpportunities,
    }
  }
}

// Singleton instance
export const costEstimator = new DowntimeCostEstimator()
