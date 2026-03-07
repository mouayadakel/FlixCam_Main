/**
 * Server-side helper to read PN settings (used by checkout flow)
 */

import { prisma } from '@/lib/db/prisma'

const KEY = 'settings.promissory_note'

export interface PromissoryNoteSettings {
  pn_enabled_for_equipment: boolean
  pn_enabled_for_studio: boolean
  letter_template: string
}

const DEFAULTS: PromissoryNoteSettings = {
  pn_enabled_for_equipment: false,
  pn_enabled_for_studio: false,
  letter_template: '',
}

export async function getPromissoryNoteSettings(): Promise<PromissoryNoteSettings> {
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
