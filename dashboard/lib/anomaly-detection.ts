import { mean, standardDeviation, quantile } from "simple-statistics"

export interface AnomalyDetectionModel {
  name: string
  type: "isolation_forest" | "statistical" | "lstm"
  threshold: number
  sensitivity: number
}

export interface MetricPoint {
  timestamp: Date
  value: number
  features?: Record<string, number>
}

export interface AnomalyResult {
  isAnomaly: boolean
  score: number
  confidence: number
  explanation: string
  severity: "low" | "medium" | "high" | "critical"
}

export class AnomalyDetector {
  private models: Map<string, AnomalyDetectionModel> = new Map()
  private historicalData: Map<string, MetricPoint[]> = new Map()
  private readonly maxHistorySize = 1000

  constructor() {
    this.initializeModels()
  }

  private initializeModels(): void {
    // Statistical anomaly detection model
    this.models.set("statistical", {
      name: "Statistical Outlier Detection",
      type: "statistical",
      threshold: 2.5, // Standard deviations
      sensitivity: 0.8,
    })

    // Isolation Forest model (simplified implementation)
    this.models.set("isolation_forest", {
      name: "Isolation Forest",
      type: "isolation_forest",
      threshold: 0.6,
      sensitivity: 0.7,
    })
  }

  public addDataPoint(metric: string, point: MetricPoint): void {
    if (!this.historicalData.has(metric)) {
      this.historicalData.set(metric, [])
    }

    const data = this.historicalData.get(metric)!
    data.push(point)

    // Keep only recent data
    if (data.length > this.maxHistorySize) {
      data.splice(0, data.length - this.maxHistorySize)
    }
  }

  public detectAnomaly(metric: string, currentValue: number, modelType = "statistical"): AnomalyResult {
    const model = this.models.get(modelType)
    if (!model) {
      throw new Error(`Unknown model type: ${modelType}`)
    }

    const historicalData = this.historicalData.get(metric) || []
    if (historicalData.length < 10) {
      return {
        isAnomaly: false,
        score: 0,
        confidence: 0,
        explanation: "Insufficient historical data for anomaly detection",
        severity: "low",
      }
    }

    switch (model.type) {
      case "statistical":
        return this.statisticalAnomalyDetection(historicalData, currentValue, model)
      case "isolation_forest":
        return this.isolationForestDetection(historicalData, currentValue, model)
      default:
        throw new Error(`Unsupported model type: ${model.type}`)
    }
  }

  private statisticalAnomalyDetection(
    historicalData: MetricPoint[],
    currentValue: number,
    model: AnomalyDetectionModel,
  ): AnomalyResult {
    const values = historicalData.map((point) => point.value)
    const meanValue = mean(values)
    const stdDev = standardDeviation(values)

    // Z-score calculation
    const zScore = Math.abs((currentValue - meanValue) / stdDev)
    const isAnomaly = zScore > model.threshold

    // Calculate confidence based on how far from normal the value is
    const confidence = Math.min(1, zScore / (model.threshold * 2))

    // Determine severity
    let severity: "low" | "medium" | "high" | "critical" = "low"
    if (zScore > model.threshold * 3) severity = "critical"
    else if (zScore > model.threshold * 2) severity = "high"
    else if (zScore > model.threshold * 1.5) severity = "medium"

    return {
      isAnomaly,
      score: zScore / model.threshold, // Normalized score
      confidence,
      explanation: `Value ${currentValue.toFixed(2)} is ${zScore.toFixed(2)} standard deviations from mean ${meanValue.toFixed(2)}`,
      severity,
    }
  }

  private isolationForestDetection(
    historicalData: MetricPoint[],
    currentValue: number,
    model: AnomalyDetectionModel,
  ): AnomalyResult {
    // Simplified Isolation Forest implementation
    const values = historicalData.map((point) => point.value)
    const sortedValues = [...values].sort((a, b) => a - b)

    // Calculate isolation score based on position in sorted array
    const position = this.findInsertPosition(sortedValues, currentValue)
    const normalizedPosition = position / sortedValues.length

    // Values at extremes (close to 0 or 1) are more likely to be anomalies
    const extremeScore = Math.min(normalizedPosition, 1 - normalizedPosition) * 2

    // Isolation score (inverted - lower means more isolated/anomalous)
    const isolationScore = 1 - extremeScore

    const isAnomaly = isolationScore > model.threshold
    const confidence = isolationScore

    let severity: "low" | "medium" | "high" | "critical" = "low"
    if (isolationScore > 0.9) severity = "critical"
    else if (isolationScore > 0.8) severity = "high"
    else if (isolationScore > 0.7) severity = "medium"

    return {
      isAnomaly,
      score: isolationScore,
      confidence,
      explanation: `Isolation score: ${isolationScore.toFixed(3)} (threshold: ${model.threshold})`,
      severity,
    }
  }

  private findInsertPosition(sortedArray: number[], value: number): number {
    let left = 0
    let right = sortedArray.length

    while (left < right) {
      const mid = Math.floor((left + right) / 2)
      if (sortedArray[mid] < value) {
        left = mid + 1
      } else {
        right = mid
      }
    }

    return left
  }

  public trainModel(metric: string, modelType: string, parameters?: Record<string, any>): boolean {
    const historicalData = this.historicalData.get(metric)
    if (!historicalData || historicalData.length < 50) {
      console.warn(`Insufficient data to train model for metric: ${metric}`)
      return false
    }

    // In a real implementation, this would train ML models
    // For now, we'll just update model parameters based on historical data
    const model = this.models.get(modelType)
    if (!model) return false

    const values = historicalData.map((point) => point.value)
    const stdDev = standardDeviation(values)
    const meanValue = mean(values)

    // Adjust threshold based on data characteristics
    if (model.type === "statistical") {
      // Use IQR method for threshold adjustment
      const q1 = quantile(values, 0.25)
      const q3 = quantile(values, 0.75)
      const iqr = q3 - q1
      const adaptiveThreshold = 1.5 * (iqr / stdDev) // Adjust based on data distribution

      model.threshold = Math.max(2.0, Math.min(4.0, adaptiveThreshold))
    }

    console.log(`✅ Model ${modelType} trained for metric ${metric}`)
    return true
  }

  public getModelPerformance(metric: string, modelType: string): Record<string, number> {
    const historicalData = this.historicalData.get(metric) || []
    if (historicalData.length < 20) {
      return { accuracy: 0, precision: 0, recall: 0, f1Score: 0 }
    }

    // Simulate performance metrics (in real implementation, use labeled data)
    const model = this.models.get(modelType)
    if (!model) return { accuracy: 0, precision: 0, recall: 0, f1Score: 0 }

    // Mock performance based on model sensitivity and data characteristics
    const baseAccuracy = 0.85 + model.sensitivity * 0.1
    const precision = baseAccuracy * 0.9
    const recall = baseAccuracy * 0.95
    const f1Score = (2 * precision * recall) / (precision + recall)

    return {
      accuracy: baseAccuracy,
      precision,
      recall,
      f1Score,
    }
  }

  public getAnomalyTrends(metric: string, hours = 24): Array<{ timestamp: Date; anomalyScore: number }> {
    const historicalData = this.historicalData.get(metric) || []
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)

    return historicalData
      .filter((point) => point.timestamp >= cutoffTime)
      .map((point) => {
        const result = this.detectAnomaly(metric, point.value)
        return {
          timestamp: point.timestamp,
          anomalyScore: result.score,
        }
      })
  }
}

// Singleton instance
export const anomalyDetector = new AnomalyDetector()
