/**
 * @file daftra.service.ts
 * @description Service for syncing with Daftra ERP API v2 and ZATCA compliance
 * @module lib/services/daftra
 */

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { AuditService } from './audit.service'
import { IntegrationConfigService } from './integration-config.service'
import { generateZATCAQR } from '@/lib/zatca/qr'
import type {
  DaftraClientPayload,
  DaftraInvoicePayload,
  DaftraInvoiceResponse,
  DaftraClientResponse,
} from '../types/daftra.types'

export class DaftraService {
  /**
   * Helper to format dates for Daftra API (YYYY-MM-DD)
   */
  private static formatDate(date: Date | string): string {
    const d = new Date(date)
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const year = d.getFullYear()
    return `${year}-${month}-${day}`
  }

  /**
   * Test connection to Daftra API using custom api key and subdomain
   */
  static async testConnection(apiKey: string, subdomain: string): Promise<{ success: boolean; message: string }> {
    if (!apiKey || !subdomain) {
      return {
        success: false,
        message: 'API Key and Subdomain are required',
      }
    }

    try {
      const cleanSubdomain = subdomain.trim().toLowerCase().replace('.daftra.com', '')
      const response = await fetch(`https://${cleanSubdomain}.daftra.com/api2/clients?limit=1`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'apikey': apiKey,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('[DaftraService] testConnection failed', { status: response.status, errorText })
        return {
          success: false,
          message: `Connection failed: ${response.status} ${response.statusText}`,
        }
      }

      return {
        success: true,
        message: 'Daftra connection successful. Subdomain and API Key verified.',
      }
    } catch (error: any) {
      logger.error('[DaftraService] testConnection error', { error: error.message })
      return {
        success: false,
        message: error.message || 'Connection test failed',
      }
    }
  }

  /**
   * Retrieve active Daftra integration credentials
   */
  private static async getCredentials() {
    const config = await IntegrationConfigService.getConfig('daftra')
    if (!config || !config.enabled) {
      return null
    }
    const apiKey = config.config.apiKey
    const subdomain = config.config.subdomain
    if (!apiKey || !subdomain) {
      return null
    }
    return {
      apiKey,
      subdomain: subdomain.trim().toLowerCase().replace('.daftra.com', ''),
    }
  }

  /**
   * Sync a local invoice to Daftra ERP
   */
  static async syncInvoice(invoiceId: string, userId: string): Promise<{ success: boolean; message: string; daftraUrl?: string }> {
    const creds = await this.getCredentials()
    if (!creds) {
      return {
        success: false,
        message: 'Daftra integration is not configured or disabled',
      }
    }

    const { apiKey, subdomain } = creds

    try {
      // 1. Fetch full local invoice details
      const invoice = (await prisma.invoice.findFirst({
        where: { id: invoiceId, deletedAt: null },
        include: {
          lineItems: { orderBy: { sortOrder: 'asc' } },
          customer: true,
          payments: true,
        },
      })) as any

      if (!invoice) {
        return { success: false, message: 'Invoice not found' }
      }

      if (!invoice.customer) {
        return { success: false, message: 'Invoice has no associated customer record' }
      }

      // Check if already synced
      if (invoice.zatcaHash && invoice.zatcaHash.startsWith('daftra_')) {
        const daftraId = invoice.zatcaHash.replace('daftra_', '')
        return {
          success: true,
          message: 'Invoice is already synced with Daftra',
          daftraUrl: `https://${subdomain}.daftra.com/v2/invoices/${daftraId}`,
        }
      }

      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'apikey': apiKey,
      }

      // 2. Sync / Search client in Daftra
      let daftraClientId: number | null = null
      const emailQuery = encodeURIComponent(invoice.customer.email)
      
      const searchResponse = await fetch(
        `https://${subdomain}.daftra.com/api2/clients?email=${emailQuery}`,
        { method: 'GET', headers }
      )

      if (searchResponse.ok) {
        const searchResult = await searchResponse.json()
        const clientsList = Array.isArray(searchResult) 
          ? searchResult 
          : (searchResult.data || searchResult.result || searchResult.Client || [])
        
        const matched = Array.isArray(clientsList) 
          ? clientsList.find((c: any) => c.email?.toLowerCase() === invoice.customer.email.toLowerCase())
          : null

        if (matched?.id) {
          daftraClientId = matched.id
        }
      }

      // Create client if not found
      if (!daftraClientId) {
        const clientPayload: DaftraClientPayload = {
          Client: {
            name: invoice.customer.name || invoice.customer.email.split('@')[0],
            type: 'individual',
            email: invoice.customer.email,
            phone: invoice.customer.phone || undefined,
            address: invoice.customer.billingAddress || undefined,
            tax_number: invoice.customer.taxId || undefined,
          },
        }

        const createClientResponse = await fetch(
          `https://${subdomain}.daftra.com/api2/clients`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(clientPayload),
          }
        )

        if (!createClientResponse.ok) {
          const errText = await createClientResponse.text()
          throw new Error(`Failed to create client in Daftra: ${createClientResponse.status} ${errText}`)
        }

        const createClientResult = await createClientResponse.json()
        const createdClient: DaftraClientResponse = createClientResult.Client || createClientResult.data || createClientResult
        
        if (!createdClient?.id) {
          throw new Error('Daftra returned invalid client response missing ID')
        }
        daftraClientId = createdClient.id
      }

