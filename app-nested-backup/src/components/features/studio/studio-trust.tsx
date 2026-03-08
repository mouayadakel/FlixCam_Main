/**
 * Studio trust: reviews, WhatsApp, share
 */

'use client'

import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { MessageCircle, Share2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useLocale } from '@/hooks/use-locale'
import type { StudioPublicData } from '@/lib/types/studio.types'

interface StudioTrustProps {
  studio: StudioPublicData
}

export function StudioTrust({ studio }: StudioTrustProps) {
  const { toast } = useToast()
  const { t } = useLocale()

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(shareUrl)}`

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(shareUrl)
    toast({ title: t('common.done'), description: t('studios.linkCopied') })
  }, [shareUrl, toast, t])

  if (!studio.reviewsText && !studio.whatsappNumber) return null

  return (
    <section
      className="space-y-5 rounded-2xl border border-border-light/40 bg-white p-6 shadow-card"
      dir="rtl"
    >
      <h3 className="text-lg font-semibold text-text-heading">{t('studios.trust')}</h3>
      {studio.reviewsText && (
        <p className="text-sm leading-relaxed text-text-body">{studio.reviewsText}</p>
      )}
      <div className="flex flex-wrap gap-2.5">
        {studio.whatsappNumber && (
          <Button
            variant="outline"
            size="sm"
            asChild
            className="rounded-xl border-brand-secondary-accent/30 text-brand-secondary-accent hover:bg-brand-secondary-accent/5"
          >
            <a
              href={`https://wa.me/${studio.whatsappNumber.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              {t('studios.askBeforeBooking')}
            </a>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={copyLink}
          className="inline-flex items-center gap-2 rounded-xl"
        >
          <Share2 className="h-4 w-4" />
          {t('studios.copyLink')}
        </Button>
        {studio.whatsappNumber && (
          <Button variant="ghost" size="sm" asChild className="rounded-xl">
            <a
              href={whatsappShare}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2"
            >
              {t('studios.shareViaWhatsapp')}
            </a>
          </Button>
        )}
      </div>
    </section>
  )
}
