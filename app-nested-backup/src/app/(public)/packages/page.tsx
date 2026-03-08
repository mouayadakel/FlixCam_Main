/**
 * Packages list page (Phase 2.5).
 * Guarded by enable_packages feature flag.
 */

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { t } from '@/lib/i18n/translate'
import { generateAlternatesMetadata } from '@/lib/seo/hreflang'

export const metadata: Metadata = {
  title: t('ar', 'seo.packagesTitle'),
  description: t('ar', 'seo.packagesDescription'),
  alternates: generateAlternatesMetadata('/packages'),
  keywords: ['باقات تأجير', 'rental packages', 'كيت تصوير', 'equipment bundles', 'FlixCam'],
}

import { prisma } from '@/lib/db/prisma'
import { FeatureFlagService } from '@/lib/services/feature-flag.service'
import { PackagesListClient } from './packages-list-client'

async function getPackages() {
  const kits = await prisma.kit.findMany({
    where: { deletedAt: null, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      discountPercent: true,
      _count: { select: { items: true } },
    },
    orderBy: { name: 'asc' },
  })
  return kits.map((k) => ({
    id: k.id,
    name: k.name,
    slug: k.slug,
    description: k.description ?? null,
    discountPercent: k.discountPercent ? Number(k.discountPercent) : null,
    itemCount: k._count.items,
  }))
}

export default async function PackagesListPage() {
  const enabled = await FeatureFlagService.isEnabled('enable_packages')
  if (!enabled) redirect('/')
  const packages = await getPackages()
  return (
    <main className="container px-4 py-8">
      <PackagesListClient packages={packages} />
    </main>
  )
}
