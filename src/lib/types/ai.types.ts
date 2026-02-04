/**
 * @file ai.types.ts
 * @description TypeScript types for AI features
 * @module types/ai
 */

export interface RiskAssessment {
  score: number // 0-100
  level: 'low' | 'medium' | 'high' | 'critical'
  factors: RiskFactor[]
  recommendation: 'approve' | 'review' | 'reject' | 'require_deposit'
  reasoning: string
  suggestedDeposit?: number
  requiresApproval?: boolean
}

export interface RiskFactor {
  name: string
  weight: number
  impact: 'positive' | 'negative' | 'neutral'
  description: string
}

export interface DepositSuggestion {
  amount: number
  percentage: number // Percentage of equipment value
  reasoning: string
  factors: {
    equipmentValue: number
    customerHistory: 'excellent' | 'good' | 'fair' | 'poor' | 'new'
    rentalDuration: number
    riskScore: number
  }
}

export interface EquipmentRecommendation {
  equipmentId: string
  equipmentName: string
  sku: string
  matchScore: number // 0-100
  reasons: string[]
  compatibility: 'exact' | 'compatible' | 'alternative'
  priceDifference?: number
}

export interface KitBundle {
  id: string
  name: string
  description: string
  equipment: KitEquipment[]
  totalPrice: number
  discount?: number
  savings?: number
  projectType?: string[]
  useCase?: string
  reasoning: string
}

export interface KitEquipment {
  equipmentId: string
  equipmentName: string
  sku: string
  quantity: number
  dailyPrice: number
  role: 'primary' | 'support' | 'optional'
  reason: string
}

export interface DemandForecast {
  equipmentId: string
  equipmentName: string
  sku: string
  period: 'week' | 'month' | 'quarter' | 'year'
  predictedDemand: number
  confidence: number // 0-100
  factors: {
    historicalTrend: 'increasing' | 'stable' | 'decreasing'
    seasonalFactor: number
    marketTrend: 'up' | 'down' | 'stable'
    competitorActivity: 'high' | 'medium' | 'low'
  }
  recommendations: {
    inventoryLevel: 'increase' | 'maintain' | 'decrease'
    purchaseSuggestion?: boolean
    pricingSuggestion?: 'increase' | 'decrease' | 'maintain'
  }
  revenueForecast?: number
}

export interface PricingSuggestion {
  equipmentId: string
  currentPrice: number
  suggestedPrice: number
  change: number // Percentage change
  reasoning: string
  factors: {
    marketPrice: number
    competitorPrice?: number
    demandLevel: 'high' | 'medium' | 'low'
    utilizationRate: number
    seasonality: number
  }
  confidence: number
}

export interface ChatbotMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    intent?: string
    entities?: Record<string, unknown>
    confidence?: number
    requiresHuman?: boolean
  }
}

export interface ChatbotResponse {
  message: string
  suggestions?: string[]
  actions?: ChatbotAction[]
  requiresHuman?: boolean
  confidence: number
}

export interface ChatbotAction {
  type: 'equipment_search' | 'booking_creation' | 'price_inquiry' | 'availability_check' | 'support_ticket'
  data?: Record<string, unknown>
  label: string
}

export interface AIConfig {
  provider: 'openai' | 'gemini' | 'anthropic'
  model: string
  temperature?: number
  maxTokens?: number
  enabled: boolean
}

export interface AIRequest {
  type: 'risk_assessment' | 'kit_builder' | 'pricing' | 'demand_forecast' | 'chatbot' | 'equipment_recommendation'
  input: Record<string, unknown>
  userId: string
  metadata?: Record<string, unknown>
}

export interface AIResponse {
  success: boolean
  data?: unknown
  error?: string
  usage?: {
    tokens?: number
    cost?: number
  }
  timestamp: Date
}
