/**
 * @file ai.service.ts
 * @description AI service for risk assessment, kit building, pricing, demand forecasting, and chatbot
 * @module services/ai
 */

import { prisma } from '@/lib/db/prisma'
import { EventBus } from '@/lib/events/event-bus'
import { AuditService } from './audit.service'
import { ShootTypeService } from './shoot-type.service'
import { getSpecValue, getSpecArray } from '@/lib/utils/specifications.utils'
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
import { GoogleGenerativeAI } from '@google/generative-ai'

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

  /** Gemini API key (GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY). */
  private static getGeminiApiKey(): string | null {
    return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? null
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
   * Get equipment in target category that is compatible with selected equipment (e.g. lenses matching camera mount).
   * Uses specifications.lensMount on cameras and specifications.lensMount / compatibleMounts on lenses.
   */
  static async getCompatibleEquipment(input: {
    selectedEquipmentIds: string[]
    targetCategoryId: string
  }): Promise<{ id: string; sku: string; model: string | null; dailyPrice: number; categoryId: string; category: { name: string; slug: string }; brand: { name: string; slug: string } | null; media: { url: string; type: string }[]; matchingCameraModels?: string[] }[]> {
    if (input.selectedEquipmentIds.length === 0) {
      const allInCategory = await prisma.equipment.findMany({
        where: {
          categoryId: input.targetCategoryId,
          isActive: true,
          deletedAt: null,
          quantityAvailable: { gt: 0 },
        },
        select: {
          id: true,
          sku: true,
          model: true,
          dailyPrice: true,
          categoryId: true,
          specifications: true,
          category: { select: { name: true, slug: true } },
          brand: { select: { name: true, slug: true } },
          media: { select: { url: true, type: true } },
        },
      })
      return allInCategory.map((e) => ({
        id: e.id,
        sku: e.sku,
        model: e.model,
        dailyPrice: Number(e.dailyPrice),
        categoryId: e.categoryId,
        category: e.category,
        brand: e.brand,
        media: e.media,
      }))
    }

    const targetCategory = await prisma.category.findUnique({
      where: { id: input.targetCategoryId },
      select: { slug: true },
    })
    if (!targetCategory) return []

    const selected = await prisma.equipment.findMany({
      where: { id: { in: input.selectedEquipmentIds }, deletedAt: null },
      select: { id: true, model: true, categoryId: true, category: { select: { slug: true } }, specifications: true },
    })

    const mounts = new Set<string>()
    const mountToModels: Map<string, string[]> = new Map()
    for (const eq of selected) {
      const spec = eq.specifications
      const modelName = eq.model ?? eq.id
      const lensMount = getSpecValue(spec, 'lensMount') ?? getSpecValue(spec, 'mount')
      if (lensMount) {
        const m = String(lensMount).trim()
        mounts.add(m)
        if (!mountToModels.has(m)) mountToModels.set(m, [])
        if (!mountToModels.get(m)!.includes(modelName)) mountToModels.get(m)!.push(modelName)
      }
      const compatibleMounts = getSpecArray(spec, 'compatibleMounts')
      for (const m of compatibleMounts) {
        const key = m.trim()
        if (key) {
          mounts.add(key)
          if (!mountToModels.has(key)) mountToModels.set(key, [])
          if (!mountToModels.get(key)!.includes(modelName)) mountToModels.get(key)!.push(modelName)
        }
      }
    }

    if (targetCategory.slug !== 'lenses' || mounts.size === 0) {
      const allInCategory = await prisma.equipment.findMany({
        where: {
          categoryId: input.targetCategoryId,
          isActive: true,
          deletedAt: null,
          quantityAvailable: { gt: 0 },
        },
        select: {
          id: true,
          sku: true,
          model: true,
          dailyPrice: true,
          categoryId: true,
          category: { select: { name: true, slug: true } },
          brand: { select: { name: true, slug: true } },
          media: { select: { url: true, type: true } },
        },
      })
      return allInCategory.map((e) => ({
        id: e.id,
        sku: e.sku,
        model: e.model,
        dailyPrice: Number(e.dailyPrice),
        categoryId: e.categoryId,
        category: e.category,
        brand: e.brand,
        media: e.media,
      }))
    }

    const candidates = await prisma.equipment.findMany({
      where: {
        categoryId: input.targetCategoryId,
        isActive: true,
        deletedAt: null,
        quantityAvailable: { gt: 0 },
      },
      select: {
        id: true,
        sku: true,
        model: true,
        dailyPrice: true,
        categoryId: true,
        specifications: true,
        category: { select: { name: true, slug: true } },
        brand: { select: { name: true, slug: true } },
        media: { select: { url: true, type: true } },
      },
    })

    const matchingModelsForLens = (e: (typeof candidates)[0]): string[] => {
      const spec = e.specifications
      const lensMount = (getSpecValue(spec, 'lensMount') ?? getSpecValue(spec, 'mount'))?.trim() ?? null
      const compatibleMounts = getSpecArray(spec, 'compatibleMounts').map((m) => m.trim())
      const models: string[] = []
      if (lensMount && mountToModels.has(lensMount)) models.push(...mountToModels.get(lensMount)!)
      for (const m of compatibleMounts) {
        if (mountToModels.has(m)) {
          for (const name of mountToModels.get(m)!) {
            if (!models.includes(name)) models.push(name)
          }
        }
      }
      return models
    }

    const compatible = candidates.filter((e) => {
      const spec = e.specifications
      const lensMount = (getSpecValue(spec, 'lensMount') ?? getSpecValue(spec, 'mount'))?.trim() ?? null
      const compatibleMounts = getSpecArray(spec, 'compatibleMounts').map((m) => m.trim())
      if (lensMount && mounts.has(lensMount)) return true
      return compatibleMounts.some((m) => mounts.has(m))
    })

    return compatible.map((e) => {
      const matchingCameraModels = matchingModelsForLens(e)
      return {
        id: e.id,
        sku: e.sku,
        model: e.model,
        dailyPrice: Number(e.dailyPrice),
        categoryId: e.categoryId,
        category: e.category,
        brand: e.brand,
        media: e.media,
        ...(matchingCameraModels.length > 0 && { matchingCameraModels }),
      }
    })
  }

  /**
   * Build equipment kit / suggestions using shoot type recommendations, optional OpenAI.
   * When shootTypeId or shootTypeSlug is provided, uses ShootTypeRecommendation data as primary
   * source and filters by budgetTier; questionnaireAnswers can refine (e.g. outdoor = boost portable).
   * Falls back to rule-based first-N equipment when no shoot type or no OpenAI.
   */
  static async buildKit(input: {
    projectType: string
    useCase?: string
    budget?: number
    duration: number
    requirements?: string[]
    excludeEquipmentIds?: string[]
    shootTypeId?: string
    shootTypeSlug?: string
    budgetTier?: 'ESSENTIAL' | 'PROFESSIONAL' | 'PREMIUM'
    questionnaireAnswers?: Record<string, string | string[]>
  }): Promise<KitBundle[]> {
    const excludeSet =
      input.excludeEquipmentIds && input.excludeEquipmentIds.length > 0
        ? new Set(input.excludeEquipmentIds)
        : new Set<string>()

    // Prefer shoot-type-based suggestions when we have a shoot type
    const slug = input.shootTypeSlug ?? (input.shootTypeId ? undefined : null)
    const id = input.shootTypeId ?? null
    let shootTypeConfig: Awaited<ReturnType<typeof ShootTypeService.getBySlug>> = null
    if (slug) {
      shootTypeConfig = await ShootTypeService.getBySlug(slug)
    } else if (id) {
      try {
        shootTypeConfig = await ShootTypeService.getById(id)
      } catch {
        shootTypeConfig = null
      }
    }

    if (shootTypeConfig?.recommendations && Array.isArray(shootTypeConfig.recommendations)) {
      const tier = input.budgetTier ?? 'PROFESSIONAL'
      const recs = (shootTypeConfig.recommendations as Array<{
        equipmentId: string
        budgetTier: string
        reason: string | null
        defaultQuantity: number
        sortOrder: number
        equipment: {
          id: string
          sku: string
          model: string | null
          dailyPrice: number | { toNumber?: () => number }
        }
      }>)
        .filter((r) => !excludeSet.has(r.equipmentId))
        .filter((r) => !input.budgetTier || r.budgetTier === tier)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .slice(0, 15)

      const questionnaire = input.questionnaireAnswers ?? {}
      const isOutdoor =
        questionnaire['environment'] === 'outdoor' || questionnaire['environment'] === 'both'
      const isLargeCrew =
        questionnaire['crew_size'] === 'large' || questionnaire['crew_size'] === '4+'

      let equipment: KitEquipment[] = recs.map((r) => {
        const raw = r.equipment.dailyPrice
        const dailyPrice =
          typeof raw === 'object' && raw != null && 'toNumber' in raw
            ? (raw as { toNumber: () => number }).toNumber()
            : Number(raw)
        let reason = r.reason ?? `Recommended for ${shootTypeConfig!.name}`
        if (isOutdoor && reason.toLowerCase().includes('light')) {
          reason = `${reason} Portable and ideal for outdoor use.`
        }
        if (isLargeCrew && reason.toLowerCase().includes('audio')) {
          reason = `${reason} Suitable for larger crew setups.`
        }
        return {
          equipmentId: r.equipmentId,
          equipmentName: r.equipment.model ?? r.equipment.sku ?? 'Unknown',
          sku: r.equipment.sku,
          quantity: Math.max(1, r.defaultQuantity),
          dailyPrice,
          role: 'optional' as const,
          reason,
        }
      })

      if (equipment.length > 0) {
        const names = equipment.map((e) => e.equipmentName).join(', ')
        const prompt = `Shoot type: ${shootTypeConfig!.name}. Budget: ${input.budgetTier ?? 'any'}. In one short sentence per item, why add this to the kit. Reply with a JSON array of strings only, one per item in this exact order: ${names}. Example: ["Great for ceremony coverage", "Essential for b-roll"]`

        const parseReasons = (text: string): string[] | null => {
          const match = text.replace(/```json?\s*|\s*```/g, '').match(/\[[\s\S]*\]/)
          const arr = match ? (JSON.parse(match[0]) as string[]) : null
          return Array.isArray(arr) && arr.length === equipment.length ? arr : null
        }

        let enhanced = false

        const geminiKey = this.getGeminiApiKey()
        if (geminiKey) {
          try {
            const genAI = new GoogleGenerativeAI(geminiKey)
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
            const result = await model.generateContent(prompt)
            const text = result.response.text()?.trim()
            const arr = text ? parseReasons(text) : null
            if (arr) {
              equipment = equipment.map((e, i) => ({ ...e, reason: arr[i] ?? e.reason }))
              enhanced = true
            }
          } catch {
            // fall through to OpenAI or rule-based
          }
        }

        if (!enhanced) {
          const openai = this.getOpenAIClient()
          if (openai) {
            try {
              const res = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 300,
              })
              const text = res.choices[0]?.message?.content?.trim()
              const arr = text ? parseReasons(text) : null
              if (arr) {
                equipment = equipment.map((e, i) => ({ ...e, reason: arr[i] ?? e.reason }))
              }
            } catch {
              // keep rule-based reasons
            }
          }
        }
      }

      const totalPrice = equipment.reduce(
        (sum, e) => sum + e.dailyPrice * e.quantity * input.duration,
        0
      )
      const reasoning = input.questionnaireAnswers
        ? 'Personalized suggestions based on your shoot type and answers.'
        : `Based on ${shootTypeConfig.name} recommendations.`

      return [
        {
          id: 'suggestions',
          name: `Suggested additions for ${shootTypeConfig.name}`,
          description: reasoning,
          equipment,
          totalPrice,
          projectType: [input.projectType],
          useCase: input.useCase,
          reasoning,
        },
      ]
    }

    // Fallback: rule-based kit from all equipment
    const allEquipment = await prisma.equipment.findMany({
      where: {
        isActive: true,
        quantityAvailable: { gt: 0 },
        ...(excludeSet.size > 0 ? { id: { notIn: Array.from(excludeSet) } } : {}),
      },
      include: { category: true, brand: true },
      take: 100,
    })

    const kits: KitBundle[] = []
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

    const selectedEquipment = allEquipment.slice(0, 5).map((eq, index) => {
      const dailyPrice = Number(eq.dailyPrice || 0)
      basicKit.totalPrice += dailyPrice * input.duration
      return {
        equipmentId: eq.id,
        equipmentName: eq.sku || 'Unknown',
        sku: eq.sku,
        quantity: 1,
        dailyPrice,
        role: (index === 0 ? 'primary' : index < 3 ? 'support' : 'optional') as KitEquipment['role'],
        reason: `Essential for ${input.projectType} projects`,
      }
    })

    basicKit.equipment = selectedEquipment as KitEquipment[]
    kits.push(basicKit)

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
          role: (index < 3 ? 'primary' : index < 6 ? 'support' : 'optional') as KitEquipment['role'],
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
   * Extract product specifications from a product page text (e.g. from a URL).
   * Returns structured specs (groups, optional highlights, quickSpecs) for our equipment UI.
   */
  static async extractSpecificationsFromProductPage(
    pageText: string,
    categoryHint?: string
  ): Promise<{ groups: import('@/lib/types/specifications.types').SpecGroup[]; highlights?: import('@/lib/types/specifications.types').SpecHighlight[]; quickSpecs?: import('@/lib/types/specifications.types').QuickSpec[] }> {
    const categoryNote = categoryHint
      ? `Product category hint: ${categoryHint}. Use relevant group names (e.g. for lighting: Key Specs, Photometrics, Connectivity, Power & I/O, Mounting, Physical & General).`
      : 'Infer product type from the text and use appropriate group names (e.g. Key Specs, Body & Display, Connectivity, etc.).'

    const prompt = `You are extracting product specifications from a web page. Output valid JSON only, no markdown code fence.

${categoryNote}

Required output shape (strict):
{
  "highlights": [ { "icon": "star", "label": "Label", "value": "Value", "sublabel": "optional" } ],
  "quickSpecs": [ { "icon": "zap", "label": "Label", "value": "Value" } ],
  "groups": [
    {
      "label": "Group Name (English)",
      "labelAr": "اسم المجموعة (Arabic)",
      "icon": "star",
      "priority": 1,
      "specs": [
        { "key": "camelCaseKey", "label": "Spec Label", "labelAr": "التسمية", "value": "value text", "type": "text", "highlight": false }
      ]
    }
  ]
}

Rules:
- "groups" is required and must have at least one group. Each group has label, labelAr (optional), icon, priority (number), specs (array).
- Each spec has key (camelCase), label, value (required). Optional: labelAr, type ("text"|"boolean"|"range"|"colorTemp"), highlight (boolean).
- Icons: use only star, zap, sun, camera, video, monitor, wifi, ruler, hard-drive, gauge, info.
- Extract ALL specifications from the page. Use multiple groups (Key Specs, Photometrics, Connectivity, Power & I/O, Mounting, Physical/General, etc.) so nothing is missing.
- highlights: pick 3-4 most important specs for hero. quickSpecs: pick 4-6 for pills.
- Output only the JSON object, no other text.

Page text:
---
${pageText.slice(0, 18_000)}
---`

    const parseJson = (raw: string): unknown => {
      const cleaned = raw.replace(/```json?\s*|\s*```/g, '').trim()
      const match = cleaned.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('No JSON object in response')
      return JSON.parse(match[0]) as unknown
    }

    const geminiKey = this.getGeminiApiKey()
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
        const result = await model.generateContent(prompt)
        const text = result.response.text()?.trim()
        if (text) {
          const obj = parseJson(text) as { groups?: unknown[]; highlights?: unknown[]; quickSpecs?: unknown[] }
          if (Array.isArray(obj.groups) && obj.groups.length > 0) {
            return {
              groups: obj.groups as import('@/lib/types/specifications.types').SpecGroup[],
              highlights: Array.isArray(obj.highlights) ? (obj.highlights as import('@/lib/types/specifications.types').SpecHighlight[]) : undefined,
              quickSpecs: Array.isArray(obj.quickSpecs) ? (obj.quickSpecs as import('@/lib/types/specifications.types').QuickSpec[]) : undefined,
            }
          }
        }
      } catch {
        // fall through to OpenAI
      }
    }

    const openai = this.getOpenAIClient()
    if (openai) {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
      })
      const text = res.choices[0]?.message?.content?.trim()
      if (text) {
        const obj = parseJson(text) as { groups?: unknown[]; highlights?: unknown[]; quickSpecs?: unknown[] }
        if (Array.isArray(obj.groups) && obj.groups.length > 0) {
          return {
            groups: obj.groups as import('@/lib/types/specifications.types').SpecGroup[],
            highlights: Array.isArray(obj.highlights) ? (obj.highlights as import('@/lib/types/specifications.types').SpecHighlight[]) : undefined,
            quickSpecs: Array.isArray(obj.quickSpecs) ? (obj.quickSpecs as import('@/lib/types/specifications.types').QuickSpec[]) : undefined,
          }
        }
      }
    }

    throw new ValidationError('AI could not extract specifications. Enable GEMINI_API_KEY or OPENAI_API_KEY and try again.')
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
