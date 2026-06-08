/**
 * @file pdf.service.ts
 * @description PDF generation service for invoices, contracts, quotes, and reports
 * @module lib/services
 * @author Engineering Team
 * @created 2026-01-28
 */

import type { Invoice } from '@/lib/types/invoice.types'
import type { Contract } from '@/lib/types/contract.types'
import type { Quote } from '@/lib/types/quote.types'
import { generateInvoicePdf } from './pdf/invoice-pdf'
import { generateContractPdf } from './pdf/contract-pdf'
import { generateQuotePdf } from './pdf/quote-pdf'
import { prisma } from '@/lib/db/prisma'
import { generateZATCAQR } from '@/lib/zatca/qr'
import {
  exportReportAsPdf,
  exportReportAsExcel,
  type ReportExportPdfOptions,
} from './pdf/report-export'

export type PdfLocale = 'ar' | 'en'

export interface InvoicePdfInput {
  invoice: Invoice
  locale?: PdfLocale
  includeZatcaQr?: boolean
  qrPayload?: string
}

export interface ContractPdfInput {
  contract: Contract
  locale?: PdfLocale
}

export interface QuotePdfInput {
  quote: Quote
  locale?: PdfLocale
}

export interface ReportPdfInput extends ReportExportPdfOptions {}

/**
 * PDF Service
 * Generates PDFs for invoices, contracts, quotes, and reports.
 * Uses jspdf for PDF generation and supports Arabic (RTL) and English.
 */
export class PdfService {
  /**
   * Generate invoice PDF
   */
  static async generateInvoicePdfBuffer(input: InvoicePdfInput): Promise<Buffer> {
    let qrPayload = input.qrPayload
    const company = await prisma.companySettings.findFirst({
      select: {
        nameEn: true,
        nameAr: true,
        vatNumber: true,
        crNumber: true,
        address: true,
        city: true,
        country: true,
        phone: true,
        email: true,
        logoUrl: true,
      },
    })
    if ((input.includeZatcaQr ?? false) && !qrPayload) {
      if (company?.vatNumber) {
        qrPayload = generateZATCAQR({
          sellerName: company.nameAr || company.nameEn,
          vatNumber: company.vatNumber,
          invoiceDate: input.invoice.issueDate,
          totalWithVAT: input.invoice.totalAmount,
          vatAmount: input.invoice.vatAmount,
        })
      }
    }

    let logoDataUrl: string | undefined
    const logoUrl = company?.logoUrl?.trim()
    if (logoUrl) {
      try {
        const resolved =
          logoUrl.startsWith('http://') || logoUrl.startsWith('https://')
            ? logoUrl
            : `${process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000'}${logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`}`
        const response = await fetch(resolved)
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer())
          const contentType = response.headers.get('content-type') || 'image/png'
          logoDataUrl = `data:${contentType};base64,${buffer.toString('base64')}`
        }
      } catch {
        logoDataUrl = undefined
      }
    }

    const locale = input.locale ?? 'en'
    const companyAddress = [company?.address, company?.city, company?.country]
      .filter(Boolean)
      .join(', ')
    const companyName =
      locale === 'ar'
        ? company?.nameAr || company?.nameEn
        : company?.nameEn || company?.nameAr

    return generateInvoicePdf(input.invoice, {
      locale,
      includeZatcaQr: input.includeZatcaQr ?? false,
      qrPayload,
      logoDataUrl,
      company: {
        name: companyName ?? undefined,
        vatNumber: company?.vatNumber ?? undefined,
        crNumber: company?.crNumber ?? undefined,
        address: companyAddress || undefined,
        phone: company?.phone ?? undefined,
        email: company?.email ?? undefined,
      },
    })
  }

  /**
   * Generate contract PDF
   */
  static generateContractPdfBuffer(input: ContractPdfInput): Buffer {
    return generateContractPdf(input.contract, {
      locale: input.locale ?? 'en',
    })
  }

  /**
   * Generate quote PDF
   */
  static generateQuotePdfBuffer(input: QuotePdfInput): Buffer {
    return generateQuotePdf(input.quote, {
      locale: input.locale ?? 'en',
    })
  }

  /**
   * Generate report PDF
   */
  static generateReportPdfBuffer(input: ReportPdfInput): Buffer {
    return exportReportAsPdf(input)
  }

  /**
   * Generate report Excel buffer
   */
  static async generateReportExcelBuffer(
    title: string,
    columns: { key: string; label: string }[],
    rows: Record<string, string | number>[]
  ): Promise<Buffer> {
    return exportReportAsExcel(title, columns, rows)
  }
}

export { generateInvoicePdf, generateContractPdf, generateQuotePdf }
export { exportReportAsPdf, exportReportAsExcel }
