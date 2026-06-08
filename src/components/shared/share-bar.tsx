'use client'

import { useState } from 'react'
import {
  Share2,
  Check,
  MessageCircle,
  Send,
  Linkedin,
  Facebook,
  Mail,
  Link2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useReferral } from '@/hooks/use-referral'

export interface UniversalShareBarProps {
  url: string
  title: string
  description?: string
  imageUrl?: string
  layout?: 'horizontal' | 'vertical'
  showLabels?: boolean
  className?: string
  onShare?: (platform: string) => void
}

function buildLinks(url: string, title: string, description: string, imageUrl: string) {
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)
  const encodedDesc = encodeURIComponent(description || title)
  const media = encodeURIComponent(imageUrl || '')
  return {
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${media}&description=${encodedDesc}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDesc}%20${encodedUrl}`,
  }
}

export function UniversalShareBar({
  url,
  title,
  description,
  imageUrl = '',
  layout = 'horizontal',
  showLabels = false,
  className,
  onShare,
}: UniversalShareBarProps) {
  const [copied, setCopied] = useState(false)
  const { getReferralUrl } = useReferral()
  const referralUrl = getReferralUrl(url)
  const links = buildLinks(referralUrl, title, description ?? title, imageUrl)

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(referralUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      onShare?.('copy')
    } catch {
      /* ignore */
    }
  }

  const itemClass =
    'inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium text-white transition-opacity hover:opacity-90'

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2',
        layout === 'vertical' ? 'flex-col items-stretch' : '',
        className
      )}
      role="group"
      aria-label="Share"
    >
      <span className="text-sm font-medium text-muted-foreground">مشاركة / Share</span>
      <div className={cn('flex flex-wrap gap-1.5', layout === 'vertical' ? 'flex-col' : '')}>
        <a
          href={links.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(itemClass, 'bg-emerald-600')}
          aria-label="WhatsApp"
          onClick={() => onShare?.('whatsapp')}
        >
          <MessageCircle className="h-4 w-4 shrink-0" />
          {showLabels && <span>WhatsApp</span>}
        </a>
        <a
          href={links.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(itemClass, 'bg-blue-600')}
          aria-label="Facebook"
          onClick={() => onShare?.('facebook')}
        >
          <Facebook className="h-4 w-4 shrink-0" />
          {showLabels && <span>Facebook</span>}
        </a>
        <a
          href={links.twitter}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(itemClass, 'bg-neutral-900')}
          aria-label="X"
          onClick={() => onShare?.('twitter')}
        >
          <Share2 className="h-4 w-4 shrink-0" />
          {showLabels && <span>X</span>}
        </a>
        <a
          href={links.telegram}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(itemClass, 'bg-sky-500')}
          aria-label="Telegram"
          onClick={() => onShare?.('telegram')}
        >
          <Send className="h-4 w-4 shrink-0" />
          {showLabels && <span>Telegram</span>}
        </a>
        <a
          href={links.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(itemClass, 'bg-blue-800')}
          aria-label="LinkedIn"
          onClick={() => onShare?.('linkedin')}
        >
          <Linkedin className="h-4 w-4 shrink-0" />
          {showLabels && <span>LinkedIn</span>}
        </a>
        <a
          href={links.pinterest}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(itemClass, 'bg-red-600')}
          aria-label="Pinterest"
          onClick={() => onShare?.('pinterest')}
        >
          <span className="text-xs font-bold" aria-hidden>
            P
          </span>
          {showLabels && <span>Pinterest</span>}
        </a>
        <a
          href={links.email}
          className={cn(itemClass, 'bg-neutral-500')}
          aria-label="Email"
          onClick={() => onShare?.('email')}
        >
          <Mail className="h-4 w-4 shrink-0" />
          {showLabels && <span>Email</span>}
        </a>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 rounded-full"
          onClick={() => void handleCopy()}
          aria-label="Copy link"
        >
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Link2 className="h-4 w-4" />}
          {showLabels && <span className="ms-1">{copied ? 'Copied' : 'Copy'}</span>}
        </Button>
      </div>
    </div>
  )
}
