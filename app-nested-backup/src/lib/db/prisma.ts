/**
 * @file prisma.ts
 * @description Prisma client singleton
 * @module lib/db
 */

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function buildDatasourceUrl(): string | undefined {
  const raw = process.env.DATABASE_URL
  if (!raw) return undefined
  const sep = raw.includes('?') ? '&' : '?'
  if (raw.includes('connection_limit')) return raw
  return `${raw}${sep}connection_limit=5`
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasourceUrl: buildDatasourceUrl(),
  })
}

function getPrisma(): PrismaClient {
  const cached = globalForPrisma.prisma
  if (cached != null && typeof (cached as { checkoutFormSection?: unknown }).checkoutFormSection !== 'undefined') {
    return cached
  }
  if (cached != null && process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = undefined
  }
  const client = createPrismaClient()
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client
  }
  return client
}

export const prisma = getPrisma()
