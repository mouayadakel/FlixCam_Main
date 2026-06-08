/**
 * Public-site AI chat widget (lighter than admin widget).
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send, Loader2, Headphones } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useLocale } from '@/hooks/use-locale'

const STORAGE_KEY = 'public-ai-chat-messages'
const CONVERSATION_KEY = 'public-ai-conversation-id'
const MAX_MESSAGES = 16

interface StoredMessage {
  role: 'user' | 'assistant'
  content: string
  at: number
}

function generateConversationId(): string {
  return crypto.randomUUID()
}

function loadMessages(): StoredMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredMessage[]
    return Array.isArray(parsed) ? parsed.slice(-MAX_MESSAGES) : []
  } catch {
    return []
  }
}

function saveMessages(messages: StoredMessage[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)))
  } catch {
    // ignore
  }
}

export function PublicChatWidget() {
  const { t, locale } = useLocale()
  const enabled =
    process.env.NEXT_PUBLIC_AI_WIDGET_ENABLED === 'true' ||
    process.env.NEXT_PUBLIC_PUBLIC_CHAT_ENABLED === 'true'

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<StoredMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [handoverLoading, setHandoverLoading] = useState(false)
  const [conversationId, setConversationId] = useState('')
  const [greeting, setGreeting] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages(loadMessages())
    let id = sessionStorage.getItem(CONVERSATION_KEY)
    if (!id) {
      id = generateConversationId()
      sessionStorage.setItem(CONVERSATION_KEY, id)
    }
    setConversationId(id)
  }, [])

  useEffect(() => {
    fetch('/api/public/chatbot/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        const text =
          locale === 'en' || locale === 'fr'
            ? data.greetingEn ?? data.greetingAr
            : data.greetingAr ?? data.greetingEn
        if (typeof text === 'string' && text.trim()) setGreeting(text.trim())
      })
      .catch(() => {
        // ignore
      })
  }, [locale])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, open])

  if (!enabled) return null

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const userMsg: StoredMessage = { role: 'user', content: text, at: Date.now() }
    const next = [...messages, userMsg]
    setMessages(next)
    saveMessages(next)
    setLoading(true)
    try {
      const res = await fetch('/api/public/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationId: conversationId || undefined,
          context: { locale: 'public' },
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? 'Request failed')
      }
      const data = await res.json()
      const reply = data.message ?? data.reply ?? data.text ?? t('checkout.contactSupport')
      const assistantMsg: StoredMessage = { role: 'assistant', content: reply, at: Date.now() }
      const updated = [...next, assistantMsg]
      setMessages(updated)
      saveMessages(updated)
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : t('common.error')
      const assistantMsg: StoredMessage = {
        role: 'assistant',
        content: errMsg,
        at: Date.now(),
      }
      const updated = [...next, assistantMsg]
      setMessages(updated)
      saveMessages(updated)
    } finally {
      setLoading(false)
    }
  }

  const requestHandover = async () => {
    if (handoverLoading || !conversationId) return
    setHandoverLoading(true)
    try {
      const res = await fetch('/api/public/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handover: true, conversationId }),
      })
      const data = await res.json()
      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, '_blank', 'noopener,noreferrer')
      }
    } catch {
      // ignore — user can still use support channels
    } finally {
      setHandoverLoading(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        size="icon"
        className={cn(
          'fixed z-50 h-14 w-14 rounded-full bg-brand-primary shadow-lg hover:bg-brand-primary-hover',
          'bottom-20 end-4 lg:bottom-6'
        )}
        onClick={() => setOpen((o) => !o)}
        aria-label={t('kit.askExpert')}
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </Button>

      {open && (
        <div
          className={cn(
            'fixed z-50 flex max-h-[min(480px,70vh)] w-[min(360px,calc(100vw-2rem))] flex-col rounded-xl border bg-background shadow-xl',
            'bottom-36 end-4 lg:bottom-24'
          )}
        >
          <div className="flex items-center justify-between border-b p-3">
            <span className="font-medium">{t('kit.aiAssistant')}</span>
            <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div ref={listRef} className="min-h-[200px] flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {greeting ?? t('kit.questionnaireEmpty')}
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.at}
                className={cn(
                  'max-w-[90%] rounded-lg px-3 py-2 text-sm',
                  m.role === 'user'
                    ? 'ms-auto bg-brand-primary text-white'
                    : 'bg-muted text-foreground'
                )}
              >
                {m.content}
              </div>
            ))}
          </div>
          <div className="border-t px-3 py-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={handoverLoading}
              onClick={() => void requestHandover()}
            >
              {handoverLoading ? (
                <Loader2 className="ms-2 h-4 w-4 animate-spin" />
              ) : (
                <Headphones className="ms-2 h-4 w-4" />
              )}
              {t('checkout.contactSupport')}
            </Button>
          </div>
          <form
            className="flex gap-2 border-t p-3"
            onSubmit={(e) => {
              e.preventDefault()
              void sendMessage()
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('common.search')}
              disabled={loading}
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      )}
    </>
  )
}
