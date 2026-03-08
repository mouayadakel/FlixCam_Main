/**
 * @file marketing.types.ts
 * @description TypeScript types for marketing campaign management
 * @module lib/types
 * @author Engineering Team
 * @created 2026-01-28
 */

export type CampaignType = 'email' | 'sms' | 'push' | 'whatsapp'
export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled'

export interface Campaign {
  id: string
  name: string
  type: CampaignType
  status: CampaignStatus
  subject?: string | null
  content: string
  targetAudience?: string[] | null // User IDs or segments
  scheduledAt?: Date | null
  sentAt?: Date | null
  totalRecipients: number
  sentCount: number
  openedCount?: number
  clickedCount?: number
  conversionCount?: number
  createdAt: Date
  updatedAt: Date
  createdBy?: string | null
  updatedBy?: string | null
}

export interface CampaignCreateInput {
  name: string
  type: CampaignType
  subject?: string
  content: string
  targetAudience?: string[]
  scheduledAt?: Date
}

export interface CampaignUpdateInput {
  name?: string
  type?: CampaignType
  subject?: string
  content?: string
  targetAudience?: string[]
  scheduledAt?: Date
  status?: CampaignStatus
}

export interface CampaignSendInput {
  campaignId: string
  sendNow?: boolean
}

export interface CampaignFilterInput {
  status?: CampaignStatus
  type?: CampaignType
  search?: string
  dateFrom?: Date
  dateTo?: Date
  page?: number
  pageSize?: number
}
