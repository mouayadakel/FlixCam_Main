/**
 * @file checkout-recovery.service.ts
 * @description Core engine for detecting abandoned checkouts and triggering automated recoveries
 * @module lib/services/checkout-recovery.service
 */

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { AuditService } from '@/lib/services/audit.service'
import { WhatsAppService } from '@/lib/services/whatsapp.service'
import { EventBus } from '@/lib/events/event-bus'

export class CheckoutRecoveryService {
  /**
   * Scan and notify customers who left items in their carts 2-3 hours ago.
   */
  static async recoverAbandonedCheckouts(): Promise<{ processed: number; failures: number }> {
    logger.info('[CheckoutRecoveryService] Starting abandoned checkout recovery scan...')
    
    const now = new Date()
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000)

    let processed = 0
    let failures = 0

    try {
      // Find eligible carts (bypassing client cache through explicit 'any' cast)
      const carts = await (prisma.cart as any).findMany({
        where: {
          updatedAt: { gte: threeHoursAgo, lte: twoHoursAgo },
          userId: { not: null },
          booking: null,
          abandonedCheckoutEmailSentAt: null,
          items: { some: {} },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            }
          },
          items: {
            include: {
              equipment: {
                select: {
                  model: true,
                }
              }
            }
          }
        }
      })

      logger.info(`[CheckoutRecoveryService] Found ${carts.length} eligible abandoned carts.`)

      const baseUrl = (
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.NEXTAUTH_URL ??
        process.env.APP_URL ??
        'https://flixcam.rent'
      ).replace(/\/$/, '')

      for (const cart of carts) {
        const user = (cart as any).user
        if (!user || !user.phone) {
          logger.warn(`[CheckoutRecoveryService] Skipping cart ${cart.id}: No customer phone number.`)
          continue
        }

        try {
          const clientName = user.name || 'عميلنا العزيز | Valued Customer'
          const recoveryUrl = `${baseUrl}/checkout?restoreCart=${cart.id}`
          const itemsSummary = ((cart as any).items || [])
            .map((i: any) => i.equipment?.model)
            .filter(Boolean)
            .join('، ')

          // Bilingual recover copy
          const messageText = 
            `مرحباً ${clientName}! 🎬\n` +
            `لاحظنا أنك تركت بعض المعدات المميزة في سلتك في FlixCam:\n` +
            `📋 ${itemsSummary || 'معدات تصوير'}\n\n` +
            `لا تدعها تفوتك! أكمل حجزك الآن بضغطة زر واحدة عبر الرابط أدناه:\n` +
            `🔗 ${recoveryUrl}\n\n` +
            `--- \n` +
            `Hello ${clientName}! 🎬\n` +
            `We noticed you left items in your cart at FlixCam:\n` +
            `📋 ${itemsSummary || 'Filming gear'}\n\n` +
            `Don't miss out! Secure your rental now with one-click recovery:\n` +
            `🔗 ${recoveryUrl}`

          // Send WhatsApp message through standard WhatsAppService
          const formattedPhone = WhatsAppService.normalizePhoneForWhatsApp(user.phone)
          
          if (WhatsAppService.isWhatsAppConfigured()) {
            const result = await WhatsAppService.sendWhatsAppText(formattedPhone, messageText, {
              logToMessageLog: true,
              recipientUserId: user.id,
              templateId: 'abandoned_cart_recovery',
            })
            if (result.ok) {
              logger.info(`[CheckoutRecoveryService] Dispatched recovery WhatsApp to ${formattedPhone} for cart ${cart.id}`)
            } else {
              logger.error(`[CheckoutRecoveryService] WhatsApp dispatch failed: ${result.error}`)
            }
          } else {
            logger.info(`[CheckoutRecoveryService] [SandboxMode] WhatsApp simulated output:\n${messageText}`)
          }

          // Mark cart as processed to avoid double notifications
          await (prisma.cart as any).update({
            where: { id: cart.id },
            data: { abandonedCheckoutEmailSentAt: now },
          })

          // Audit recovery trigger
          await AuditService.log({
            action: 'cart.recovery_sent',
            userId: user.id,
            resourceType: 'cart',
            resourceId: cart.id,
            metadata: {
              phone: user.phone,
              recoveryUrl,
              itemsCount: ((cart as any).items || []).length,
            }
          })

          // Emit EventBus notification for live webhooks / other consumers
          await EventBus.emit('cart.abandoned', {
            cartId: cart.id,
            userId: user.id,
            equipmentIds: ((cart as any).items || []).map((i: any) => i.equipmentId).filter(Boolean),
          })

          processed++
        } catch (error: any) {
          failures++
          logger.error(`[CheckoutRecoveryService] Failed to process cart recovery for ${cart.id}:`, error)
        }
      }
    } catch (error: any) {
      logger.error('[CheckoutRecoveryService] Recovery run aborted due to error:', error)
    }

    return { processed, failures }
  }
}
