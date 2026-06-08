'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { useLocale } from '@/hooks/use-locale'
import {
  canDownloadBookingInvoice,
  getBookingInvoicePdfUrl,
} from '@/lib/portal/invoice-download'
import type { BookingStatus } from '@prisma/client'

type PortalInvoiceDownloadButtonProps = {
  booking: {
    id: string
    status: BookingStatus
    invoices?: { id: string }[]
  }
  size?: 'sm' | 'default'
}

export function PortalInvoiceDownloadButton({
  booking,
  size = 'sm',
}: PortalInvoiceDownloadButtonProps) {
  const { t } = useLocale()

  if (!canDownloadBookingInvoice(booking.status)) {
    return null
  }

  const href = getBookingInvoicePdfUrl(booking)

  return (
    <Button variant="outline" size={size} asChild>
      <a href={href} target="_blank" rel="noopener noreferrer">
        <Download className="ms-2 h-4 w-4" />
        {t('portal.download')}
      </a>
    </Button>
  )
}
