import yaml from "yaml"
import Joi from "joi"
import { readFileSync } from "fs"
import { join } from "path"

export interface HealingPolicy {
  version: string
  metadata: {
    name: string
    description: string
    created: string
    updated: string
  }
  global: {
    max_concurrent_actions: number
    cooldown_period: number
    escalation_threshold: number
    cost_per_second_downtime: number
    notification_channels: string[]
  }
  services: ServiceDefinition[]
  rules: HealingRule[]
  decision_trees: DecisionTree[]
  validation: ValidationConfig
  cost_model: CostModel
}

export interface ServiceDefinition {
  name: string
  type: "gce" | "cloud_run" | "gke"
  region: string
  zone?: string
  criticality: "low" | "medium" | "high" | "critical"
  max_downtime_minutes: number
}

export interface HealingRule {
  id: string
  name: string
  service_pattern: string
  conditions: Condition[]
  actions: Action[]
  cooldown: number
  max_retries: number
  escalation?: EscalationConfig
}

export interface Condition {
  metric: string
  operator: ">" | "<" | "==" | ">=" | "<=" | "increasing" | "decreasing"
  threshold: number | boolean
  duration?: string
  model?: string
}

export interface Action {
  type: string
  priority: number
  timeout?: number
  parameters?: Record<string, any>
  condition?: string
  delay?: number
  channels?: string[]
  message?: string
}

export interface EscalationConfig {
  after_failures: number
  actions: Action[]
}

export interface DecisionTree {
  name: string
  root: DecisionNode
}

export interface DecisionNode {
  condition: string
  true?: DecisionNode | { action: string }
  false?: DecisionNode | { action: string }
  action?: string
}

export interface ValidationConfig {
  post_healing_checks: ValidationCheck[]
}

export interface ValidationCheck {
  name: string
  timeout: number
  checks: Condition[]
}

export interface CostModel {
  downtime_cost_per_second: number
  user_impact_multiplier: Record<string, number>
  recovery_action_costs: Record<string, number>
}

export interface PolicyEvaluationContext {
  service: string
  metrics: Record<string, number | boolean>
  history: HistoryEntry[]
  current_time: Date
}

export interface HistoryEntry {
  timestamp: Date
  action: string
  success: boolean
  service: string
}

export interface PolicyDecision {
  should_act: boolean
  actions: Action[]
  reasoning: string[]
  cost_estimate: number
  risk_score: number
}

const policySchema = Joi.object({
  version: Joi.string().required(),
  metadata: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    created: Joi.string().isoDate().required(),
    updated: Joi.string().isoDate().required(),
  }).required(),
  global: Joi.object({
    max_concurrent_actions: Joi.number().min(1).required(),
    cooldown_period: Joi.number().min(0).required(),
    escalation_threshold: Joi.number().min(1).required(),
    cost_per_second_downtime: Joi.number().min(0).required(),
    notification_channels: Joi.array().items(Joi.string()).required(),
  }).required(),
  services: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        type: Joi.string().valid("gce", "cloud_run", "gke").required(),
        region: Joi.string().required(),
        zone: Joi.string().optional(),
        criticality: Joi.string().valid("low", "medium", "high", "critical").required(),
        max_downtime_minutes: Joi.number().min(0).required(),
      }),
    )
    .required(),
  rules: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().required(),
        name: Joi.string().required(),
        service_pattern: Joi.string().required(),
        conditions: Joi.array()
          .items(
            Joi.object({
              metric: Joi.string().required(),
              operator: Joi.string().valid(">", "<", "==", ">=", "<=", "increasing", "decreasing").required(),
              threshold: Joi.alternatives().try(Joi.number(), Joi.boolean()).required(),
              duration: Joi.string().optional(),
              model: Joi.string().optional(),
            }),
          )
          .required(),
        actions: Joi.array()
          .items(
            Joi.object({
              type: Joi.string().required(),
              priority: Joi.number().min(1).required(),
              timeout: Joi.number().optional(),
              parameters: Joi.object().optional(),
              condition: Joi.string().optional(),
              delay: Joi.number().optional(),
              channels: Joi.array().items(Joi.string()).optional(),
              message: Joi.string().optional(),
            }),
          )
          .required(),
        cooldown: Joi.number().min(0).required(),
        max_retries: Joi.number().min(0).required(),
        escalation: Joi.object({
          after_failures: Joi.number().min(1).required(),
          actions: Joi.array().items(Joi.object()).required(),
        }).optional(),
      }),
    )
    .required(),
})

