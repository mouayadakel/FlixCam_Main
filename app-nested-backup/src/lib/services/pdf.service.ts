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
    return generateInvoicePdf(input.invoice, {
      locale: input.locale ?? 'en',
      includeZatcaQr: input.includeZatcaQr ?? false,
      qrPayload: input.qrPayload,
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
