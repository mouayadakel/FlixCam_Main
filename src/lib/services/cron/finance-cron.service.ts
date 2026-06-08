/**
 * Phase 8 — Finance automation crons.
 */

import { prisma } from '@/lib/db/prisma'
import { generateZATCAQR } from '@/lib/zatca/qr'
import { EmailService } from '@/lib/services/email.service'
import { PaymentService } from '@/lib/services/payment.service'
import { alertAdmins } from '@/lib/services/cron-alert.service'
import { getCronActorId, wrapCronJob } from './cron-utils'
import { subDays } from 'date-fns'

export const runZatcaInvoiceSync = wrapCronJob('zatca-invoice-sync', async () => {
  const company = await prisma.companySettings.findFirst({
    select: { vatNumber: true, nameAr: true, nameEn: true, zatcaEnabled: true },
  })

  if (!company?.vatNumber) {
    return { skipped: true, reason: 'Company VAT number not configured' }
  }

  const pending = await prisma.invoice.findMany({
    where: {
      deletedAt: null,
      zatcaStatus: 'PENDING',
      status: { in: ['SENT', 'PAID', 'PARTIALLY_PAID'] },
    },
    take: 50,
  })

  let updated = 0
  for (const inv of pending) {
    const qr = generateZATCAQR({
      sellerName: company.nameAr || company.nameEn || 'FlixCam',
      vatNumber: company.vatNumber,
      invoiceDate: inv.issueDate,
      totalWithVAT: Number(inv.totalAmount),
      vatAmount: Number(inv.vatAmount),
    })
    await prisma.invoice.update({
      where: { id: inv.id },
      data: {
        zatcaQR: qr,
        zatcaStatus: company.zatcaEnabled ? 'SUBMITTED' : 'ACCEPTED',
      },
    })
    updated++
  }

  return { scanned: pending.length, updated, zatcaEnabled: company.zatcaEnabled }
})

export const runAutoRefundCancelled = wrapCronJob('auto-refund-cancelled', async () => {
  const actorId = await getCronActorId()
  const windowStart = subDays(new Date(), 7)

  const cancelled = await prisma.booking.findMany({
    where: {
      deletedAt: null,
      status: 'CANCELLED',
      updatedAt: { gte: windowStart },
    },
    select: { id: true, bookingNumber: true },
    take: 20,
  })

  let attempted = 0
  let refunded = 0
  let skipped = 0

  for (const booking of cancelled) {
    const payment = await prisma.payment.findFirst({
      where: {
        bookingId: booking.id,
        deletedAt: null,
        status: 'SUCCESS',
      },
    })
    if (!payment) {
      skipped++
      continue
    }

    const existingRefund = await prisma.refund.findFirst({
      where: { paymentId: payment.id },
    })
    if (existingRefund) {
      skipped++
      continue
    }

    const policyHours = Number(process.env.AUTO_REFUND_POLICY_HOURS || 48)
    const ageHours = (Date.now() - payment.updatedAt.getTime()) / 3_600_000
    if (ageHours < policyHours) {
      skipped++
      continue
    }

    attempted++
    try {
      const result = await PaymentService.refundBookingCancellationPayments({
        bookingId: booking.id,
        userId: actorId,
        refundAmountSar: Number(payment.amount),
        reason: `Auto-refund: booking ${booking.bookingNumber} cancelled`,
      })
      if (result.refundedSar > 0) refunded++
      else if (result.errors.length) throw new Error(result.errors.join('; '))
    } catch (err) {
      await prisma.auditLog.create({
        data: {
          action: 'cron.auto_refund.failed',
          resourceType: 'Payment',
          resourceId: payment.id,
          metadata: {
            bookingId: booking.id,
            error: err instanceof Error ? err.message : String(err),
          },
        },
      })
    }
  }

  return { cancelledBookings: cancelled.length, attempted, refunded, skipped }
})

export const runVendorStatements = wrapCronJob('vendor-statements', async () => {
  const periodEnd = new Date()
  const periodStart = subDays(periodEnd, 30)

  const vendors = await prisma.vendor.findMany({
    where: { deletedAt: null, status: 'APPROVED' },
    select: {
      id: true,
      companyName: true,
      email: true,
      payouts: {
        where: { createdAt: { gte: periodStart, lte: periodEnd } },
        select: { netAmount: true, status: true, paidAt: true },
      },
    },
    take: 100,
  })

  let emailed = 0
  for (const vendor of vendors) {
    if (!vendor.email || vendor.payouts.length === 0) continue

    const total = vendor.payouts.reduce((s, p) => s + Number(p.netAmount), 0)
    const paid = vendor.payouts.filter((p) => p.status === 'PAID').length

    await EmailService.send({
      to: vendor.email,
      subject: `FlixCam vendor statement — ${periodStart.toLocaleDateString()} to ${periodEnd.toLocaleDateString()}`,
      html: `<p>Hello ${vendor.companyName},</p>
        <p>Your monthly summary:</p>
        <ul>
          <li>Payouts: ${vendor.payouts.length}</li>
          <li>Paid: ${paid}</li>
          <li>Net total: ${total.toFixed(2)} SAR</li>
        </ul>`,
    })
    emailed++
  }

  return { vendors: vendors.length, emailed, periodStart: periodStart.toISOString() }
})

export const runInvoiceDunning = wrapCronJob('invoice-dunning', async () => {
  const overdue = await prisma.invoice.findMany({
    where: { deletedAt: null, status: 'OVERDUE' },
    include: { customer: { select: { id: true, email: true, name: true } } },
    take: 50,
  })

  let reminders = 0
  const tiers = [
    { days: 1, action: 'cron.dunning.day1' },
    { days: 7, action: 'cron.dunning.day7' },
    { days: 14, action: 'cron.dunning.day14' },
  ]

  for (const invoice of overdue) {
    if (!invoice.dueDate || !invoice.customer.email) continue
    const daysOverdue = Math.floor(
      (Date.now() - invoice.dueDate.getTime()) / (24 * 60 * 60_000)
    )

    for (const tier of tiers) {
      if (daysOverdue < tier.days || daysOverdue > tier.days + 1) continue

      const sent = await prisma.auditLog.findFirst({
        where: { action: tier.action, resourceId: invoice.id },
      })
      if (sent) continue

      await EmailService.send({
        to: invoice.customer.email,
        subject: `Reminder: Invoice ${invoice.invoiceNumber} is overdue`,
        html: `<p>Dear ${invoice.customer.name || 'customer'},</p>
          <p>Invoice <strong>${invoice.invoiceNumber}</strong> is ${daysOverdue} days overdue.
          Please pay as soon as possible.</p>`,
      })

      await prisma.auditLog.create({
        data: {
          action: tier.action,
          resourceType: 'Invoice',
          resourceId: invoice.id,
          userId: invoice.customerId,
          metadata: { daysOverdue, invoiceNumber: invoice.invoiceNumber },
        },
      })
      reminders++
    }
  }

  return { overdueInvoices: overdue.length, remindersSent: reminders }
})