export class PolicyEngine {
  private policy: HealingPolicy
  private actionHistory: Map<string, HistoryEntry[]> = new Map()

  constructor(policyPath?: string) {
    const configPath = policyPath || join(process.cwd(), "config", "healing-policies.yaml")
    this.loadPolicy(configPath)
  }

  private loadPolicy(path: string): void {
    try {
      const policyContent = readFileSync(path, "utf8")
      const parsedPolicy = yaml.parse(policyContent)

      // Validate policy structure
      const { error, value } = policySchema.validate(parsedPolicy)
      if (error) {
        throw new Error(`Policy validation failed: ${error.message}`)
      }

      this.policy = value as HealingPolicy
      console.log(`✅ Loaded healing policy: ${this.policy.metadata.name}`)
    } catch (error) {
      console.error("❌ Failed to load healing policy:", error)
      throw error
    }
  }

  public evaluatePolicy(context: PolicyEvaluationContext): PolicyDecision {
    const { service, metrics, history, current_time } = context
    const reasoning: string[] = []
    const applicableRules: HealingRule[] = []

    // Find applicable rules for the service
    for (const rule of this.policy.rules) {
      if (this.matchesServicePattern(service, rule.service_pattern)) {
        if (this.evaluateConditions(rule.conditions, metrics, reasoning)) {
          // Check cooldown period
          if (this.isInCooldown(service, rule.id, current_time)) {
            reasoning.push(`Rule ${rule.id} is in cooldown period`)
            continue
          }

          // Check retry limit
          const failureCount = this.getRecentFailureCount(service, rule.id)
          if (failureCount >= rule.max_retries) {
            reasoning.push(`Rule ${rule.id} exceeded max retries (${rule.max_retries})`)
            continue
          }

          applicableRules.push(rule)
        }
      }
    }

    if (applicableRules.length === 0) {
      return {
        should_act: false,
        actions: [],
        reasoning: ["No applicable rules found"],
        cost_estimate: 0,
        risk_score: 0,
      }
    }

    // Sort rules by priority and select the best action
    const selectedRule = applicableRules.sort((a, b) => {
      const aPriority = Math.min(...a.actions.map((action) => action.priority))
      const bPriority = Math.min(...b.actions.map((action) => action.priority))
      return aPriority - bPriority
    })[0]

    // Calculate cost estimate
    const costEstimate = this.calculateCostEstimate(selectedRule, service)

    // Calculate risk score
    const riskScore = this.calculateRiskScore(context, selectedRule)

    reasoning.push(`Selected rule: ${selectedRule.name}`)
    reasoning.push(`Estimated cost: $${costEstimate.toFixed(2)}`)
    reasoning.push(`Risk score: ${riskScore.toFixed(2)}`)

    return {
      should_act: true,
      actions: selectedRule.actions,
      reasoning,
      cost_estimate: costEstimate,
      risk_score: riskScore,
    }
  }

  private matchesServicePattern(serviceName: string, pattern: string): boolean {
    // Support wildcards and service type patterns
    if (pattern === "*") return true

    const patterns = pattern.split(",").map((p) => p.trim())
    return patterns.some((p) => {
      if (p.includes(":")) {
        const [type, namePattern] = p.split(":")
        // Check if service matches type pattern
        return namePattern === "*" || serviceName.includes(namePattern)
      }
      return serviceName.includes(p) || p === "*"
    })
  }

  private evaluateConditions(
    conditions: Condition[],
    metrics: Record<string, number | boolean>,
    reasoning: string[],
  ): boolean {
    for (const condition of conditions) {
      const metricValue = metrics[condition.metric]
      if (metricValue === undefined) {
        reasoning.push(`Metric ${condition.metric} not available`)
        return false
      }

      const result = this.evaluateCondition(condition, metricValue)
      reasoning.push(`${condition.metric} ${condition.operator} ${condition.threshold}: ${result}`)

      if (!result) {
        return false
      }
    }
    return true
  }

