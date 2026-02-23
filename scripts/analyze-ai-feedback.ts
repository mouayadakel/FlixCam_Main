/**
 * @file analyze-ai-feedback.ts
 * @description Maintenance script that analyzes AI Feedback logs to identify weak spots
 * in the content engine. Looks for high rejection rates, provider performance gaps,
 * and categories needing better prompts.
 *
 * Usage: npx tsx scripts/analyze-ai-feedback.ts
 *
 * @module scripts
 */

import { prisma } from '@/lib/db/prisma'

async function analyzeAiPerformance() {
  console.log('\n========================================')
  console.log('  FlixCam AI Performance Analysis')
  console.log('========================================\n')

  // 1. Rejection hotspots by category + content type
  const rejectionStats = await prisma.aiFeedback.groupBy({
    by: ['categoryId', 'contentType'],
    _count: { action: true },
    where: { action: 'rejected' },
    orderBy: { _count: { action: 'desc' } },
  })

  console.log('--- AI Performance Warning Zones ---')
  if (rejectionStats.length === 0) {
    console.log('  No rejections recorded yet. System is either new or performing well.')
  } else {
    for (const stat of rejectionStats) {
      const catName = stat.categoryId
        ? (
            await prisma.category.findUnique({
              where: { id: stat.categoryId },
              select: { name: true },
            })
          )?.name || stat.categoryId
        : 'Unknown'
      console.log(
        `  Category: ${catName} | Type: ${stat.contentType} | Rejections: ${stat._count.action}`
      )
    }
  }

  // 2. Provider comparison
  console.log('\n--- Provider Performance ---')
  const providerStats = await prisma.aiFeedback.groupBy({
    by: ['provider', 'action'],
    _count: true,
  })

  const providerMap = new Map<
    string,
    { approved: number; rejected: number; edited: number; total: number }
  >()
  for (const stat of providerStats) {
    const provider = stat.provider || 'unknown'
    if (!providerMap.has(provider)) {
      providerMap.set(provider, { approved: 0, rejected: 0, edited: 0, total: 0 })
    }
    const entry = providerMap.get(provider)!
    const count = (stat._count as unknown as number) || 0
    entry.total += count
    if (stat.action === 'approved') entry.approved += count
    if (stat.action === 'rejected') entry.rejected += count
    if (stat.action === 'edited') entry.edited += count
  }

  for (const [provider, data] of providerMap) {
    const approvalRate = data.total > 0 ? Math.round((data.approved / data.total) * 100) : 0
    console.log(
      `  ${provider}: ${approvalRate}% approval (${data.approved}/${data.total}) | ${data.rejected} rejected | ${data.edited} edited`
    )
  }

  // 3. Rejection reasons breakdown
  console.log('\n--- Top Rejection Reasons ---')
  const reasonStats = await prisma.aiFeedback.groupBy({
    by: ['rejectionReason'],
    _count: { action: true },
    where: { action: 'rejected', rejectionReason: { not: null } },
    orderBy: { _count: { action: 'desc' } },
    take: 10,
  })

  if (reasonStats.length === 0) {
    console.log('  No rejection reasons recorded yet.')
  } else {
    for (const stat of reasonStats) {
      console.log(`  "${stat.rejectionReason}": ${stat._count.action} times`)
    }
  }

  // 4. Auto-approve candidates
  console.log('\n--- Auto-Approve Candidates ---')
  const approvalByCat = await prisma.aiFeedback.groupBy({
    by: ['categoryId', 'contentType'],
    _count: { action: true },
    where: { action: 'approved' },
  })

  const totalByCat = await prisma.aiFeedback.groupBy({
    by: ['categoryId', 'contentType'],
    _count: { action: true },
  })

  const totalMap = new Map<string, number>()
  for (const t of totalByCat) {
    totalMap.set(`${t.categoryId}:${t.contentType}`, t._count.action)
  }

  for (const stat of approvalByCat) {
    const key = `${stat.categoryId}:${stat.contentType}`
    const total = totalMap.get(key) || 0
    if (total < 50) continue
    const rate = Math.round((stat._count.action / total) * 100)
    if (rate >= 95) {
      const catName = stat.categoryId
        ? (
            await prisma.category.findUnique({
              where: { id: stat.categoryId },
              select: { name: true },
            })
          )?.name || stat.categoryId
        : 'Unknown'
      console.log(
        `  ELIGIBLE: ${catName}/${stat.contentType} — ${rate}% approval over ${total} samples`
      )
    }
  }

  // 5. Summary stats
  console.log('\n--- Summary ---')
  const totalFeedback = await prisma.aiFeedback.count()
  const totalApproved = await prisma.aiFeedback.count({ where: { action: 'approved' } })
  const totalRejected = await prisma.aiFeedback.count({ where: { action: 'rejected' } })
  const totalEdited = await prisma.aiFeedback.count({ where: { action: 'edited' } })

  console.log(`  Total feedback entries: ${totalFeedback}`)
  console.log(
    `  Approved: ${totalApproved} (${totalFeedback > 0 ? Math.round((totalApproved / totalFeedback) * 100) : 0}%)`
  )
  console.log(
    `  Rejected: ${totalRejected} (${totalFeedback > 0 ? Math.round((totalRejected / totalFeedback) * 100) : 0}%)`
  )
  console.log(
    `  Edited:   ${totalEdited} (${totalFeedback > 0 ? Math.round((totalEdited / totalFeedback) * 100) : 0}%)`
  )

  // 6. Photo gate stats
  console.log('\n--- Photo Gate Status ---')
  const [totalProducts, needsSourcing, sufficient] = await Promise.all([
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.product.count({ where: { deletedAt: null, photoStatus: 'needs_sourcing' } }),
    prisma.product.count({ where: { deletedAt: null, photoStatus: 'sufficient' } }),
  ])
  const unknown = totalProducts - needsSourcing - sufficient
  console.log(`  Total products: ${totalProducts}`)
  console.log(`  Sufficient photos (4+): ${sufficient}`)
  console.log(`  Needs sourcing (<4): ${needsSourcing}`)
  console.log(`  Unknown status: ${unknown}`)

  // 7. Column mapping memory
  console.log('\n--- Column Mapping Memory ---')
  try {
    const topMappings = await prisma.columnMappingHistory.findMany({
      orderBy: { frequency: 'desc' },
      take: 10,
    })
    if (topMappings.length === 0) {
      console.log('  No column mappings saved yet.')
    } else {
      for (const m of topMappings) {
        console.log(`  "${m.sourceHeader}" → ${m.mappedField} (used ${m.frequency} times)`)
      }
    }
  } catch {
    console.log('  Column mapping table not available yet.')
  }

  console.log('\n========================================')
  console.log('  Analysis complete')
  console.log('========================================\n')

  await prisma.$disconnect()
}

analyzeAiPerformance().catch((err) => {
  console.error('Analysis failed:', err)
  process.exit(1)
})
