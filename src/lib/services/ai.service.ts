/**
 * @file ai.service.ts
 * @description AI service for risk assessment, kit building, pricing, demand forecasting, and chatbot
 * @module services/ai
 */

import { prisma } from '@/lib/db/prisma'
import { EventBus } from '@/lib/events/event-bus'
import { AuditService } from './audit.service'
import { NotFoundError, ValidationError } from '@/lib/errors'
import type {
  RiskAssessment,
  RiskFactor,
  DepositSuggestion,
  EquipmentRecommendation,
  KitBundle,
  KitEquipment,
  DemandForecast,
  PricingSuggestion,
  ChatbotResponse,
  AIConfig,
} from '@/lib/types/ai.types'
import OpenAI from 'openai'

export class AIService {
  private static openaiClient: OpenAI | null = null

  /**
   * Initialize OpenAI client
   */
  private static getOpenAIClient(): OpenAI | null {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return null
    }
    if (!this.openaiClient) {
      this.openaiClient = new OpenAI({ apiKey })
    }
    return this.openaiClient
  }

  /**
   * Assess booking risk using AI
   */
  static async assessRisk(input: {
    bookingId?: string
    customerId?: string
    equipmentIds: string[]
    rentalDuration: number
    totalValue: number
    customerHistory?: 'excellent' | 'good' | 'fair' | 'poor' | 'new'
  }): Promise<RiskAssessment> {
    // Fetch customer history if customerId provided
    let customerHistory: 'excellent' | 'good' | 'fair' | 'poor' | 'new' = input.customerHistory || 'new'
    let totalBookings = 0
    let completedBookings = 0
    let cancelledBookings = 0
    let totalSpent = 0

    if (input.customerId) {
      const bookings = await prisma.booking.findMany({
        where: { customerId: input.customerId },
        select: {
          status: true,
          totalAmount: true,
        },
      })

      totalBookings = bookings.length
      completedBookings = bookings.filter((b) => b.status === 'CLOSED').length
      cancelledBookings = bookings.filter((b) => b.status === 'CANCELLED').length
      totalSpent = bookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0)

      // Determine history rating
      if (totalBookings === 0) {
        customerHistory = 'new'
      } else if (completedBookings / totalBookings >= 0.9 && cancelledBookings === 0) {
        customerHistory = 'excellent'
      } else if (completedBookings / totalBookings >= 0.7 && cancelledBookings <= 1) {
        customerHistory = 'good'
      } else if (completedBookings / totalBookings >= 0.5) {
        customerHistory = 'fair'
      } else {
        customerHistory = 'poor'
      }
    }

    // Calculate risk score (0-100)
    let riskScore = 50 // Base score

    // Factor 1: Customer history (0-30 points)
    const historyFactors: Record<string, number> = {
      excellent: -20,
      good: -10,
      fair: 0,
      poor: 15,
      new: 10,
    }
    riskScore += historyFactors[customerHistory] || 0

    // Factor 2: Rental duration (0-20 points)
    if (input.rentalDuration > 30) {
      riskScore += 15 // Long rentals are riskier
    } else if (input.rentalDuration > 14) {
      riskScore += 8
    } else if (input.rentalDuration > 7) {
      riskScore += 3
    }

    // Factor 3: Total value (0-25 points)
    if (input.totalValue > 100000) {
      riskScore += 20 // Very high value
    } else if (input.totalValue > 50000) {
      riskScore += 12
    } else if (input.totalValue > 20000) {
      riskScore += 6
    }

    // Factor 4: Booking history (0-15 points)
    if (totalBookings === 0) {
      riskScore += 10 // New customer
    } else if (cancelledBookings > totalBookings * 0.3) {
      riskScore += 12 // High cancellation rate
    }

    // Factor 5: Equipment count (0-10 points)
    if (input.equipmentIds.length > 10) {
      riskScore += 8 // Many items
    } else if (input.equipmentIds.length > 5) {
      riskScore += 4
    }

    // Clamp score to 0-100
    riskScore = Math.max(0, Math.min(100, riskScore))

    // Determine risk level
    let level: 'low' | 'medium' | 'high' | 'critical'
    let recommendation: 'approve' | 'review' | 'reject' | 'require_deposit'
    let requiresApproval = false

    if (riskScore >= 80) {
      level = 'critical'
      recommendation = 'reject'
      requiresApproval = true
    } else if (riskScore >= 60) {
      level = 'high'
      recommendation = 'require_deposit'
      requiresApproval = true
    } else if (riskScore >= 40) {
      level = 'medium'
      recommendation = 'review'
      requiresApproval = false
    } else {
      level = 'low'
      recommendation = 'approve'
      requiresApproval = false
    }

    const factors = [
      {
        name: 'Customer History',
        weight: 30,
        impact: customerHistory === 'excellent' || customerHistory === 'good' ? 'positive' : 'negative',
        description: `Customer has ${customerHistory} booking history (${totalBookings} total bookings, ${completedBookings} completed, ${cancelledBookings} cancelled)`,
      },
      {
        name: 'Rental Duration',
        weight: 20,
        impact: input.rentalDuration > 14 ? 'negative' : 'neutral',
        description: `Rental duration: ${input.rentalDuration} days`,
      },
      {
        name: 'Total Value',
        weight: 25,
        impact: input.totalValue > 50000 ? 'negative' : 'neutral',
        description: `Total equipment value: ${input.totalValue.toLocaleString()} SAR`,
      },
      {
        name: 'Booking History',
        weight: 15,
        impact: totalBookings === 0 ? 'negative' : 'positive',
        description: `${totalBookings} previous bookings`,
      },
      {
        name: 'Equipment Count',
        weight: 10,
        impact: input.equipmentIds.length > 10 ? 'negative' : 'neutral',
        description: `${input.equipmentIds.length} equipment items`,
      },
    ] as RiskFactor[]

    const reasoning = `Risk assessment based on customer history (${customerHistory}), rental duration (${input.rentalDuration} days), total value (${input.totalValue.toLocaleString()} SAR), and ${input.equipmentIds.length} equipment items.`

    // Get suggested deposit
    const depositSuggestion = await this.suggestDeposit({
      equipmentValue: input.totalValue,
      customerHistory,
      rentalDuration: input.rentalDuration,
      riskScore,
    })

    return {
      score: riskScore,
      level,
      factors,
      recommendation,
      reasoning,
      suggestedDeposit: depositSuggestion.amount,
      requiresApproval,
    }
  }

  /**
   * Suggest deposit amount
   */
  static async suggestDeposit(input: {
    equipmentValue: number
    customerHistory: 'excellent' | 'good' | 'fair' | 'poor' | 'new'
    rentalDuration: number
    riskScore: number
  }): Promise<DepositSuggestion> {
    let basePercentage = 30 // Base 30% deposit

    // Adjust based on customer history
    const historyAdjustments: Record<string, number> = {
      excellent: -10,
      good: -5,
      fair: 0,
      poor: 10,
      new: 5,
    }
    basePercentage += historyAdjustments[input.customerHistory] || 0

    // Adjust based on rental duration
    if (input.rentalDuration > 30) {
      basePercentage += 10
    } else if (input.rentalDuration > 14) {
      basePercentage += 5
    }

    // Adjust based on risk score
    if (input.riskScore >= 70) {
      basePercentage += 20
    } else if (input.riskScore >= 50) {
      basePercentage += 10
    }

    // Clamp between 20% and 80%
    basePercentage = Math.max(20, Math.min(80, basePercentage))

    const amount = (input.equipmentValue * basePercentage) / 100

    const reasoning = `Suggested deposit of ${basePercentage}% (${amount.toLocaleString()} SAR) based on customer history (${input.customerHistory}), rental duration (${input.rentalDuration} days), and risk score (${input.riskScore}).`

    return {
      amount,
      percentage: basePercentage,
      reasoning,
      factors: {
        equipmentValue: input.equipmentValue,
        customerHistory: input.customerHistory,
        rentalDuration: input.rentalDuration,
        riskScore: input.riskScore,
      },
    }
  }

  /**
   * Recommend alternative equipment
   */
  static async recommendAlternatives(input: {
    unavailableEquipmentId: string
    projectType?: string
    budget?: number
    requirements?: string[]
  }): Promise<EquipmentRecommendation[]> {
    const unavailableEquipment = await prisma.equipment.findUnique({
      where: { id: input.unavailableEquipmentId },
      include: { category: true },
    })

    if (!unavailableEquipment) {
      throw new NotFoundError('Equipment not found')
    }

    // Find similar equipment in same category
    const alternatives = await prisma.equipment.findMany({
      where: {
        categoryId: unavailableEquipment.categoryId,
        id: { not: input.unavailableEquipmentId },
        isActive: true,
        quantityAvailable: { gt: 0 },
      },
      include: { category: true, brand: true },
      take: 10,
    })

    const recommendations: EquipmentRecommendation[] = alternatives.map((eq) => {
      const dailyPrice = Number(eq.dailyPrice || 0)
      const unavailablePrice = Number(unavailableEquipment.dailyPrice || 0)
      const priceDifference = dailyPrice - unavailablePrice

      // Calculate match score (0-100)
      let matchScore = 50 // Base score

      // Same category = +30
      if (eq.categoryId === unavailableEquipment.categoryId) {
        matchScore += 30
      }

      // Similar price = +20
      const priceDiffPercent = Math.abs(priceDifference / unavailablePrice)
      if (priceDiffPercent < 0.1) {
        matchScore += 20
      } else if (priceDiffPercent < 0.3) {
        matchScore += 10
      }

      // Same brand = +10
      if (eq.brandId === unavailableEquipment.brandId) {
        matchScore += 10
      }

      matchScore = Math.min(100, matchScore)

      const reasons: string[] = []
      if (eq.categoryId === unavailableEquipment.categoryId) {
        reasons.push('Same category')
      }
      if (eq.brandId === unavailableEquipment.brandId) {
        reasons.push('Same brand')
      }
      if (priceDiffPercent < 0.3) {
        reasons.push('Similar price')
      }

      let compatibility: 'exact' | 'compatible' | 'alternative' = 'alternative'
      if (matchScore >= 80) {
        compatibility = 'exact'
      } else if (matchScore >= 60) {
        compatibility = 'compatible'
      }

      return {
        equipmentId: eq.id,
        equipmentName: eq.sku || 'Unknown',
        sku: eq.sku,
        matchScore,
        reasons,
        compatibility,
        priceDifference,
      }
    })

    // Sort by match score descending
    recommendations.sort((a, b) => b.matchScore - a.matchScore)

    return recommendations.slice(0, 5) // Return top 5
  }

  /**
   * Build equipment kit using AI
   */
  static async buildKit(input: {
    projectType: string
    useCase?: string
    budget?: number
    duration: number
    requirements?: string[]
    excludeEquipmentIds?: string[]
  }): Promise<KitBundle[]> {
    // Get all active equipment
    const allEquipment = await prisma.equipment.findMany({
      where: {
        isActive: true,
        quantityAvailable: { gt: 0 },
        ...(input.excludeEquipmentIds && input.excludeEquipmentIds.length > 0
          ? { id: { notIn: input.excludeEquipmentIds } }
          : {}),
      },
      include: { category: true, brand: true },
      take: 100, // Limit for performance
    })

    // Simple kit building logic (can be enhanced with AI)
    const kits: KitBundle[] = []

    // Kit 1: Basic Kit
    const basicKit: KitBundle = {
      id: 'kit-1',
      name: `Basic ${input.projectType} Kit`,
      description: `Essential equipment for ${input.projectType} projects`,
      equipment: [],
      totalPrice: 0,
      projectType: [input.projectType],
      useCase: input.useCase,
      reasoning: 'Curated based on project type and common requirements',
    }

    // Select equipment based on project type
    const selectedEquipment = allEquipment.slice(0, 5).map((eq, index) => {
      const dailyPrice = Number(eq.dailyPrice || 0)
      basicKit.totalPrice += dailyPrice * input.duration
      return {
        equipmentId: eq.id,
        equipmentName: eq.sku || 'Unknown',
        sku: eq.sku,
        quantity: 1,
        dailyPrice,
        role: index === 0 ? 'primary' : index < 3 ? 'support' : 'optional',
        reason: `Essential for ${input.projectType} projects`,
      }
    })

    basicKit.equipment = selectedEquipment as KitEquipment[]
    kits.push(basicKit)

    // Kit 2: Professional Kit (if budget allows)
    if (input.budget && basicKit.totalPrice * 1.5 <= input.budget) {
      const professionalKit: KitBundle = {
        id: 'kit-2',
        name: `Professional ${input.projectType} Kit`,
        description: `Complete professional setup for ${input.projectType} projects`,
        equipment: [],
        totalPrice: 0,
        discount: 10,
        projectType: [input.projectType],
        useCase: input.useCase,
        reasoning: 'Professional-grade equipment bundle with 10% discount',
      }

      const proEquipment = allEquipment.slice(0, 8).map((eq, index) => {
        const dailyPrice = Number(eq.dailyPrice || 0)
        professionalKit.totalPrice += dailyPrice * input.duration
        return {
          equipmentId: eq.id,
          equipmentName: eq.sku || 'Unknown',
          sku: eq.sku,
          quantity: 1,
          dailyPrice,
          role: index < 3 ? 'primary' : index < 6 ? 'support' : 'optional',
          reason: `Professional-grade equipment for ${input.projectType}`,
        }
      })

      professionalKit.equipment = proEquipment as KitEquipment[]
      professionalKit.savings = (professionalKit.totalPrice * professionalKit.discount!) / 100
      professionalKit.totalPrice = professionalKit.totalPrice - professionalKit.savings
      kits.push(professionalKit)
    }

    return kits
  }

  /**
   * Generate pricing suggestions
   */
  static async suggestPricing(input: {
    equipmentId: string
    currentPrice: number
    marketData?: Record<string, unknown>
  }): Promise<PricingSuggestion> {
    const equipment = await prisma.equipment.findUnique({
      where: { id: input.equipmentId },
      include: { category: true },
    })

    if (!equipment) {
      throw new NotFoundError('Equipment not found')
    }

    // Get booking history for utilization rate
    const bookings = await prisma.bookingEquipment.findMany({
      where: {
        equipmentId: input.equipmentId,
        booking: {
          status: { in: ['CONFIRMED', 'ACTIVE', 'RETURNED', 'CLOSED'] },
        },
      },
      include: { booking: true },
    })

    const totalDays = bookings.reduce((sum, be) => {
      const booking = be.booking
      const start = new Date(booking.startDate)
      const end = new Date(booking.endDate)
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      return sum + days * be.quantity
    }, 0)

    // Calculate utilization rate (simplified)
    const daysSinceCreation = Math.max(
      1,
      Math.ceil((Date.now() - equipment.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    )
    const utilizationRate = Math.min(100, (totalDays / daysSinceCreation) * 100)

    // Determine demand level
    let demandLevel: 'high' | 'medium' | 'low' = 'medium'
    if (utilizationRate > 70) {
      demandLevel = 'high'
    } else if (utilizationRate < 30) {
      demandLevel = 'low'
    }

    // Calculate suggested price
    let suggestedPrice = input.currentPrice
    let change = 0
    let reasoning = ''

    if (demandLevel === 'high' && utilizationRate > 80) {
      // Increase price if high demand
      suggestedPrice = input.currentPrice * 1.1
      change = 10
      reasoning = 'High demand and utilization rate suggests price increase'
    } else if (demandLevel === 'low' && utilizationRate < 20) {
      // Decrease price if low demand
      suggestedPrice = input.currentPrice * 0.9
      change = -10
      reasoning = 'Low demand and utilization rate suggests price decrease'
    } else {
      reasoning = 'Current pricing is appropriate based on demand and utilization'
    }

    // Clamp to reasonable bounds
    suggestedPrice = Math.max(input.currentPrice * 0.7, Math.min(input.currentPrice * 1.3, suggestedPrice))
    change = ((suggestedPrice - input.currentPrice) / input.currentPrice) * 100

    return {
      equipmentId: input.equipmentId,
      currentPrice: input.currentPrice,
      suggestedPrice: Math.round(suggestedPrice * 100) / 100,
      change: Math.round(change * 10) / 10,
      reasoning,
      factors: {
        marketPrice: input.currentPrice,
        demandLevel,
        utilizationRate: Math.round(utilizationRate * 10) / 10,
        seasonality: 1.0, // Placeholder
      },
      confidence: 75, // Base confidence
    }
  }

  /**
   * Forecast equipment demand
   */
  static async forecastDemand(input: {
    equipmentId?: string
    period: 'week' | 'month' | 'quarter' | 'year'
    startDate?: Date
  }): Promise<DemandForecast[]> {
    const startDate = input.startDate || new Date()
    const forecasts: DemandForecast[] = []

    // Get equipment to forecast
    const equipmentList = input.equipmentId
      ? [await prisma.equipment.findUnique({ where: { id: input.equipmentId } })]
      : await prisma.equipment.findMany({ where: { isActive: true }, take: 50 })

    const validEquipment = equipmentList.filter((eq): eq is NonNullable<typeof eq> => eq !== null)

    for (const equipment of validEquipment) {
      // Get historical bookings
      const historicalBookings = await prisma.bookingEquipment.findMany({
        where: {
          equipmentId: equipment.id,
          booking: {
            status: { in: ['CONFIRMED', 'ACTIVE', 'RETURNED', 'CLOSED'] },
            startDate: { gte: new Date(startDate.getTime() - 90 * 24 * 60 * 60 * 1000) }, // Last 90 days
          },
        },
        include: { booking: true },
      })

      // Calculate historical demand
      const totalBookings = historicalBookings.length
      const avgBookingsPerMonth = (totalBookings / 3) * (input.period === 'week' ? 0.25 : input.period === 'month' ? 1 : input.period === 'quarter' ? 3 : 12)

      // Simple prediction (can be enhanced with ML)
      const predictedDemand = Math.round(avgBookingsPerMonth * 1.1) // 10% growth assumption

      // Determine trend
      const recentBookings = historicalBookings.filter(
        (be) => be.booking.startDate >= new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000)
      ).length
      const olderBookings = totalBookings - recentBookings

      let historicalTrend: 'increasing' | 'stable' | 'decreasing' = 'stable'
      if (recentBookings > olderBookings * 1.2) {
        historicalTrend = 'increasing'
      } else if (recentBookings < olderBookings * 0.8) {
        historicalTrend = 'decreasing'
      }

      const forecast: DemandForecast = {
        equipmentId: equipment.id,
        equipmentName: equipment.sku || 'Unknown',
        sku: equipment.sku,
        period: input.period,
        predictedDemand,
        confidence: totalBookings > 10 ? 80 : totalBookings > 5 ? 60 : 40,
        factors: {
          historicalTrend,
          seasonalFactor: 1.0, // Placeholder
          marketTrend: historicalTrend === 'increasing' ? 'up' : historicalTrend === 'decreasing' ? 'down' : 'stable',
          competitorActivity: 'medium', // Placeholder
        },
        recommendations: {
          inventoryLevel: predictedDemand > 10 ? 'increase' : predictedDemand > 5 ? 'maintain' : 'decrease',
          purchaseSuggestion: predictedDemand > 15,
          pricingSuggestion: predictedDemand > 10 ? 'increase' : predictedDemand < 3 ? 'decrease' : 'maintain',
        },
        revenueForecast: predictedDemand * Number(equipment.dailyPrice || 0) * 7, // Estimate
      }

      forecasts.push(forecast)
    }

    return forecasts
  }

  /**
   * Chatbot response
   */
  static async chat(input: {
    message: string
    conversationId?: string
    context?: Record<string, unknown>
  }): Promise<ChatbotResponse> {
    const client = this.getOpenAIClient()
    const message = input.message.toLowerCase()

    // Simple rule-based responses (can be enhanced with OpenAI)
    let response = ''
    let suggestions: string[] = []
    let actions: ChatbotResponse['actions'] = []
    let requiresHuman = false
    let confidence = 70

    if (message.includes('price') || message.includes('cost') || message.includes('how much')) {
      response = 'I can help you find equipment pricing. Would you like to search for specific equipment?'
      suggestions = ['Search equipment', 'View pricing', 'Get a quote']
      actions = [
        {
          type: 'price_inquiry',
          label: 'View Equipment Prices',
        },
      ]
      confidence = 85
    } else if (message.includes('available') || message.includes('book') || message.includes('rent')) {
      response = 'I can help you check equipment availability and create a booking. What equipment are you looking for?'
      suggestions = ['Check availability', 'Create booking', 'View equipment']
      actions = [
        {
          type: 'availability_check',
          label: 'Check Availability',
        },
        {
          type: 'booking_creation',
          label: 'Create Booking',
        },
      ]
      confidence = 80
    } else if (message.includes('equipment') || message.includes('camera') || message.includes('lens')) {
      response = 'I can help you find equipment. What type of equipment are you looking for?'
      suggestions = ['Search equipment', 'Browse categories', 'View featured equipment']
      actions = [
        {
          type: 'equipment_search',
          label: 'Search Equipment',
        },
      ]
      confidence = 75
    } else if (message.includes('help') || message.includes('support')) {
      response = 'I can help you with equipment search, pricing, availability, and bookings. What do you need help with?'
      suggestions = ['Equipment search', 'Pricing information', 'Booking help', 'Contact support']
      actions = [
        {
          type: 'support_ticket',
          label: 'Create Support Ticket',
        },
      ]
      confidence = 90
    } else {
      // Use OpenAI if available, otherwise generic response
      if (client) {
        try {
          const completion = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content:
                  'You are a helpful assistant for FlixCam.rent, a cinematic equipment rental platform in Saudi Arabia. Help users with equipment search, pricing, availability, and bookings. Be concise and friendly.',
              },
              {
                role: 'user',
                content: input.message,
              },
            ],
            max_tokens: 200,
            temperature: 0.7,
          })

          response = completion.choices[0]?.message?.content || 'I apologize, I could not generate a response.'
          confidence = 80
        } catch (error) {
          console.error('OpenAI API error:', error)
          response = 'I apologize, I am having trouble processing your request. Please try rephrasing or contact support.'
          requiresHuman = true
          confidence = 30
        }
      } else {
        response = 'I can help you with equipment search, pricing, availability, and bookings. How can I assist you today?'
        suggestions = ['Search equipment', 'View pricing', 'Check availability', 'Create booking']
        confidence = 50
      }
    }

    return {
      message: response,
      suggestions,
      actions,
      requiresHuman,
      confidence,
    }
  }

  /**
   * Get AI configuration
   */
  static async getConfig(): Promise<AIConfig> {
    // Get from feature flags or env
    const provider = (process.env.AI_PROVIDER as 'openai' | 'gemini' | 'anthropic') || 'openai'
    const model = process.env.AI_MODEL || 'gpt-4o-mini'
    const enabled = !!process.env.OPENAI_API_KEY

    return {
      provider,
      model,
      temperature: 0.7,
      maxTokens: 1000,
      enabled,
    }
  }
}