  private evaluateCondition(condition: Condition, value: number | boolean): boolean {
    switch (condition.operator) {
      case ">":
        return (value as number) > (condition.threshold as number)
      case "<":
        return (value as number) < (condition.threshold as number)
      case ">=":
        return (value as number) >= (condition.threshold as number)
      case "<=":
        return (value as number) <= (condition.threshold as number)
      case "==":
        return value === condition.threshold
      case "increasing":
      case "decreasing":
        // These would require historical data analysis
        return true // Simplified for now
      default:
        return false
    }
  }

  private isInCooldown(service: string, ruleId: string, currentTime: Date): boolean {
    const history = this.actionHistory.get(service) || []
    const rule = this.policy.rules.find((r) => r.id === ruleId)
    if (!rule) return false

    const lastAction = history
      .filter((entry) => entry.action.includes(ruleId))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]

    if (!lastAction) return false

    const timeSinceLastAction = (currentTime.getTime() - lastAction.timestamp.getTime()) / 1000
    return timeSinceLastAction < rule.cooldown
  }

  private getRecentFailureCount(service: string, ruleId: string): number {
    const history = this.actionHistory.get(service) || []
    const recentFailures = history.filter(
      (entry) => entry.action.includes(ruleId) && !entry.success && Date.now() - entry.timestamp.getTime() < 3600000, // Last hour
    )
    return recentFailures.length
  }

  private calculateCostEstimate(rule: HealingRule, service: string): number {
    const serviceConfig = this.policy.services.find((s) => s.name === service)
    const baseCost = this.policy.cost_model.downtime_cost_per_second

    let totalCost = 0
    for (const action of rule.actions) {
      const actionCost = this.policy.cost_model.recovery_action_costs[action.type] || 0
      totalCost += actionCost
    }

    // Add downtime cost estimate
    const estimatedDowntime = 30 // seconds (estimate)
    const downtimeCost = baseCost * estimatedDowntime

    if (serviceConfig) {
      const multiplier = this.policy.cost_model.user_impact_multiplier[serviceConfig.criticality] || 1
      totalCost *= multiplier
    }

    return totalCost + downtimeCost
  }

  private calculateRiskScore(context: PolicyEvaluationContext, rule: HealingRule): number {
    let riskScore = 0

    // Base risk from metric values
    const cpuRisk = Math.max(0, ((context.metrics.cpu_utilization as number) - 70) / 30)
    const memoryRisk = Math.max(0, ((context.metrics.memory_utilization as number) - 70) / 30)
    riskScore += (cpuRisk + memoryRisk) * 0.4

    // Risk from action type
    const actionRiskMap: Record<string, number> = {
      restart: 0.3,
      scale: 0.1,
      failover: 0.8,
      rollback: 0.6,
    }

    for (const action of rule.actions) {
      riskScore += actionRiskMap[action.type] || 0.2
    }

    // Risk from recent failures
    const recentFailures = this.getRecentFailureCount(context.service, rule.id)
    riskScore += recentFailures * 0.2

    return Math.min(1.0, riskScore)
  }

  public recordAction(service: string, action: string, success: boolean): void {
    if (!this.actionHistory.has(service)) {
      this.actionHistory.set(service, [])
    }

    const history = this.actionHistory.get(service)!
    history.push({
      timestamp: new Date(),
      action,
      success,
      service,
    })

    // Keep only last 100 entries per service
    if (history.length > 100) {
      history.splice(0, history.length - 100)
    }
  }

  public getPolicy(): HealingPolicy {
    return this.policy
  }

  public updatePolicy(newPolicy: Partial<HealingPolicy>): void {
    this.policy = { ...this.policy, ...newPolicy }
    this.policy.metadata.updated = new Date().toISOString()
  }

  public validateService(serviceName: string): boolean {
    return this.policy.services.some((service) => service.name === serviceName)
  }

  public getServiceConfig(serviceName: string): ServiceDefinition | undefined {
    return this.policy.services.find((service) => service.name === serviceName)
  }
}

// Singleton instance
export const policyEngine = new PolicyEngine()
