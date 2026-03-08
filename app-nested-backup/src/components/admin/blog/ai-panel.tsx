/**
 * Collapsible AI sidebar with buttons: Generate Outline, Generate Draft, Rewrite, Translate, SEO Meta, FAQ, Quality Score.
 */

'use client'

import { useState } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Sparkles, ChevronDown, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface AiPanelProps {
  title: string
  content: Record<string, unknown> | null
  language: 'ar' | 'en'
  onInjectContent: (content: Record<string, unknown>) => void
  onInjectMeta?: (meta: { metaTitle: string; metaDescription: string; keywords: string[] }) => void
  onInjectFaq?: (faq: Array<{ question: string; answer: string }>) => void
  onInjectEquipmentIds?: (ids: string[]) => void
  onShowQualityScore?: (score: number) => void
  className?: string
}

function contentToText(content: Record<string, unknown> | null): string {
  if (!content) return ''
  const extract = (node: unknown): string => {
    if (typeof node === 'string') return node
    if (node && typeof node === 'object' && 'content' in node) {
      const c = (node as { content?: unknown[] }).content
      return Array.isArray(c) ? c.map(extract).join(' ') : ''
    }
    if (node && typeof node === 'object' && 'text' in node) {
      return String((node as { text?: string }).text ?? '')
    }
    return ''
  }
  return extract(content)
}

export function AiPanel({
  title,
  content,
  language,
  onInjectContent,
  onInjectMeta,
  onInjectFaq,
  onInjectEquipmentIds,
  onShowQualityScore,
  className,
}: AiPanelProps) {
  const [open, setOpen] = useState(true)
  const [loading, setLoading] = useState<string | null>(null)
  const { toast } = useToast()

  const callApi = async <T,>(
    endpoint: string,
    body: Record<string, unknown>,
    onSuccess: (data: T) => void
  ) => {
    setLoading(endpoint)
    try {
      const res = await fetch(`/api/ai/blog/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Request failed')
      }
      const data = (await res.json()) as T
      onSuccess(data)
      toast({ title: 'Success', description: 'AI result applied' })
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Request failed',
        variant: 'destructive',
      })
    } finally {
      setLoading(null)
    }
  }

  const handleOutline = () => {
    if (!title.trim()) {
      toast({ title: 'Enter a title first', variant: 'destructive' })
      return
    }
    callApi<{ outline: string }>('generate-outline', { title, language }, (data) => {
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: data.outline }],
          },
        ],
      }
      onInjectContent(doc as Record<string, unknown>)
    })
  }

  const handleDraft = () => {
    const outline = contentToText(content)
    if (!outline.trim() || !title.trim()) {
      toast({ title: 'Generate outline first and enter title', variant: 'destructive' })
      return
    }
    callApi<{ content: object }>('generate-draft', { outline, title, language }, (data) => {
      onInjectContent((data.content ?? { type: 'doc', content: [] }) as Record<string, unknown>)
    })
  }

  const handleRewrite = () => {
    const text = contentToText(content)
    if (!text.trim()) {
      toast({ title: 'Add content first', variant: 'destructive' })
      return
    }
    callApi<{ rewritten: string }>('rewrite', { content: text, tone: 'professional', language }, (data) => {
      const doc = {
        type: 'doc',
        content: data.rewritten.split('\n\n').map((p) => ({
          type: 'paragraph',
          content: [{ type: 'text', text: p }],
        })),
      }
      onInjectContent(doc as Record<string, unknown>)
    })
  }

  const handleTranslate = () => {
    const text = contentToText(content)
    if (!text.trim()) {
      toast({ title: 'Add content first', variant: 'destructive' })
      return
    }
    const from = language
    const to = language === 'ar' ? 'en' : 'ar'
    callApi<{ translated: string }>('translate', { content: text, from, to }, (data) => {
      const doc = {
        type: 'doc',
        content: data.translated.split('\n\n').map((p) => ({
          type: 'paragraph',
          content: [{ type: 'text', text: p }],
        })),
      }
      onInjectContent(doc as Record<string, unknown>)
    })
  }

  const handleSeoMeta = () => {
    if (!title.trim()) {
      toast({ title: 'Enter a title first', variant: 'destructive' })
      return
    }
    const text = contentToText(content)
    callApi<{ metaTitle: string; metaDescription: string; keywords: string[] }>(
      'seo-meta',
      { title, content: content ?? text, language },
      (data) => {
        onInjectMeta?.(data)
      }
    )
  }

  const handleFaq = () => {
    const text = contentToText(content)
    if (!text.trim()) {
      toast({ title: 'Add content first', variant: 'destructive' })
      return
    }
    callApi<{ faq: Array<{ question: string; answer: string }> }>(
      'faq',
      { content: content ?? text, language },
      (data) => {
        onInjectFaq?.(data.faq ?? [])
      }
    )
  }

  const handleQualityScore = () => {
    const text = contentToText(content)
    if (!text.trim()) {
      toast({ title: 'Add content first', variant: 'destructive' })
      return
    }
    callApi<{ score: number }>('quality-score', { content: content ?? text }, (data) => {
      onShowQualityScore?.(data.score ?? 0)
      toast({ title: 'Quality Score', description: `Score: ${data.score ?? 0}/100` })
    })
  }

  const handleExtractEquipment = () => {
    const text = contentToText(content)
    if (!text.trim()) {
      toast({ title: 'Add content first', variant: 'destructive' })
      return
    }
    callApi<{ equipment: unknown[]; matchedEquipmentIds?: string[] }>(
      'extract-equipment',
      { content: text },
      (data) => {
        const ids = data.matchedEquipmentIds ?? []
        onInjectEquipmentIds?.(ids)
        toast({
          title: 'Extract Equipment',
          description: ids.length > 0
            ? `Matched ${ids.length} equipment items to related equipment`
            : 'No equipment matched. Add manually in Conversion tab.',
        })
      }
    )
  }

  const actions = [
    { id: 'outline', label: 'Generate Outline', onClick: handleOutline },
    { id: 'draft', label: 'Generate Draft', onClick: handleDraft },
    { id: 'rewrite', label: 'Rewrite', onClick: handleRewrite },
    { id: 'translate', label: 'Translate', onClick: handleTranslate },
    { id: 'seo', label: 'SEO Meta', onClick: handleSeoMeta },
    { id: 'faq', label: 'FAQ', onClick: handleFaq },
    { id: 'extract-equipment', label: 'Extract Equipment', onClick: handleExtractEquipment },
    { id: 'quality', label: 'Quality Score', onClick: handleQualityScore },
  ]

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn('border rounded-lg', className)}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-4 py-3">
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Tools
          </span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-1 border-t px-2 py-3">
          {actions.map(({ id, label, onClick }) => (
            <Button
              key={id}
              type="button"
              variant="outline"
              size="sm"
              className="justify-start"
              onClick={onClick}
              disabled={loading !== null}
            >
              {loading === id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                label
              )}
            </Button>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
