/**
 * @file integration-config.service.ts
 * @description Integration configuration storage service
 * @module lib/services/integration-config
 */

import { prisma } from '@/lib/db/prisma'
import { AuditService } from './audit.service'
import * as crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY
  if (process.env.NODE_ENV === 'production') {
    if (!key || key.length < 32) {
      throw new Error(
        'ENCRYPTION_KEY must be set in production and at least 32 characters (see .env.example)'
      )
    }
    return key
  }
  if (!key) {
    return 'default-key-change-in-production'
  }
  return key
}

function encrypt(text: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key.slice(0, 32), 'utf8'), iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function decrypt(encryptedText: string): string {
  const key = getEncryptionKey()
  const parts = encryptedText.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encrypted = parts[1]
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key.slice(0, 32), 'utf8'), iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export interface IntegrationConfigData {
  type: string
  config: Record<string, any>
  enabled: boolean
}

export class IntegrationConfigService {
  /**
   * Get integration config (from database or env fallback)
   */
  static async getConfig(type: string): Promise<IntegrationConfigData | null> {
    const key = `integration.${type}`
    const stored = await prisma.integrationConfig.findFirst({
      where: { key, deletedAt: null },
      select: { value: true },
    })

    if (stored?.value) {
      try {
        const decrypted = decrypt(stored.value)
        return JSON.parse(decrypted)
      } catch {
        // If decryption fails, fall back to env
      }
    }

    return this.getConfigFromEnv(type)
  }

  /**
   * Get config from environment variables
   */
  static getConfigFromEnv(type: string): IntegrationConfigData | null {
    switch (type) {
      case 'payments':
        return {
          type: 'payments',
          enabled: !!(process.env.TAP_SECRET_KEY && process.env.TAP_PUBLIC_KEY),
          config: {
            secretKey: process.env.TAP_SECRET_KEY ? '***configured***' : undefined,
            publicKey: process.env.TAP_PUBLIC_KEY || undefined,
          },
        }
      case 'email':
        return {
          type: 'email',
          enabled: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
          config: {
            host: process.env.SMTP_HOST || undefined,
            user: process.env.SMTP_USER || undefined,
            port: process.env.SMTP_PORT || '587',
            password: process.env.SMTP_PASSWORD ? '***configured***' : undefined,
          },
        }
      case 'whatsapp':
        return {
          type: 'whatsapp',
          enabled: !!process.env.WHATSAPP_ACCESS_TOKEN,
          config: {
            accessToken: process.env.WHATSAPP_ACCESS_TOKEN ? '***configured***' : undefined,
          },
        }
      case 'analytics':
        return {
          type: 'analytics',
          enabled: !!(
            process.env.GTM_CONTAINER_ID ||
            process.env.GA4_MEASUREMENT_ID ||
            process.env.META_PIXEL_ID
          ),
          config: {
            gtmContainerId: process.env.GTM_CONTAINER_ID || undefined,
            ga4MeasurementId: process.env.GA4_MEASUREMENT_ID || undefined,
            metaPixelId: process.env.META_PIXEL_ID || undefined,
          },
        }
      default:
        return null
    }
  }

  /**
   * Save integration config (encrypted)
   */
  static async saveConfig(
    type: string,
    config: Record<string, any>,
    enabled: boolean,
    userId: string
  ) {
    const configData: IntegrationConfigData = {
      type,
      config,
      enabled,
    }

    const encrypted = encrypt(JSON.stringify(configData))
    const key = `integration.${type}`

    // Raw SQL: all values must be passed as parameters ($1, $2, ...). Never concatenate user input.
    try {
      const existing = await prisma.integrationConfig.findFirst({
        where: { key, deletedAt: null },
        select: { id: true },
      })

      if (existing) {
        await prisma.integrationConfig.update({
          where: { id: existing.id },
          data: { value: encrypted, updatedBy: userId },
        })
      } else {
        await prisma.integrationConfig.create({
          data: {
            key,
            value: encrypted,
            createdBy: userId,
          },
        })
      }
    } catch {
      throw new Error('IntegrationConfig table not found. Please run database migration.')
    }

    await AuditService.log({
      action: 'integration.config.updated',
      userId,
      resourceType: 'integration',
      resourceId: type,
      metadata: { type, enabled },
    })

    return configData
  }
}
