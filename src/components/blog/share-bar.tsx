/**
 * Share bar - Web Share API (mobile), WhatsApp, Telegram, X, LinkedIn, Copy link.
 */

'use client'

import { useState, useEffect } from 'react'
import { Share2, Check, MessageCircle, Send, Linkedin } from 'lucide-react'
import { trackBlogEvent } from '@/lib/analytics'
import { Button } from '@/components/ui/button'

interface ShareBarProps {
  url: string
  title: string
  locale: string
  postId?: string
}

function shareUrl(platform: string, url: string, title: string): string {
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)
  switch (platform) {
    case 'whatsapp':
      return `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`
    case 'telegram':
      return `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`
    case 'twitter':
      return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
    default:
      return url
  }
}

export function ShareBar({ url, title, locale, postId }: ShareBarProps) {
  const [copied, setCopied] = useState(false)
  const [canNativeShare, setCanNativeShare] = useState(false)

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && !!navigator.share)
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url,
          text: title,
        })
        trackBlogEvent('blog_share', { method: 'native', post_id: postId ?? '' })
      } catch {
        // user cancelled or error
      }
    }
  }

  const handlePlatformShare = (platform: string) => {
    trackBlogEvent('blog_share', { method: platform, post_id: postId ?? '' })
  }

  const shareLabel = locale === 'ar' ? 'شارك' : 'Share'
  const copyLabel = locale === 'ar' ? 'نسخ الرابط' : 'Copy link'
  const nativeShareLabel = locale === 'ar' ? 'مشاركة' : 'Share'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-gray-600">{shareLabel}:</span>
      <div className="flex items-center gap-1">
        {canNativeShare ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 px-2"
            onClick={handleNativeShare}
            aria-label={nativeShareLabel}
          >
            <Share2 className="h-4 w-4" />
            <span className="text-xs">{nativeShareLabel}</span>
          </Button>
        ) : (
          <>
            <Button variant="outline" size="sm" asChild className="h-8 w-8 p-0" aria-label="Share on WhatsApp">
              <a
                href={shareUrl('whatsapp', url, title)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                onClick={() => handlePlatformShare('whatsapp')}
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild className="h-8 w-8 p-0" aria-label="Share on Telegram">
              <a
                href={shareUrl('telegram', url, title)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
                onClick={() => handlePlatformShare('telegram')}
              >
                <Send className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild className="h-8 w-8 p-0" aria-label="Share on X">
              <a
                href={shareUrl('twitter', url, title)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                onClick={() => handlePlatformShare('twitter')}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild className="h-8 w-8 p-0" aria-label="Share on LinkedIn">
              <a
                href={shareUrl('linkedin', url, title)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                onClick={() => handlePlatformShare('linkedin')}
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </Button>
          </>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2"
          onClick={handleCopy}
          aria-label={copyLabel}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <span className="text-xs">{copyLabel}</span>
          )}
        </Button>
      </div>
    </div>
  )
}
