/**
 * ZATCA clearance — maps Prisma invoices to Fatoora XML + optional API submission.
 */

import { prisma } from '@/lib/db/prisma'
import { generateZATCAQR } from '@/lib/zatca/qr'
import {
  generateZATCAInvoice,
  validateZATCAInvoiceData,
  type ZATCAInvoiceData,
} from '@/lib/integrations/zatca/invoice-generator'
import type { ZATCAStatus } from '@prisma/client'

export interface ZatcaClearanceResult {
  invoiceId: string
  status: ZATCAStatus
  submitted: boolean
  hash: string | null
  uuid: string | null
  error?: string
}

function parseAddress(raw?: string | null) {
  return {
    street: raw?.split(',')[0]?.trim() || 'Riyadh',
    city: 'Riyadh',
    postalCode: '00000',
    country: 'SA',
  }
}

export async function buildZatcaDataFromInvoice(invoiceId: string): Promise<ZATCAInvoiceData | null> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, deletedAt: null },
    include: {
      customer: {
        select: { name: true, companyName: true, taxId: true, billingAddress: true },
      },
      lineItems: true,
    },
  })
  if (!invoice) return null

  const company = await prisma.companySettings.findFirst()
  if (!company?.vatNumber) return null

  const items =
    invoice.lineItems.length > 0
      ? invoice.lineItems.map((line) => ({
          name: line.description,
          quantity: Number(line.quantity),
          unitPrice: Number(line.unitPrice),
          taxRate: Number(line.vatRate) * 100,
          taxAmount: Number(line.vatAmount),
          totalAmount: Number(line.lineTotalWithVat),
        }))
      : Array.isArray(invoice.items)
        ? (invoice.items as Array<Record<string, unknown>>).map((item, i) => ({
            name: String(item.description ?? item.name ?? `Item ${i + 1}`),
            quantity: Number(item.quantity ?? 1),
            unitPrice: Number(item.unitPrice ?? 0),
            taxRate: Number(invoice.vatRate) * 100,
            taxAmount: Number(item.vatAmount ?? 0),
            totalAmount: Number(item.total ?? item.lineTotalWithVat ?? 0),
          }))
        : []

  const buyerName = invoice.customer.companyName || invoice.customer.name || 'Customer'

  return {
    id: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    issueTime: invoice.issueDate.toISOString().split('T')[1]?.slice(0, 8) ?? '12:00:00',
    invoiceType: 'standard',
    invoiceTypeCode: 388,
    currency: 'SAR',
    totalAmount: Number(invoice.subtotal),
    taxAmount: Number(invoice.vatAmount),
    totalAmountWithTax: Number(invoice.totalAmount),
    seller: {
      name: company.nameAr || company.nameEn,
      vatNumber: company.vatNumber,
      address: {
        ...parseAddress(company.address),
        city: company.city || 'Riyadh',
        country: company.country || 'SA',
      },
    },
    buyer: {
      name: buyerName,
      vatNumber: invoice.customer.taxId ?? undefined,
      address: invoice.customer.billingAddress
        ? parseAddress(invoice.customer.billingAddress)
        : undefined,
    },
    items,
  }
}

export async function clearInvoiceWithZatca(invoiceId: string): Promise<ZatcaClearanceResult> {
  const data = await buildZatcaDataFromInvoice(invoiceId)
  if (!data) {
    return {
      invoiceId,
      status: 'REJECTED',
      submitted: false,
      hash: null,
      uuid: null,
      error: 'Invoice or company VAT not found',
    }
  }

  const validation = validateZATCAInvoiceData(data)
  if (!validation.valid) {
    return {
      invoiceId,
      status: 'REJECTED',
      submitted: false,
      hash: null,
      uuid: null,
      error: validation.errors.join('; '),
    }
  }

  const company = await prisma.companySettings.findFirst()
  const issueDate =
    data.issueDate instanceof Date ? data.issueDate : new Date(data.issueDate)
  const tlvQr = generateZATCAQR({
    sellerName: data.seller.name,
    vatNumber: data.seller.vatNumber,
    invoiceDate: issueDate,
    totalWithVAT: data.totalAmountWithTax,
    vatAmount: data.taxAmount,
  })

  let status: ZATCAStatus = company?.zatcaEnabled ? 'SUBMITTED' : 'ACCEPTED'
  let hash: string | null = null
  let uuid: string | null = null
  let submitted = false
  let error: string | undefined

  if (company?.zatcaEnabled) {
    const result = await generateZATCAInvoice(data)
    hash = result.hash
    uuid = result.uuid
    submitted = result.submitted
    error = result.error
    if (result.submitted && result.uuid) status = 'CLEARED'
    else if (result.error) status = 'REJECTED'
    else if (!process.env.ZATCA_API_URL) status = 'ACCEPTED'
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      zatcaQR: tlvQr,
      zatcaHash: hash ?? undefined,
      zatcaStatus: status,
    },
  })

  await prisma.auditLog.create({
    data: {
      action: submitted ? 'zatca.invoice.cleared' : 'zatca.invoice.prepared',
      resourceType: 'Invoice',
      resourceId: invoiceId,
      metadata: { status, uuid, submitted, error },
    },
  })

  return { invoiceId, status, submitted, hash, uuid, error }
}
