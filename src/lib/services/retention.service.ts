import { prisma } from '@/lib/db/prisma'

export interface RfmThresholds {
  whaleMinFrequency: number
  whaleMinMonetary: number
  loyalistMinFrequency: number
  loyalistMaxRecency: number
  atRiskMinRecency: number
  atRiskMaxRecency: number
  dormantMinRecency: number
}

const DEFAULT_THRESHOLDS: RfmThresholds = {
  whaleMinFrequency: 5,
  whaleMinMonetary: 5000,
  loyalistMinFrequency: 3,
  loyalistMaxRecency: 30,
  atRiskMinRecency: 60,
  atRiskMaxRecency: 120,
  dormantMinRecency: 120,
}

export interface CustomerSegment {
  userId: string
  name: string
  email: string
  rfm: {
    recency: number
    frequency: number
    monetary: number
  }
  segment: 'Whale' | 'Loyalist' | 'At Risk' | 'Dormant' | 'New'
}

export class RetentionService {
  /**
   * Performs RFM analysis on all customers with at least one booking.
   * Fix 12: Thresholds are now configurable, with sensible defaults.
   */
  static async getCustomerSegments(thresholds?: Partial<RfmThresholds>): Promise<CustomerSegment[]> {
    const t = { ...DEFAULT_THRESHOLDS, ...thresholds }

    const users = await prisma.user.findMany({
      where: {
        bookings: { some: { status: { notIn: ['CANCELLED'] } } }
      },
      select: {
        id: true,
        name: true,
        email: true,
        bookings: {
          where: { status: { notIn: ['CANCELLED'] } },
          select: {
            createdAt: true,
            totalAmount: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    const now = new Date()

    return (users as any[]).map(user => {
      const lastBooking = user.bookings[0]?.createdAt
      const recency = lastBooking 
        ? Math.floor((now.getTime() - lastBooking.getTime()) / (1000 * 60 * 60 * 24))
        : 999
      
      const frequency = user.bookings.length
      const monetary = user.bookings.reduce((sum: number, b: any) => sum + Number(b.totalAmount), 0)

      let segment: CustomerSegment['segment'] = 'New'
      
      if (frequency >= t.whaleMinFrequency && monetary > t.whaleMinMonetary) segment = 'Whale'
      else if (frequency >= t.loyalistMinFrequency && recency < t.loyalistMaxRecency) segment = 'Loyalist'
      else if (recency > t.atRiskMinRecency && recency <= t.atRiskMaxRecency) segment = 'At Risk'
      else if (recency > t.dormantMinRecency) segment = 'Dormant'
      else if (frequency === 1) segment = 'New'
      else segment = 'Loyalist'

      return {
        userId: user.id,
        name: user.name || 'Unknown',
        email: user.email || '',
        rfm: { recency, frequency, monetary },
        segment
      }
    })
  }

  /**
   * Generates localized AI-driven re-engagement suggestions.
   */
  static async getReengagementPrompt(customer: CustomerSegment) {
    return `Customer ${customer.name} (Segment: ${customer.segment}) has spent ${customer.rfm.monetary} SAR total. 
    Last booking was ${customer.rfm.recency} days ago. Their frequency is ${customer.rfm.frequency}.
    Generate a respectful, high-value re-engagement message in Arabic for WhatsApp.`
  }
}
