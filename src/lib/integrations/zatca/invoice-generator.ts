/**
 * @file zatca/invoice-generator.ts
 * @description ZATCA (Fatoora) invoice generator for Saudi tax compliance.
 *              Generates XML invoices, QR codes, and submits to ZATCA API.
 * @module integrations/zatca
 * @see /docs/features/invoices/ZATCA.md
 * @author Engineering Team
 * @created 2026-01-28
 */

import { XMLBuilder, XMLParser } from 'fast-xml-parser'
import { toDataURL } from 'qrcode'

export interface ZATCAInvoiceData {
  id: string
  issueDate: Date | string
  issueTime: string
  invoiceType: 'standard' | 'simplified' | 'credit' | 'debit'
  invoiceTypeCode: number
  currency: string
  totalAmount: number
  taxAmount: number
  totalAmountWithTax: number
  seller: {
    name: string
    vatNumber: string
    address: {
      street: string
      city: string
      postalCode: string
      country: string
    }
  }
  buyer: {
    name: string
    vatNumber?: string
    address?: {
      street: string
      city: string
      postalCode: string
      country: string
    }
  }
  items: Array<{
    name: string
    quantity: number
    unitPrice: number
    taxRate: number
    taxAmount: number
    totalAmount: number
  }>
}

export interface ZATCAInvoiceResult {
  uuid: string | null
  qrCode: string
  xml: string
  hash: string
  submitted: boolean
  error?: string
}

/**
 * Generate ZATCA-compliant invoice XML
 */
function generateInvoiceXML(data: ZATCAInvoiceData): string {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
    suppressEmptyNode: true,
  })

  const issueDate = typeof data.issueDate === 'string' 
    ? data.issueDate 
    : data.issueDate.toISOString().split('T')[0]
  
  const issueTime = data.issueTime || new Date().toTimeString().split(' ')[0]

  const invoice = {
    Invoice: {
      '@_xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
      '@_xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
      '@_xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
      '@_xmlns:ccts': 'urn:un:unece:uncefact:documentation:2',
      '@_xmlns:ext': 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
      '@_xmlns:qdt': 'urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2',
      '@_xmlns:udt': 'urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2',
      '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'cbc:ID': data.id,
      'cbc:IssueDate': issueDate,
      'cbc:IssueTime': issueTime,
      'cbc:InvoiceTypeCode': {
        '@_listID': 'UN/ECE 1001',
        '#text': data.invoiceTypeCode.toString(),
      },
      'cbc:DocumentCurrencyCode': {
        '@_listID': 'ISO 4217 Alpha',
        '#text': data.currency,
      },
      'cac:AccountingSupplierParty': {
        'cac:Party': {
          'cac:PartyLegalEntity': {
            'cbc:RegistrationName': data.seller.name,
            'cac:RegistrationAddress': {
              'cbc:CityName': data.seller.address.city,
              'cbc:PostalZone': data.seller.address.postalCode,
              'cac:Country': {
                'cbc:IdentificationCode': {
                  '@_listID': 'ISO 3166-1:Alpha2',
                  '#text': data.seller.address.country,
                },
              },
            },
          },
          'cac:PartyTaxScheme': {
            'cac:TaxScheme': {
              'cbc:ID': data.seller.vatNumber,
            },
          },
        },
      },
      'cac:AccountingCustomerParty': {
        'cac:Party': {
          'cac:PartyLegalEntity': {
            'cbc:RegistrationName': data.buyer.name,
            ...(data.buyer.vatNumber && {
              'cac:PartyTaxScheme': {
                'cac:TaxScheme': {
                  'cbc:ID': data.buyer.vatNumber,
                },
              },
            }),
            ...(data.buyer.address && {
              'cac:RegistrationAddress': {
                'cbc:CityName': data.buyer.address.city,
                'cbc:PostalZone': data.buyer.address.postalCode,
                'cac:Country': {
                  'cbc:IdentificationCode': {
                    '@_listID': 'ISO 3166-1:Alpha2',
                    '#text': data.buyer.address.country,
                  },
                },
              },
            }),
          },
        },
      },
      'cac:InvoiceLine': data.items.map((item, index) => ({
        'cbc:ID': (index + 1).toString(),
        'cbc:InvoicedQuantity': {
          '@_unitCode': 'C62',
          '#text': item.quantity.toString(),
        },
        'cbc:LineExtensionAmount': {
          '@_currencyID': data.currency,
          '#text': item.totalAmount.toFixed(2),
        },
        'cac:Item': {
          'cbc:Name': item.name,
          'cac:ClassifiedTaxCategory': {
            'cbc:ID': 'S',
            'cbc:Percent': item.taxRate.toString(),
            'cac:TaxScheme': {
              'cbc:ID': 'VAT',
            },
          },
        },
        'cac:Price': {
          'cbc:PriceAmount': {
            '@_currencyID': data.currency,
            '#text': item.unitPrice.toFixed(2),
          },
        },
      })),
      'cac:TaxTotal': {
        'cbc:TaxAmount': {
          '@_currencyID': data.currency,
          '#text': data.taxAmount.toFixed(2),
        },
        'cac:TaxSubtotal': data.items.map((item) => ({
          'cbc:TaxableAmount': {
            '@_currencyID': data.currency,
            '#text': (item.totalAmount - item.taxAmount).toFixed(2),
          },
          'cbc:TaxAmount': {
            '@_currencyID': data.currency,
            '#text': item.taxAmount.toFixed(2),
          },
          'cac:TaxCategory': {
            'cbc:ID': 'S',
            'cbc:Percent': item.taxRate.toString(),
            'cac:TaxScheme': {
              'cbc:ID': 'VAT',
            },
          },
        })),
      },
      'cac:LegalMonetaryTotal': {
        'cbc:TaxExclusiveAmount': {
          '@_currencyID': data.currency,
          '#text': (data.totalAmountWithTax - data.taxAmount).toFixed(2),
        },
        'cbc:TaxInclusiveAmount': {
          '@_currencyID': data.currency,
          '#text': data.totalAmountWithTax.toFixed(2),
        },
        'cbc:PayableAmount': {
          '@_currencyID': data.currency,
          '#text': data.totalAmountWithTax.toFixed(2),
        },
      },
    },
  }

  return builder.build(invoice)
}

