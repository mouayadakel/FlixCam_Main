/**
 * WhatsApp Quick Rent Button – opens wa.me with prefilled message.
 * Reads WhatsApp number from env or siteConfig.
 */

'use client'

import { useLocale } from '@/hooks/use-locale'
import { siteConfig } from '@/config/site.config'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WhatsAppRentButtonProps {
  equipmentName: string
  equipmentId: string
}

export function WhatsAppRentButton({ equipmentName, equipmentId }: WhatsAppRentButtonProps) {
  const { t, locale } = useLocale()
  const waNumber = siteConfig.contact.whatsappNumber

  const messageAr = `مرحباً، أود الاستفسار عن تأجير: ${equipmentName}\nhttps://flixcam.rent/equipment/${equipmentId}`
  const messageEn = `Hi, I'd like to inquire about renting: ${equipmentName}\nhttps://flixcam.rent/equipment/${equipmentId}`
  const message = locale === 'ar' ? messageAr : messageEn

  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`

  return (
    <Button
      asChild
      variant="outline"
      size="lg"
      className="h-12 w-full rounded-xl border-emerald-500/30 bg-emerald-50 font-semibold text-emerald-700 transition-all hover:bg-emerald-500 hover:text-white"
    >
      <a href={waUrl} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="me-2 h-5 w-5" />
        {t('common.whatsappRent')}
      </a>
    </Button>
  )
}
