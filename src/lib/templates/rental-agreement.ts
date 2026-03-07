/**
 * @file rental-agreement.ts
 * @description Generates an HTML rental agreement for PDF rendering
 * @module lib/templates
 */

interface ContractEquipmentItem {
  name: string
  sku: string
  quantity: number
  dailyRate: number
}

interface ContractHtmlParams {
  bookingNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string | null
  customerId: string
  equipment: ContractEquipmentItem[]
  startDate: Date
  endDate: Date
  rentalDays: number
  subtotal: number
  vatAmount: number
  totalAmount: number
  depositAmount: number | null
  companyName: string
  companyAddress: string
  companyVatNumber: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

/**
 * Generates an HTML rental agreement suitable for PDF rendering.
 *
 * @param params - Contract data including parties, equipment, and financial details
 * @returns Complete HTML string with inline CSS
 */
export function generateContractHtml(params: ContractHtmlParams): string {
  const {
    bookingNumber,
    customerName,
    customerEmail,
    customerPhone,
    customerId,
    equipment,
    startDate,
    endDate,
    rentalDays,
    subtotal,
    vatAmount,
    totalAmount,
    depositAmount,
    companyName,
    companyAddress,
    companyVatNumber,
  } = params

  const agreementDate = formatDate(new Date())

  const equipmentRows = equipment
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${item.name}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; text-align: center;">${item.sku}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; text-align: right;">${formatCurrency(item.dailyRate)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; text-align: right;">${formatCurrency(item.dailyRate * item.quantity * rentalDays)}</td>
      </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Rental Agreement - ${bookingNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; color: #1f2937; background: #ffffff; line-height: 1.6;">
  <div style="max-width: 800px; margin: 0 auto; padding: 40px 32px;">

    <!-- Header -->
    <div style="text-align: center; border-bottom: 3px solid #111827; padding-bottom: 24px; margin-bottom: 32px;">
      <h1 style="margin: 0 0 4px 0; font-size: 28px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 1px;">${companyName}</h1>
      <p style="margin: 0 0 16px 0; font-size: 13px; color: #6b7280;">${companyAddress}</p>
      <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #374151;">EQUIPMENT RENTAL AGREEMENT</h2>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">Agreement No: <strong>${bookingNumber}</strong> &nbsp;|&nbsp; Date: <strong>${agreementDate}</strong></p>
    </div>

    <!-- Parties -->
    <div style="display: flex; gap: 24px; margin-bottom: 32px;">
      <div style="flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Lessor (Company)</h3>
        <p style="margin: 0 0 4px 0; font-size: 14px;"><strong>${companyName}</strong></p>
        <p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280;">${companyAddress}</p>
        <p style="margin: 0; font-size: 13px; color: #6b7280;">VAT: ${companyVatNumber}</p>
      </div>
      <div style="flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Lessee (Customer)</h3>
        <p style="margin: 0 0 4px 0; font-size: 14px;"><strong>${customerName}</strong></p>
        <p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280;">${customerEmail}</p>
        ${customerPhone ? `<p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280;">${customerPhone}</p>` : ''}
        <p style="margin: 0; font-size: 13px; color: #6b7280;">ID: ${customerId}</p>
      </div>
    </div>

    <!-- Rental Period -->
    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px 20px; margin-bottom: 32px;">
      <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1e40af;">Rental Period</h3>
      <p style="margin: 0; font-size: 14px;">
        <strong>${formatDate(startDate)}</strong> &mdash; <strong>${formatDate(endDate)}</strong>
        &nbsp;(${rentalDays} day${rentalDays !== 1 ? 's' : ''})
      </p>
    </div>

    <!-- Equipment Table -->
    <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #111827;">Equipment Details</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <thead>
        <tr style="background: #111827;">
          <th style="padding: 12px; font-size: 12px; font-weight: 600; color: #ffffff; text-align: left; text-transform: uppercase; letter-spacing: 0.5px;">Equipment</th>
          <th style="padding: 12px; font-size: 12px; font-weight: 600; color: #ffffff; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">SKU</th>
          <th style="padding: 12px; font-size: 12px; font-weight: 600; color: #ffffff; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
          <th style="padding: 12px; font-size: 12px; font-weight: 600; color: #ffffff; text-align: right; text-transform: uppercase; letter-spacing: 0.5px;">Daily Rate</th>
          <th style="padding: 12px; font-size: 12px; font-weight: 600; color: #ffffff; text-align: right; text-transform: uppercase; letter-spacing: 0.5px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${equipmentRows}
      </tbody>
    </table>

    <!-- Financial Summary -->
    <div style="display: flex; justify-content: flex-end; margin-bottom: 32px;">
      <table style="width: 320px; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 12px; font-size: 14px; color: #6b7280;">Subtotal</td>
          <td style="padding: 8px 12px; font-size: 14px; text-align: right;">${formatCurrency(subtotal)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; font-size: 14px; color: #6b7280;">VAT (15%)</td>
          <td style="padding: 8px 12px; font-size: 14px; text-align: right;">${formatCurrency(vatAmount)}</td>
        </tr>
        <tr style="border-top: 2px solid #111827;">
          <td style="padding: 12px; font-size: 16px; font-weight: 700;">Total Amount</td>
          <td style="padding: 12px; font-size: 16px; font-weight: 700; text-align: right;">${formatCurrency(totalAmount)}</td>
        </tr>
        ${
          depositAmount !== null
            ? `<tr>
          <td style="padding: 8px 12px; font-size: 14px; color: #6b7280;">Security Deposit</td>
          <td style="padding: 8px 12px; font-size: 14px; text-align: right;">${formatCurrency(depositAmount)}</td>
        </tr>`
            : ''
        }
      </table>
    </div>

    <!-- Terms and Conditions -->
    <div style="margin-bottom: 32px;">
      <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #111827;">Terms and Conditions</h3>
      <ol style="margin: 0; padding: 0 0 0 20px; font-size: 13px; color: #374151;">
        <li style="margin-bottom: 10px;"><strong>Return Condition:</strong> All equipment must be returned in the same condition as received, subject to normal wear and tear. The Lessee is responsible for inspecting equipment at pickup and reporting any pre-existing damage immediately.</li>
        <li style="margin-bottom: 10px;"><strong>Damage Liability:</strong> The Lessee shall be held fully liable for any damage, loss, or theft of rented equipment during the rental period. Repair or replacement costs will be charged at current market value.</li>
        <li style="margin-bottom: 10px;"><strong>Late Return Fees:</strong> Equipment returned after the agreed end date will incur a late fee of 150% of the daily rental rate for each day or part thereof the equipment is overdue.</li>
        <li style="margin-bottom: 10px;"><strong>Deposit Return:</strong> The security deposit will be inspected and returned within 5 business days after equipment return, subject to deductions for any damage, loss, or outstanding fees.</li>
        <li style="margin-bottom: 10px;"><strong>Cancellation Policy:</strong> Cancellations made more than 48 hours before the rental start date will receive a full refund. Cancellations within 48 hours are subject to a 50% cancellation fee. No-shows forfeit the full rental amount.</li>
        <li style="margin-bottom: 10px;"><strong>Right to Refuse:</strong> The Lessor reserves the right to refuse rental service, terminate this agreement, or demand immediate return of equipment if the Lessee violates any terms of this agreement or if the equipment is being used in an unsafe or unauthorized manner.</li>
      </ol>
    </div>

    <!-- Signature Block -->
    <div style="border-top: 2px solid #e5e7eb; padding-top: 32px; margin-top: 32px;">
      <h3 style="margin: 0 0 24px 0; font-size: 16px; font-weight: 600; color: #111827;">Electronic Signature</h3>
      <div style="display: flex; gap: 48px;">
        <div style="flex: 1;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280;">Customer Signature</p>
          <div style="border-bottom: 2px solid #374151; height: 48px; margin-bottom: 8px;"></div>
          <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600;">${customerName}</p>
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">Signed electronically</p>
        </div>
        <div style="flex: 1;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280;">Company Representative</p>
          <div style="border-bottom: 2px solid #374151; height: 48px; margin-bottom: 8px;"></div>
          <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600;">${companyName}</p>
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">Authorized signatory</p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 11px; color: #9ca3af;">This is an electronically generated agreement. By signing, both parties agree to the terms and conditions outlined above.</p>
      <p style="margin: 4px 0 0 0; font-size: 11px; color: #9ca3af;">${companyName} &bull; ${companyAddress} &bull; VAT: ${companyVatNumber}</p>
    </div>

  </div>
</body>
</html>`
}

export type { ContractHtmlParams, ContractEquipmentItem }
