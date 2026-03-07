/**
 * Blog newsletter CTA - compact signup reusing /api/newsletter/subscribe.
 */

'use client'

import { useState } from 'react'
import { Mail, ArrowRight } from 'lucide-react'
import { trackBlogEvent } from '@/lib/analytics'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface BlogNewsletterCtaProps {
  locale: string
}

const COPY = {
  ar: {
    title: 'اشترك في النشرة البريدية',
    description: 'احصل على أحدث المقالات ونصائح التأجير مباشرة في بريدك.',
    placeholder: 'بريدك الإلكتروني',
    button: 'اشترك',
    success: 'شكراً! تم الاشتراك بنجاح.',
    error: 'حدث خطأ. حاول مرة أخرى.',
  },
  en: {
    title: 'Subscribe to our newsletter',
    description: 'Get the latest articles and rental tips delivered to your inbox.',
    placeholder: 'Your email',
    button: 'Subscribe',
    success: 'Thanks! You\'re subscribed.',
    error: 'Something went wrong. Please try again.',
  },
}

export function BlogNewsletterCta({ locale }: BlogNewsletterCtaProps) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const t = locale === 'ar' ? COPY.ar : COPY.en

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || t.error)
      setSuccess(true)
      setEmail('')
      trackBlogEvent('blog_newsletter_signup', { source: 'blog_post' })
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="my-12 rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-brand-primary/10 p-2">
            <Mail className="h-5 w-5 text-brand-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{t.title}</h3>
            <p className="mt-0.5 text-sm text-gray-600">{t.description}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex w-full max-w-sm gap-2 sm:shrink-0" noValidate>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.placeholder}
            className="h-10 flex-1"
            disabled={submitting || success}
            required
            aria-label={t.placeholder}
          />
          <Button type="submit" disabled={submitting || success} size="sm" className="h-10 gap-1 px-4">
            {submitting ? (
              <span className="text-xs">{locale === 'ar' ? 'جاري...' : 'Subscribing...'}</span>
            ) : success ? (
              <span className="text-xs text-green-600">✓</span>
            ) : (
              <>
                <span className="text-xs">{t.button}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </form>
      </div>
      {success && (
        <p className="mt-3 text-sm text-green-600" role="status" data-testid="newsletter-success">
          {t.success}
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert" data-testid="newsletter-error">
          {error}
        </p>
      )}
    </section>
  )
}
