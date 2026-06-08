import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

async function main() {
  const vatNumber = process.env.ZATCA_COMPANY_VAT || process.env.COMPANY_VAT_NUMBER || null
  const crNumber = process.env.ZATCA_COMPANY_CR || process.env.COMPANY_CR_NUMBER || null
  const nameEn =
    process.env.ZATCA_COMPANY_NAME || process.env.COMPANY_NAME_EN || 'FlixCam.rent'
  const nameAr = process.env.COMPANY_NAME_AR || 'فلكس كام'
  const address = process.env.COMPANY_ADDRESS || null
  const phone = process.env.COMPANY_PHONE || process.env.NEXT_PUBLIC_CONTACT_PHONE || null
  const email = process.env.COMPANY_EMAIL || process.env.NEXT_PUBLIC_CONTACT_EMAIL || null

  await prisma.companySettings.upsert({
    where: { id: 'global' },
    create: {
      id: 'global',
      nameEn,
      nameAr,
      address,
      city: process.env.COMPANY_CITY || 'Riyadh',
      country: 'SA',
      phone,
      email,
      website: process.env.APP_URL || process.env.NEXTAUTH_URL || 'https://flixcam.rent',
      vatNumber,
      crNumber,
      vatRate: new Decimal(process.env.COMPANY_VAT_RATE || '0.15'),
      zatcaEnabled: Boolean(vatNumber),
      invoicePrefix: process.env.INVOICE_PREFIX || 'INV',
      quotePrefix: process.env.QUOTE_PREFIX || 'QUO',
      paymentTermsDays: Number(process.env.PAYMENT_TERMS_DAYS || 30),
      updatedBy: 'seed',
    },
    update: {
      nameEn,
      nameAr,
      ...(address ? { address } : {}),
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
      ...(vatNumber ? { vatNumber, zatcaEnabled: true } : {}),
      ...(crNumber ? { crNumber } : {}),
      updatedBy: 'seed',
    },
  })

  console.log('CompanySettings seeded (id=global)', {
    vatNumber: vatNumber ? 'set' : 'missing',
    crNumber: crNumber ? 'set' : 'missing',
  })
}

main()
  .finally(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