/**
 * Generate QR code data string for ZATCA
 */
function generateQRCodeData(data: ZATCAInvoiceData): string {
  const sellerName = process.env.ZATCA_COMPANY_NAME || data.seller.name
  const sellerVAT = process.env.ZATCA_COMPANY_VAT || data.seller.vatNumber
  const issueDate = typeof data.issueDate === 'string' 
    ? data.issueDate 
    : data.issueDate.toISOString().split('T')[0]
  const issueTime = data.issueTime || new Date().toTimeString().split(' ')[0]
  const dateTime = `${issueDate}T${issueTime}Z`

  return [
    sellerName,
    sellerVAT,
    dateTime,
    data.totalAmountWithTax.toFixed(2),
    data.taxAmount.toFixed(2),
  ].join('|')
}

/**
 * Generate ZATCA-compliant invoice with XML and QR code
 * @param data - Invoice data
 * @returns Invoice result with XML, QR code, and submission status
 */
export async function generateZATCAInvoice(
  data: ZATCAInvoiceData
): Promise<ZATCAInvoiceResult> {
  try {
    // 1. Generate XML invoice
    const xmlInvoice = generateInvoiceXML(data)

    // 2. Generate QR code
    const qrData = generateQRCodeData(data)
    const qrCode = await toDataURL(qrData)

    // 3. Calculate hash (simplified - in production, use proper hashing algorithm)
    const crypto = require('crypto')
    const hash = crypto
      .createHash('sha256')
      .update(xmlInvoice)
      .digest('hex')

    // 4. Submit to ZATCA API (if configured)
    let uuid: string | null = null
    let submitted = false
    let error: string | undefined

    if (process.env.ZATCA_API_URL && process.env.ZATCA_API_KEY) {
      try {
        const response = await fetch(process.env.ZATCA_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.ZATCA_API_KEY}`,
            'Content-Type': 'application/xml',
            'Accept': 'application/json',
          },
          body: xmlInvoice,
        })

        if (response.ok) {
          const result = await response.json()
          uuid = result.uuid || result.id || null
          submitted = true
        } else {
          const errorText = await response.text()
          error = `ZATCA API error: ${response.status} - ${errorText}`
        }
      } catch (apiError: any) {
        error = `Failed to submit to ZATCA: ${apiError.message}`
      }
    }

    return {
      uuid,
      qrCode,
      xml: xmlInvoice,
      hash,
      submitted,
      error,
    }
  } catch (error: any) {
    throw new Error(`Failed to generate ZATCA invoice: ${error.message}`)
  }
}

/**
 * Validate ZATCA invoice data
 */
export function validateZATCAInvoiceData(data: ZATCAInvoiceData): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!data.id) errors.push('Invoice ID is required')
  if (!data.issueDate) errors.push('Issue date is required')
  if (!data.seller.name) errors.push('Seller name is required')
  if (!data.seller.vatNumber) errors.push('Seller VAT number is required')
  if (!data.buyer.name) errors.push('Buyer name is required')
  if (data.items.length === 0) errors.push('At least one item is required')
  if (data.totalAmountWithTax <= 0) errors.push('Total amount must be greater than 0')
  if (data.taxAmount < 0) errors.push('Tax amount cannot be negative')

  // Validate items
  data.items.forEach((item, index) => {
    if (!item.name) errors.push(`Item ${index + 1}: Name is required`)
    if (item.quantity <= 0) errors.push(`Item ${index + 1}: Quantity must be greater than 0`)
    if (item.unitPrice <= 0) errors.push(`Item ${index + 1}: Unit price must be greater than 0`)
    if (item.taxRate < 0 || item.taxRate > 100) {
      errors.push(`Item ${index + 1}: Tax rate must be between 0 and 100`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}
