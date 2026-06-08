import { createHash } from 'crypto'
import { prisma } from '@/lib/db/prisma'
import { getMailchimpConfig } from '@/lib/services/marketing-settings.service'

interface SyncSubscriberInput {
  email: string
  name?: string
  source?: string
}

export type MailchimpUpsertResult = 'created' | 'updated' | 'skipped'

function getMailchimpAuthHeader(apiKey: string): string {
  return `Basic ${Buffer.from(`anystring:${apiKey}`).toString('base64')}`
}

export async function upsertMailchimpSubscriber(
  input: SyncSubscriberInput
): Promise<MailchimpUpsertResult> {
  const { apiKey, listId, server } = await getMailchimpConfig()
  if (!apiKey || !listId || !server) return 'skipped'

  const authHeader = getMailchimpAuthHeader(apiKey)
  const email = input.email.toLowerCase().trim()
  const sourceTag = input.source?.trim() || 'website'
  const firstName = input.name?.trim().slice(0, 100) || ''

  const createResponse = await fetch(`https://${server}.api.mailchimp.com/3.0/lists/${listId}/members`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email_address: email,
      status: 'subscribed',
      merge_fields: { FNAME: firstName },
      tags: [sourceTag],
    }),
  })

  if (createResponse.ok) {
    return 'created'
  }

  if (createResponse.status !== 400) {
    throw new Error(`Mailchimp request failed with status ${createResponse.status}`)
  }

  const body = (await createResponse.json().catch(() => null)) as { title?: string } | null
  if (body?.title !== 'Member Exists') {
    throw new Error('Mailchimp rejected subscriber')
  }

  const emailHash = createHash('md5').update(email).digest('hex')
  const updateResponse = await fetch(
    `https://${server}.api.mailchimp.com/3.0/lists/${listId}/members/${emailHash}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        merge_fields: { FNAME: firstName },
        tags: [sourceTag],
      }),
    }
  )

  if (!updateResponse.ok) {
    throw new Error(`Mailchimp update failed with status ${updateResponse.status}`)
  }

  return 'updated'
}

export interface MailchimpSyncSummary {
  total: number
  added: number
  updated: number
  failed: number
}

export async function syncActiveNewsletterSubscribers(limit?: number): Promise<MailchimpSyncSummary> {
  const subscribers = await prisma.newsletterSubscription.findMany({
    where: { status: 'active' },
    select: {
      email: true,
      name: true,
      source: true,
    },
    orderBy: { createdAt: 'desc' },
    ...(typeof limit === 'number' ? { take: limit } : {}),
  })

  let added = 0
  let updated = 0
  let failed = 0

  for (const subscriber of subscribers) {
    try {
      const result = await upsertMailchimpSubscriber({
        email: subscriber.email,
        name: subscriber.name ?? undefined,
        source: subscriber.source ?? undefined,
      })
      if (result === 'created') added += 1
      if (result === 'updated') updated += 1
    } catch {
      failed += 1
    }
  }

  return {
    total: subscribers.length,
    added,
    updated,
    failed,
  }
}
