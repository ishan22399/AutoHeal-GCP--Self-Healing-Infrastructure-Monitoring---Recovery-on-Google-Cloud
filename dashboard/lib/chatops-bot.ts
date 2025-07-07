import { WebClient } from "@slack/web-api"
import { Telegraf } from "telegraf"

export interface ChatOpsCommand {
  command: string
  description: string
  handler: (args: string[], context: any) => Promise<string>
  permissions?: string[]
}

export interface ChatOpsConfig {
  slack?: {
    token: string
    channel: string
  }
  telegram?: {
    token: string
    chatId: string
  }
}

export class ChatOpsBot {
  private slackClient?: WebClient
  private telegramBot?: Telegraf
  private commands: Map<string, ChatOpsCommand> = new Map()
  private config: ChatOpsConfig

  constructor(config: ChatOpsConfig) {
    this.config = config
    this.initializeClients()
    this.registerCommands()
  }

  private initializeClients(): void {
    if (this.config.slack?.token) {
      this.slackClient = new WebClient(this.config.slack.token)
    }

    if (this.config.telegram?.token) {
      this.telegramBot = new Telegraf(this.config.telegram.token)
      this.setupTelegramHandlers()
    }
  }

  private registerCommands(): void {
    // System status command
    this.commands.set("status", {
      command: "status",
      description: "Get current system status",
      handler: this.handleStatusCommand.bind(this),
    })

    // Restart service command
    this.commands.set("restart", {
      command: "restart",
      description: "Restart a service (usage: restart <service-name>)",
      handler: this.handleRestartCommand.bind(this),
      permissions: ["admin", "sre"],
    })

    // Scale service command
    this.commands.set("scale", {
      command: "scale",
      description: "Scale a service (usage: scale <service-name> <instances>)",
      handler: this.handleScaleCommand.bind(this),
      permissions: ["admin", "sre"],
    })

    // Get logs command
    this.commands.set("logs", {
      command: "logs",
      description: "Get recent healing logs (usage: logs [service-name] [count])",
      handler: this.handleLogsCommand.bind(this),
    })

    // Simulate failure command
    this.commands.set("simulate", {
      command: "simulate",
      description: "Simulate a failure (usage: simulate <type> <service>)",
      handler: this.handleSimulateCommand.bind(this),
      permissions: ["admin"],
    })

    // Get metrics command
    this.commands.set("metrics", {
      command: "metrics",
      description: "Get current metrics for a service",
      handler: this.handleMetricsCommand.bind(this),
    })

    // Help command
    this.commands.set("help", {
      command: "help",
      description: "Show available commands",
      handler: this.handleHelpCommand.bind(this),
    })
  }

  private setupTelegramHandlers(): void {
    if (!this.telegramBot) return

    this.telegramBot.start((ctx) => {
      ctx.reply("🤖 AutoHeal-GCP Bot is ready! Type /help to see available commands.")
    })

    this.telegramBot.help((ctx) => {
      this.handleCommand("help", [], ctx).then((response) => {
        ctx.reply(response)
      })
    })

    // Handle all text messages as potential commands
    this.telegramBot.on("text", (ctx) => {
      const text = ctx.message.text
      if (text.startsWith("/")) {
        const [command, ...args] = text.slice(1).split(" ")
        this.handleCommand(command, args, ctx).then((response) => {
          ctx.reply(response, { parse_mode: "Markdown" })
        })
      }
    })
  }

  public async sendSlackMessage(message: string, channel?: string): Promise<void> {
    if (!this.slackClient) return

    try {
      await this.slackClient.chat.postMessage({
        channel: channel || this.config.slack?.channel || "#autoheal",
        text: message,
        username: "AutoHeal Bot",
        icon_emoji: ":robot_face:",
      })
    } catch (error) {
      console.error("Failed to send Slack message:", error)
    }
  }

