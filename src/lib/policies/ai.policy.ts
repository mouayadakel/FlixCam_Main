/**
 * @file ai.policy.ts
 * @description Authorization policies for AI features
 * @module policies/ai
 */

import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { PolicyResult } from './base.policy'

export class AIPolicy {
  static async canUseAI(userId: string): Promise<PolicyResult> {
    const hasAccess = await hasPermission(userId, 'ai.use')
    if (!hasAccess) {
      return {
        allowed: false,
        reason: 'You do not have permission to use AI features',
      }
    }
    return { allowed: true }
  }

  static async canViewRiskAssessment(userId: string): Promise<PolicyResult> {
    const hasAccess = await hasPermission(userId, PERMISSIONS.AI_RISK_ASSESSMENT) || await hasPermission(userId, PERMISSIONS.BOOKING_READ)
    if (!hasAccess) {
      return {
        allowed: false,
        reason: 'You do not have permission to view risk assessments',
      }
    }
    return { allowed: true }
  }

  static async canUseKitBuilder(userId: string): Promise<PolicyResult> {
    const hasAccess = await hasPermission(userId, PERMISSIONS.AI_KIT_BUILDER) || await hasPermission(userId, PERMISSIONS.BOOKING_CREATE)
    if (!hasAccess) {
      return {
        allowed: false,
        reason: 'You do not have permission to use the kit builder',
      }
    }
    return { allowed: true }
  }

  static async canViewPricingSuggestions(userId: string): Promise<PolicyResult> {
    const hasAccess = await hasPermission(userId, 'ai.pricing') || await hasPermission(userId, 'equipment.update')
    if (!hasAccess) {
      return {
        allowed: false,
        reason: 'You do not have permission to view pricing suggestions',
      }
    }
    return { allowed: true }
  }

  static async canViewDemandForecast(userId: string): Promise<PolicyResult> {
    const hasAccess = await hasPermission(userId, 'ai.demand_forecast') || await hasPermission(userId, 'reports.read')
    if (!hasAccess) {
      return {
        allowed: false,
        reason: 'You do not have permission to view demand forecasts',
      }
    }
    return { allowed: true }
  }

  static async canUseChatbot(userId: string): Promise<PolicyResult> {
    const hasAccess = await hasPermission(userId, 'ai.chatbot')
    if (!hasAccess) {
      return {
        allowed: false,
        reason: 'You do not have permission to use the chatbot',
      }
    }
    return { allowed: true }
  }

  static async canManageAIConfig(userId: string): Promise<PolicyResult> {
    const hasAccess = await hasPermission(userId, 'settings.update')
    if (!hasAccess) {
      return {
        allowed: false,
        reason: 'You do not have permission to manage AI configuration',
      }
    }
    return { allowed: true }
  }
}
