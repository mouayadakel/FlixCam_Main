/**
 * @file verify-products.ts
 * @description Verify that products were created from import jobs
 */

import { prisma } from '../src/lib/db/prisma'

async function verifyProducts() {
  console.log('Checking for products created from imports...\n')

  // Get recent import jobs
  const recentJobs = await prisma.importJob.findMany({
    where: {
      status: 'COMPLETED',
    },
    orderBy: { updatedAt: 'desc' },
    take: 5,
    include: {
      rows: {
        where: {
          status: 'SUCCESS',
          productId: { not: null },
        },
      },
    },
  })

  if (recentJobs.length === 0) {
    console.log('No completed import jobs found.')
    return
  }

  let totalProducts = 0
  const productIds: string[] = []

  for (const job of recentJobs) {
    console.log(`\n=== Job: ${job.id} ===`)
    console.log(`Status: ${job.status}`)
    console.log(`Success Rows: ${job.successRows}`)
    console.log(`Error Rows: ${job.errorRows}`)

    const rowsWithProducts = job.rows.filter((r) => r.productId !== null)
    const ids = rowsWithProducts.map((r) => r.productId!).filter(Boolean)
    productIds.push(...ids)
    totalProducts += ids.length

    if (ids.length > 0) {
      // Fetch products
      const products = await prisma.product.findMany({
        where: { id: { in: ids } },
        include: {
          translations: {
            where: { locale: 'en' },
            select: { name: true },
          },
        },
      })

      console.log(`\nProducts created (${products.length}):`)
      for (const product of products.slice(0, 10)) {
        const name = product.translations[0]?.name || 'N/A'
        console.log(`  - ${name} (${product.sku || 'No SKU'}) - Status: ${product.status}`)
      }
      if (products.length > 10) {
        console.log(`  ... and ${products.length - 10} more`)
      }
    }
  }

  // Get total product count
  const totalCount = await prisma.product.count()
  console.log(`\n\n=== Summary ===`)
  console.log(`Total products in database: ${totalCount}`)
  console.log(`Products from recent imports: ${totalProducts}`)
}

verifyProducts()
  .then(() => {
    console.log('\n✓ Verification complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
