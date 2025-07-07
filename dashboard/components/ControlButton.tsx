"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, Loader2, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ControlButtonProps {
  label: string
  description?: string
  icon?: LucideIcon
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost"
  size?: "default" | "sm" | "lg"
  onClick: () => Promise<boolean> | boolean
  disabled?: boolean
  confirmationRequired?: boolean
  confirmationMessage?: string
  successMessage?: string
  errorMessage?: string
  className?: string
}

export function ControlButton({
  label,
  description,
  icon: Icon,
  variant = "default",
  size = "default",
  onClick,
  disabled = false,
  confirmationRequired = false,
  confirmationMessage = `Are you sure you want to ${label.toLowerCase()}?`,
  successMessage,
  errorMessage,
  className,
}: ControlButtonProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<"success" | "error" | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const handleClick = async () => {
    if (confirmationRequired && !showConfirmation) {
      setShowConfirmation(true)
      return
    }

    setLoading(true)
    setResult(null)
    setShowConfirmation(false)

    try {
      const success = await onClick()
      setResult(success ? "success" : "error")

      // Auto-hide result after 3 seconds
      setTimeout(() => {
        setResult(null)
      }, 3000)
    } catch (error) {
      console.error("Control button error:", error)
      setResult("error")

      setTimeout(() => {
        setResult(null)
      }, 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setShowConfirmation(false)
  }

  const getResultIcon = () => {
    switch (result) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const getResultMessage = () => {
    switch (result) {
      case "success":
        return successMessage || `${label} completed successfully`
      case "error":
        return errorMessage || `Failed to ${label.toLowerCase()}`
      default:
        return null
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {showConfirmation ? (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <div className="mb-3">{confirmationMessage}</div>
            <div className="flex space-x-2">
              <Button size="sm" variant="destructive" onClick={handleClick} disabled={loading}>
                {loading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Confirm
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel} disabled={loading}>
                Cancel
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-2">
          <Button variant={variant} size={size} onClick={handleClick} disabled={disabled || loading} className="w-full">
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : Icon ? (
              <Icon className="h-4 w-4 mr-2" />
            ) : null}
            {label}
          </Button>

          {description && <p className="text-xs text-gray-500 text-center">{description}</p>}

          {result && (
            <div
              className={cn(
                "flex items-center justify-center space-x-2 text-sm p-2 rounded-md",
                result === "success" && "bg-green-50 text-green-700",
                result === "error" && "bg-red-50 text-red-700",
              )}
            >
              {getResultIcon()}
              <span>{getResultMessage()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
