import { prisma } from '@/lib/db/prisma'

export class InvoiceNumberService {
  async nextInvoiceNumber(prefix = 'INV'): Promise<string> {
    const year = new Date().getFullYear()
    const sequence = await prisma.invoiceSequence.upsert({
      where: { year },
      create: { year, lastNum: 1 },
      update: { lastNum: { increment: 1 } },
    })

    return `${prefix}-${year}-${sequence.lastNum.toString().padStart(6, '0')}`
  }

  async nextConfiguredInvoiceNumber(): Promise<string> {
    const settings = await prisma.companySettings.findFirst({
      select: { invoicePrefix: true },
    })
    return this.nextInvoiceNumber(settings?.invoicePrefix || 'INV')
  }

  async nextQuoteNumber(): Promise<string> {
    const settings = await prisma.companySettings.findFirst({
      select: { quotePrefix: true },
    })
    return this.nextInvoiceNumber(settings?.quotePrefix || 'QUO')
  }

  async setCurrentSequence(year: number, num: number): Promise<void> {
    await prisma.invoiceSequence.upsert({
      where: { year },
      create: { year, lastNum: num },
      update: { lastNum: num },
    })
  }
}

export const invoiceNumberService = new InvoiceNumberService()
