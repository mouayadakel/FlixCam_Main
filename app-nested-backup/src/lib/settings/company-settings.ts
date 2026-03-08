/**
 * Server-side helper to read company (creditor) settings for promissory notes
 */

import { prisma } from '@/lib/db/prisma'

const KEY = 'settings.company'

export interface CompanySettings {
  creditorName: string
  creditorCommercialReg: string
  creditorTaxNumber: string
  creditorAddress: string
  creditorBankAccount: string
  creditorIban: string
  managerName: string
  managerTitle: string
  managerLetterTemplate: string
}

const DEFAULTS: CompanySettings = {
  creditorName: '',
  creditorCommercialReg: '',
  creditorTaxNumber: '',
  creditorAddress: '',
  creditorBankAccount: '',
  creditorIban: '',
  managerName: '',
  managerTitle: '',
  managerLetterTemplate: '',
}

export async function getCompanySettings(): Promise<CompanySettings> {
  const row = await prisma.integrationConfig.findFirst({
    where: { key: KEY, deletedAt: null },
    select: { value: true },
  })

  if (!row?.value) return { ...DEFAULTS }

  try {
    return { ...DEFAULTS, ...JSON.parse(row.value) }
  } catch {
    return { ...DEFAULTS }
  }
}
