/**
 * Contact form – name, email, phone (optional), subject, message.
 * Submits to /api/public/contact and shows success/error feedback.
 */

'use client'

import { useState } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const SUBJECT_OPTIONS = [
  { value: 'general', key: 'contactPage.subjectGeneral' },
  { value: 'booking', key: 'contactPage.subjectBooking' },
  { value: 'technical', key: 'contactPage.subjectTechnical' },
  { value: 'partnership', key: 'contactPage.subjectPartnership' },
  { value: 'other', key: 'contactPage.subjectOther' },
] as const

export function ContactForm() {
  const { t } = useLocale()
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [subject, setSubject] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const sub = subject || 'general'
    const data = {
      name: String(formData.get('name')).trim(),
      email: String(formData.get('email')).trim(),
      phone: String(formData.get('phone')).trim() || undefined,
      subject: sub,
      message: String(formData.get('message')).trim(),
    }

    if (!data.name || !data.email || !data.message) {
      setStatus('error')
      setErrorMessage(t('contactPage.error'))
      return
    }

    setStatus('submitting')
    setErrorMessage(null)

    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus('error')
        setErrorMessage(json.error || t('contactPage.error'))
        return
      }
      setStatus('success')
      form.reset()
      setSubject('')
    } catch {
      setStatus('error')
      setErrorMessage(t('contactPage.error'))
    }
  }

  if (status === 'success') {
    return (
      <div
        className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center dark:border-green-800 dark:bg-green-950/30"
        role="alert"
      >
        <p className="text-lg font-medium text-green-800 dark:text-green-200">
          {t('contactPage.success')}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact-name">{t('contactPage.name')}</Label>
          <Input
            id="contact-name"
            name="name"
            type="text"
            required
            disabled={status === 'submitting'}
            className="w-full"
            dir="auto"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-email">{t('contactPage.email')}</Label>
          <Input
            id="contact-email"
            name="email"
            type="email"
            required
            disabled={status === 'submitting'}
            className="w-full"
            dir="ltr"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-phone">{t('contactPage.phone')}</Label>
        <Input
          id="contact-phone"
          name="phone"
          type="tel"
          disabled={status === 'submitting'}
          className="w-full"
          dir="ltr"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-subject">{t('contactPage.subject')}</Label>
        <Select value={subject} onValueChange={setSubject} disabled={status === 'submitting'}>
          <SelectTrigger id="contact-subject" className="w-full">
            <SelectValue placeholder={t('contactPage.subject')} />
          </SelectTrigger>
          <SelectContent>
            {SUBJECT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.key)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-message">{t('contactPage.message')}</Label>
        <Textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          disabled={status === 'submitting'}
          className="w-full resize-y"
          dir="auto"
        />
      </div>
      {status === 'error' && errorMessage && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {errorMessage}
        </p>
      )}
      <Button
        type="submit"
        disabled={status === 'submitting'}
        size="lg"
        className="w-full sm:w-auto"
      >
        {status === 'submitting' ? t('contactPage.submitting') : t('contactPage.submit')}
      </Button>
    </form>
  )
}