  public async sendTelegramMessage(message: string, chatId?: string): Promise<void> {
    if (!this.telegramBot) return

    try {
      await this.telegramBot.telegram.sendMessage(chatId || this.config.telegram?.chatId || "", message, {
        parse_mode: "Markdown",
      })
    } catch (error) {
      console.error("Failed to send Telegram message:", error)
    }
  }

  public async handleSlackCommand(command: string, args: string[], userId: string): Promise<string> {
    return this.handleCommand(command, args, { userId, platform: "slack" })
  }

  private async handleCommand(command: string, args: string[], context: any): Promise<string> {
    const cmd = this.commands.get(command.toLowerCase())
    if (!cmd) {
      return `❌ Unknown command: ${command}. Type 'help' to see available commands.`
    }

    // Check permissions (simplified - in production, integrate with proper auth)
    if (cmd.permissions && cmd.permissions.length > 0) {
      // For demo purposes, assume all users have permissions
      // In production, check against user roles/permissions
    }

    try {
      return await cmd.handler(args, context)
    } catch (error) {
      console.error(`Command ${command} failed:`, error)
      return `❌ Command failed: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }

  private async handleStatusCommand(args: string[], context: any): Promise<string> {
    // Mock system status - in production, fetch from actual APIs
    const services = [
      { name: "autoheal-test-vm", status: "🟢 Healthy", cpu: "45%", memory: "67%" },
      { name: "autoheal-test-service", status: "🟢 Healthy", cpu: "23%", memory: "45%" },
      { name: "web-server-pod", status: "🔴 Critical", cpu: "95%", memory: "87%" },
    ]

    let response = "📊 *AutoHeal System Status*\n\n"
    for (const service of services) {
      response += `*${service.name}*\n`
      response += `Status: ${service.status}\n`
      response += `CPU: ${service.cpu} | Memory: ${service.memory}\n\n`
    }

    response += `Last updated: ${new Date().toLocaleString()}`
    return response
  }

  private async handleRestartCommand(args: string[], context: any): Promise<string> {
    if (args.length === 0) {
      return "❌ Please specify a service name. Usage: restart <service-name>"
    }

    const serviceName = args[0]
    // In production, call actual restart API
    console.log(`Restarting service: ${serviceName}`)

    return `🔄 Restart initiated for service: *${serviceName}*\nThis may take a few minutes...`
  }

  private async handleScaleCommand(args: string[], context: any): Promise<string> {
    if (args.length < 2) {
      return "❌ Please specify service name and instance count. Usage: scale <service-name> <instances>"
    }

    const serviceName = args[0]
    const instances = Number.parseInt(args[1], 10)

    if (Number.isNaN(instances) || instances < 1) {
      return "❌ Invalid instance count. Please provide a positive number."
    }

    // In production, call actual scaling API
    console.log(`Scaling service ${serviceName} to ${instances} instances`)

    return `📈 Scaling service *${serviceName}* to ${instances} instances...`
  }

  private async handleLogsCommand(args: string[], context: any): Promise<string> {
    const serviceName = args[0] || "all"
    const count = Number.parseInt(args[1] || "5", 10)

    // Mock logs - in production, fetch from actual logging API
    const logs = [
      "2024-01-15 10:30:00 - High CPU detected on autoheal-test-vm",
      "2024-01-15 10:30:15 - Restart action initiated",
      "2024-01-15 10:31:00 - Service recovered successfully",
      "2024-01-15 09:45:00 - Memory usage warning on web-server-pod",
      "2024-01-15 09:15:00 - Scaling action completed for autoheal-test-service",
    ]

    let response = `📋 *Recent Healing Logs*\n`
    if (serviceName !== "all") {
      response += `Service: ${serviceName}\n`
    }
    response += `\n`

    logs.slice(0, count).forEach((log) => {
      response += `• ${log}\n`
    })

    return response
  }

  private async handleSimulateCommand(args: string[], context: any): Promise<string> {
    if (args.length < 2) {
      return "❌ Usage: simulate <type> <service>\nTypes: cpu_spike, memory_leak, service_down"
    }

    const [type, service] = args
    const validTypes = ["cpu_spike", "memory_leak", "service_down", "error_storm"]

    if (!validTypes.includes(type)) {
      return `❌ Invalid simulation type. Valid types: ${validTypes.join(", ")}`
    }

    // In production, trigger actual simulation
    console.log(`Simulating ${type} on ${service}`)

    return `🧪 Simulation started: *${type}* on service *${service}*\nMonitor the dashboard for healing actions...`
  }

  private async handleMetricsCommand(args: string[], context: any): Promise<string> {
    const serviceName = args[0]
    if (!serviceName) {
      return "❌ Please specify a service name. Usage: metrics <service-name>"
    }

    // Mock metrics - in production, fetch from monitoring API
    const metrics = {
      cpu: Math.floor(Math.random() * 100),
      memory: Math.floor(Math.random() * 100),
      requests_per_minute: Math.floor(Math.random() * 1000),
      error_rate: (Math.random() * 5).toFixed(2),
      uptime: "99.9%",
    }

    let response = `📈 *Metrics for ${serviceName}*\n\n`
    response += `CPU Usage: ${metrics.cpu}%\n`
    response += `Memory Usage: ${metrics.memory}%\n`
    response += `Requests/min: ${metrics.requests_per_minute}\n`
    response += `Error Rate: ${metrics.error_rate}%\n`
    response += `Uptime: ${metrics.uptime}\n`
    response += `\nLast updated: ${new Date().toLocaleString()}`

    return response
  }

  private async handleHelpCommand(args: string[], context: any): Promise<string> {
    let response = "🤖 *AutoHeal-GCP Bot Commands*\n\n"

    for (const [name, cmd] of this.commands) {
      response += `*/${name}* - ${cmd.description}\n`
    }

    response += "\n💡 *Examples:*\n"
    response += "• `/status` - Get system status\n"
    response += "• `/restart autoheal-test-vm` - Restart a service\n"
    response += "• `/logs web-server-pod 10` - Get 10 recent logs\n"
    response += "• `/metrics autoheal-test-service` - Get service metrics\n"

    return response
  }

  public async sendAlert(alert: {
    severity: string
    service: string
    message: string
    timestamp: Date
  }): Promise<void> {
    const emoji = this.getSeverityEmoji(alert.severity)
    const message = `${emoji} *Alert: ${alert.service}*\n${alert.message}\nTime: ${alert.timestamp.toLocaleString()}`

    await Promise.all([this.sendSlackMessage(message), this.sendTelegramMessage(message)])
  }

  public async sendHealingNotification(notification: {
    service: string
    action: string
    success: boolean
    duration?: number
  }): Promise<void> {
    const emoji = notification.success ? "✅" : "❌"
    const status = notification.success ? "Success" : "Failed"
    const duration = notification.duration ? ` (${notification.duration}s)` : ""

    const message = `${emoji} *Healing Action ${status}*\nService: ${notification.service}\nAction: ${notification.action}${duration}`

    await Promise.all([this.sendSlackMessage(message), this.sendTelegramMessage(message)])
  }

  private getSeverityEmoji(severity: string): string {
    switch (severity.toLowerCase()) {
      case "critical":
        return "🚨"
      case "high":
        return "⚠️"
      case "medium":
        return "🟡"
      case "low":
        return "ℹ️"
      default:
        return "📢"
    }
  }

  public startTelegramBot(): void {
    if (this.telegramBot) {
      this.telegramBot.launch()
      console.log("🤖 Telegram bot started")
    }
  }

  public stopTelegramBot(): void {
    if (this.telegramBot) {
      this.telegramBot.stop()
      console.log("🤖 Telegram bot stopped")
    }
  }
}

// Export singleton instance (configured via environment variables)
export const chatOpsBot = new ChatOpsBot({
  slack: {
    token: process.env.SLACK_BOT_TOKEN || "",
    channel: process.env.SLACK_CHANNEL || "#autoheal",
  },
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || "",
    chatId: process.env.TELEGRAM_CHAT_ID || "",
  },
})
