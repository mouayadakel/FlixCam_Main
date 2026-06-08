import { Decimal } from '@prisma/client/runtime/library'
import { toDataURL } from 'qrcode'

export interface ZATCAQRData {
  sellerName: string
  vatNumber: string
  invoiceDate: Date
  totalWithVAT: Decimal | number | string
  vatAmount: Decimal | number | string
}

function tlv(tag: number, value: string): Buffer {
  const valueBuffer = Buffer.from(value, 'utf8')
  return Buffer.concat([Buffer.from([tag]), Buffer.from([valueBuffer.length]), valueBuffer])
}

/** ZATCA simplified QR expects local KSA timestamp (Asia/Riyadh), not UTC. */
export function formatZatcaInvoiceTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(' ', 'T')
}

export function generateZATCAQR(data: ZATCAQRData): string {
  const totalWithVAT = new Decimal(data.totalWithVAT).toFixed(2)
  const vatAmount = new Decimal(data.vatAmount).toFixed(2)

  const qrBuffer = Buffer.concat([
    tlv(1, data.sellerName),
    tlv(2, data.vatNumber),
    tlv(3, formatZatcaInvoiceTimestamp(data.invoiceDate)),
    tlv(4, totalWithVAT),
    tlv(5, vatAmount),
  ])

  return qrBuffer.toString('base64')
}

export async function generateQRDataURL(data: ZATCAQRData): Promise<string> {
  return toDataURL(generateZATCAQR(data), { margin: 1 })
}
