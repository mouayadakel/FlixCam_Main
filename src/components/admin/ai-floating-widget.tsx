/**
 * @file ai-floating-widget.tsx
 * @description Floating AI chatbot widget for admin - session history, admin context
 * @module components/admin
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'ai-widget-messages'
const CONVERSATION_KEY = 'ai-widget-conversation-id'
const MAX_MESSAGES = 20

interface StoredMessage {
  role: 'user' | 'assistant'
  content: string
  at: number
}

function generateConversationId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
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
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)))
  } catch {
    // ignore
  }
}

function loadConversationId(): string {
  if (typeof window === 'undefined') return ''
  let id = sessionStorage.getItem(CONVERSATION_KEY)
  if (!id) {
    id = generateConversationId()
    sessionStorage.setItem(CONVERSATION_KEY, id)
  }
  return id
}

export function AIFloatingWidget() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<StoredMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const enabled =
    typeof process.env.NEXT_PUBLIC_AI_WIDGET_ENABLED !== 'undefined'
      ? process.env.NEXT_PUBLIC_AI_WIDGET_ENABLED === 'true'
      : true

  useEffect(() => {
    setMessages(loadMessages())
    setConversationId(loadConversationId())
  }, [])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

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
      const res = await fetch('/api/ai/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationId: conversationId || undefined,
          context: { adminContext: { currentPage: pathname ?? '' } },
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? 'فشل الإرسال')
      }
      const data = await res.json()
      const reply = data.message ?? data.reply ?? data.text ?? 'لا رد.'
      const assistantMsg: StoredMessage = { role: 'assistant', content: reply, at: Date.now() }
      const updated = [...next, assistantMsg]
      setMessages(updated)
      saveMessages(updated)
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'حدث خطأ'
      const assistantMsg: StoredMessage = {
        role: 'assistant',
        content: `خطأ: ${errMsg}`,
        at: Date.now(),
      }
      const updated = [...next, assistantMsg]
      setMessages(updated)
      saveMessages(updated)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        size="icon"
        className={cn(
          'fixed z-50 h-14 w-14 rounded-full shadow-lg transition-transform',
          'bottom-6 left-6',
          'rtl:left-auto rtl:right-6'
        )}
        onClick={() => setOpen((o) => !o)}
        aria-label="فتح مساعد الذكاء الاصطناعي"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {open && (
        <div
          className={cn(
            'fixed z-50 flex flex-col rounded-lg border bg-background shadow-xl',
            'max-h-[480px] w-[360px]',
            'bottom-20 left-6 rtl:bottom-20 rtl:left-auto rtl:right-6'
          )}
          dir="rtl"
        >
          <div className="flex items-center justify-between border-b p-3">
            <span className="font-medium">مساعد الذكاء الاصطناعي</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div
            ref={listRef}
            className="max-h-[340px] min-h-[240px] flex-1 space-y-3 overflow-y-auto p-3"
          >
            {messages.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                اكتب رسالة للبدء. يمكنك السؤال عن المعدات، الحجوزات، والتوفر.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={`${m.at}-${i}`}
                className={cn(
                  'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                  m.role === 'user' ? 'ml-auto mr-0 bg-primary text-primary-foreground' : 'bg-muted'
                )}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الرد...
              </div>
            )}
          </div>
          <div className="flex gap-2 border-t p-2">
            <Input
              placeholder="اكتب رسالة..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              className="flex-1"
              disabled={loading}
            />
            <Button
              type="button"
              size="icon"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