      // 3. Construct Invoice Items with Standard 15% VAT mapping in Daftra
      const invoiceItems = invoice.lineItems.map((item: any) => ({
        item: item.description,
        description: item.description,
        unit_price: typeof item.unitPrice === 'object' && item.unitPrice?.toNumber ? item.unitPrice.toNumber() : Number(item.unitPrice),
        quantity: item.quantity,
        tax_id: 1, // Default Daftra standard 15% VAT rate
      }))

      // Construct payment if invoice is fully or partially paid
      const paidAmount = typeof invoice.paidAmount === 'object' && invoice.paidAmount?.toNumber ? invoice.paidAmount.toNumber() : Number(invoice.paidAmount)
      const invoicePayments = paidAmount > 0 ? [{
        payment_method: 'Cash',
        amount: paidAmount,
        date: this.formatDate(new Date()),
      }] : undefined

      const discountAmount = typeof invoice.discountAmount === 'object' && invoice.discountAmount?.toNumber ? invoice.discountAmount.toNumber() : Number(invoice.discountAmount)

      // 4. Create Invoice in Daftra
      const invoicePayload: DaftraInvoicePayload = {
        Invoice: {
          client_id: daftraClientId,
          date: this.formatDate(invoice.issueDate),
          due_date: this.formatDate(invoice.dueDate),
          currency_code: 'SAR',
          notes: invoice.notes || 'Synced from FlixCam renting platform',
          discount: discountAmount || 0,
          draft: invoice.status === 'DRAFT',
          invoice_number: invoice.invoiceNumber,
        },
        InvoiceItem: invoiceItems,
        Payment: invoicePayments,
      }

      const createInvoiceResponse = await fetch(
        `https://${subdomain}.daftra.com/api2/invoices`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(invoicePayload),
        }
      )

      if (!createInvoiceResponse.ok) {
        const errText = await createInvoiceResponse.text()
        throw new Error(`Failed to create invoice in Daftra: ${createInvoiceResponse.status} ${errText}`)
      }

      const createInvoiceResult = await createInvoiceResponse.json()
      const daftraInvoice: DaftraInvoiceResponse = createInvoiceResult.Invoice || createInvoiceResult.data || createInvoiceResult

      if (!daftraInvoice?.id) {
        throw new Error('Daftra invoice creation response was invalid or missing ID')
      }

      const daftraId = String(daftraInvoice.id)
      const daftraUrl = `https://${subdomain}.daftra.com/v2/invoices/${daftraId}`

      // 5. ZATCA Compliance QR Sync
      // If Daftra returned a ZATCA QR, use it. Otherwise, fall back to our local verified ZATCA QR generator
      let zatcaQR = daftraInvoice.zatca_qr || null
      if (!zatcaQR) {
        const company = await prisma.companySettings.findFirst({
          select: { nameEn: true, nameAr: true, vatNumber: true },
        })
        if (company?.vatNumber) {
          const totalAmount = typeof invoice.totalAmount === 'object' && invoice.totalAmount?.toNumber ? invoice.totalAmount.toNumber() : Number(invoice.totalAmount)
          const vatAmount = typeof invoice.vatAmount === 'object' && invoice.vatAmount?.toNumber ? invoice.vatAmount.toNumber() : Number(invoice.vatAmount)
          
          zatcaQR = generateZATCAQR({
            sellerName: company.nameAr || company.nameEn,
            vatNumber: company.vatNumber,
            invoiceDate: invoice.issueDate,
            totalWithVAT: totalAmount,
            vatAmount: vatAmount,
          })
        }
      }

      // Update local invoice state with Daftra details and QR code
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          zatcaHash: `daftra_${daftraId}`,
          zatcaQR: zatcaQR,
          zatcaStatus: 'ACCEPTED',
          notes: invoice.notes ? `${invoice.notes}\n[Daftra Synced: ${daftraUrl}]` : `[Daftra Synced: ${daftraUrl}]`,
        },
      })

      // Log success audit log
      await AuditService.log({
        action: 'invoice.daftra.synced',
        userId,
        resourceType: 'invoice',
        resourceId: invoiceId,
        metadata: { daftraInvoiceId: daftraId, daftraUrl },
      })

      return {
        success: true,
        message: `Successfully synced invoice with Daftra (ID: ${daftraId})`,
        daftraUrl,
      }
    } catch (error: any) {
      logger.error('[DaftraService] syncInvoice failed', { invoiceId, error: error.message })
      
      // Update local invoice ZATCA status to REJECTED on exception
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { zatcaStatus: 'REJECTED' },
      }).catch(() => {})

      return {
        success: false,
        message: error.message || 'Sync operation failed',
      }
    }
  }
}
