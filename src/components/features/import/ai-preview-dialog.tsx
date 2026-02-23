/**
 * @file ai-preview-dialog.tsx
 * @description AI preview dialog for reviewing AI suggestions before import
 * @module components/features/import
 */

'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Check, X, Sparkles } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface AISuggestion {
  rowIndex: number
  original: {
    name: string
    shortDescription?: string
    longDescription?: string
    category?: string
    brand?: string
    sheetName?: string
    excelRowNumber?: number
  }
  aiSuggestions: {
    translations: {
      [locale: string]: {
        name: string
        shortDescription: string
        longDescription: string
      }
    }
    seo: {
      metaTitle: string
      metaDescription: string
      metaKeywords: string
    }
    seoByLocale?: {
      ar?: { metaTitle: string; metaDescription: string; metaKeywords: string }
      zh?: { metaTitle: string; metaDescription: string; metaKeywords: string }
    }
    specifications?: Record<string, unknown>
    boxContents?: string
    tags?: string
    confidence?: number
    cost?: number
  }
}

interface AIPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rows: Array<{
    name: string
    shortDescription?: string
    longDescription?: string
    category?: string
    brand?: string
    specifications?: Record<string, any>
  }>
  provider?: 'openai' | 'gemini'
  onApply: (approvedSuggestions: AISuggestion[]) => void
  onSkip: () => void
}

export function AIPreviewDialog({
  open,
  onOpenChange,
  rows,
  provider,
  onApply,
  onSkip,
}: AIPreviewDialogProps) {
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [approved, setApproved] = useState<Set<number>>(new Set())
  const [edits, setEdits] = useState<Record<number, Partial<AISuggestion['aiSuggestions']>>>({})
  const [totalCost, setTotalCost] = useState(0)

  useEffect(() => {
    if (open && rows.length > 0) {
      generatePreview()
    }
  }, [open, rows])

  const generatePreview = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/imports/preview-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: rows.slice(0, 10), // Preview first 10 rows
          provider,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to generate AI preview')
      }

      const data = await res.json()
      setSuggestions(data.suggestions || [])
      setTotalCost(data.totalCost || 0)

      // Auto-approve all by default
      const allIndices = new Set<number>(
        data.suggestions?.map((_: unknown, idx: number) => idx) ?? []
      )
      setApproved(allIndices)
    } catch (error: any) {
      const msg = error.message || 'Unknown error'
      const isMissingKey = /api key|API key|no api key|GEMINI|OPENAI/i.test(msg)
      toast({
        title: 'Failed to generate AI preview',
        description: isMissingKey
          ? 'Add GEMINI_API_KEY or OPENAI_API_KEY to .env and set AI_PROVIDER (gemini or openai).'
          : msg,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleApproval = (index: number) => {
    const newApproved = new Set(approved)
    if (newApproved.has(index)) {
      newApproved.delete(index)
    } else {
      newApproved.add(index)
    }
    setApproved(newApproved)
  }

  const handleEdit = (index: number, field: string, value: string, locale?: string) => {
    setEdits((prev) => {
      const current = prev[index] || {}
      if (locale) {
        return {
          ...prev,
          [index]: {
            ...current,
            translations: {
              ...(current.translations || {}),
              [locale]: {
                ...(current.translations?.[locale] ||
                  suggestions[index]?.aiSuggestions.translations[locale]),
                [field]: value,
              },
            },
          },
        }
      }
      if (field === 'boxContents') {
        return { ...prev, [index]: { ...current, boxContents: value } }
      }
      if (field === 'tags') {
        return { ...prev, [index]: { ...current, tags: value } }
      }
      if (field === 'specifications') {
        try {
          const parsed = value.trim() ? JSON.parse(value) : {}
          return { ...prev, [index]: { ...current, specifications: parsed } }
        } catch {
          return prev
        }
      }

      if (field.startsWith('seo_ar_')) {
        const key = field.replace('seo_ar_', '')
        const existing =
          (current as any).seoByLocale || suggestions[index]?.aiSuggestions.seoByLocale
        return {
          ...prev,
          [index]: {
            ...current,
            seoByLocale: {
              ...(existing || {}),
              ar: {
                ...(existing?.ar ||
                  suggestions[index]?.aiSuggestions.seoByLocale?.ar || {
                    metaTitle: '',
                    metaDescription: '',
                    metaKeywords: '',
                  }),
                [key]: value,
              },
            },
          },
        }
      }
      if (field.startsWith('seo_zh_')) {
        const key = field.replace('seo_zh_', '')
        const existing =
          (current as any).seoByLocale || suggestions[index]?.aiSuggestions.seoByLocale
        return {
          ...prev,
          [index]: {
            ...current,
            seoByLocale: {
              ...(existing || {}),
              zh: {
                ...(existing?.zh ||
                  suggestions[index]?.aiSuggestions.seoByLocale?.zh || {
                    metaTitle: '',
                    metaDescription: '',
                    metaKeywords: '',
                  }),
                [key]: value,
              },
            },
          },
        }
      }
      return {
        ...prev,
        [index]: {
          ...current,
          seo: {
            ...(current.seo || suggestions[index]?.aiSuggestions.seo),
            [field]: value,
          },
        },
      }
    })
  }

  const handleApply = () => {
    const approvedSuggestions = suggestions
      .map((suggestion, idx) => {
        if (!approved.has(idx)) return null
        const edit = edits[idx]
        if (!edit) return suggestion

        return {
          ...suggestion,
          aiSuggestions: {
            ...suggestion.aiSuggestions,
            ...edit,
            translations: edit.translations || suggestion.aiSuggestions.translations,
            seo: edit.seo || suggestion.aiSuggestions.seo,
            seoByLocale: (edit as any).seoByLocale ?? suggestion.aiSuggestions.seoByLocale,
            specifications: edit.specifications ?? suggestion.aiSuggestions.specifications,
            boxContents: edit.boxContents ?? suggestion.aiSuggestions.boxContents,
            tags: (edit as any).tags ?? suggestion.aiSuggestions.tags,
            confidence: suggestion.aiSuggestions.confidence,
          },
        }
      })
      .filter(Boolean) as AISuggestion[]

    onApply(approvedSuggestions)
    onOpenChange(false)
  }

  const handleBulkApprove = () => {
    const allIndices = new Set(suggestions.map((_, idx) => idx))
    setApproved(allIndices)
  }

  const handleBulkReject = () => {
    setApproved(new Set())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Preview - Review Suggestions
          </DialogTitle>
          <DialogDescription>
            Review and edit AI-generated translations, SEO, specifications, and box contents before
            applying them to your import.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-3">Generating AI suggestions...</span>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No suggestions generated</div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="outline">
                  {approved.size} / {suggestions.length} approved
                </Badge>
                {totalCost > 0 && (
                  <Badge variant="outline">Estimated cost: ${totalCost.toFixed(4)}</Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleBulkApprove}>
                  Approve All
                </Button>
                <Button variant="outline" size="sm" onClick={handleBulkReject}>
                  Reject All
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {suggestions.map((suggestion, idx) => {
                const isApproved = approved.has(idx)
                const edit = edits[idx]
                const finalSuggestion = edit
                  ? {
                      ...suggestion.aiSuggestions,
                      ...edit,
                      translations: edit.translations || suggestion.aiSuggestions.translations,
                      seo: edit.seo || suggestion.aiSuggestions.seo,
                      seoByLocale:
                        (edit as any).seoByLocale || suggestion.aiSuggestions.seoByLocale,
                      specifications:
                        edit.specifications ?? suggestion.aiSuggestions.specifications ?? {},
                      boxContents: edit.boxContents ?? suggestion.aiSuggestions.boxContents ?? '',
                      tags: (edit as any).tags ?? suggestion.aiSuggestions.tags ?? '',
                    }
                  : suggestion.aiSuggestions

                return (
                  <div
                    key={idx}
                    className={`rounded-lg border p-4 ${isApproved ? 'border-green-500 bg-green-50/50' : 'border-gray-200'}`}
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">
                          Row {idx + 1}: {suggestion.original.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {suggestion.original.category} • {suggestion.original.brand}
                        </p>
                        {typeof finalSuggestion.confidence === 'number' && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Confidence: {finalSuggestion.confidence}%
                          </p>
                        )}
                      </div>
                      <Button
                        variant={isApproved ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleApproval(idx)}
                      >
                        {isApproved ? (
                          <>
                            <Check className="mr-1 h-4 w-4" />
                            Approved
                          </>
                        ) : (
                          <>
                            <X className="mr-1 h-4 w-4" />
                            Approve
                          </>
                        )}
                      </Button>
                    </div>

                    <Tabs defaultValue="seo" className="w-full">
                      <TabsList>
                        <TabsTrigger value="seo">SEO</TabsTrigger>
                        <TabsTrigger value="specs">Specs & Box</TabsTrigger>
                        <TabsTrigger value="ar">Arabic</TabsTrigger>
                        <TabsTrigger value="zh">Chinese</TabsTrigger>
                        <TabsTrigger value="tags">Tags</TabsTrigger>
                      </TabsList>

                      <TabsContent value="seo" className="mt-3 space-y-3">
                        <div>
                          <Label>Meta Title</Label>
                          <Input
                            value={finalSuggestion.seo?.metaTitle ?? ''}
                            onChange={(e) => handleEdit(idx, 'metaTitle', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Meta Description</Label>
                          <Textarea
                            value={finalSuggestion.seo?.metaDescription ?? ''}
                            onChange={(e) => handleEdit(idx, 'metaDescription', e.target.value)}
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label>Meta Keywords</Label>
                          <Input
                            value={finalSuggestion.seo?.metaKeywords ?? ''}
                            onChange={(e) => handleEdit(idx, 'metaKeywords', e.target.value)}
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="tags" className="mt-3 space-y-3">
                        <div>
                          <Label>Tags (comma-separated)</Label>
                          <Input
                            value={(finalSuggestion.tags as string) ?? ''}
                            onChange={(e) => handleEdit(idx, 'tags', e.target.value)}
                            placeholder="cinema, 4k, wedding, documentary"
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="specs" className="mt-3 space-y-3">
                        <div>
                          <Label>Box Contents</Label>
                          <Textarea
                            value={finalSuggestion.boxContents ?? ''}
                            onChange={(e) => handleEdit(idx, 'boxContents', e.target.value)}
                            rows={4}
                            placeholder="What's included in the box..."
                          />
                        </div>
                        <div>
                          <Label>Specifications (JSON)</Label>
                          <Textarea
                            value={JSON.stringify(finalSuggestion.specifications ?? {}, null, 2)}
                            onChange={(e) => handleEdit(idx, 'specifications', e.target.value)}
                            rows={8}
                            className="font-mono text-xs"
                            placeholder="{}"
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="ar" className="mt-3 space-y-3">
                        {finalSuggestion.translations.ar && (
                          <>
                            <div>
                              <Label>Name (Arabic)</Label>
                              <Input
                                value={finalSuggestion.translations.ar.name}
                                onChange={(e) => handleEdit(idx, 'name', e.target.value, 'ar')}
                              />
                            </div>
                            <div>
                              <Label>Short Description (Arabic)</Label>
                              <Textarea
                                value={finalSuggestion.translations.ar.shortDescription}
                                onChange={(e) =>
                                  handleEdit(idx, 'shortDescription', e.target.value, 'ar')
                                }
                                rows={2}
                              />
                            </div>
                            <div>
                              <Label>Long Description (Arabic)</Label>
                              <Textarea
                                value={finalSuggestion.translations.ar.longDescription}
                                onChange={(e) =>
                                  handleEdit(idx, 'longDescription', e.target.value, 'ar')
                                }
                                rows={4}
                              />
                            </div>

                            {finalSuggestion.seoByLocale?.ar && (
                              <>
                                <div className="border-t pt-3" />
                                <div>
                                  <Label>SEO Title (Arabic)</Label>
                                  <Input
                                    value={finalSuggestion.seoByLocale.ar.metaTitle}
                                    onChange={(e) =>
                                      handleEdit(idx, 'seo_ar_metaTitle', e.target.value)
                                    }
                                  />
                                </div>
                                <div>
                                  <Label>SEO Description (Arabic)</Label>
                                  <Textarea
                                    value={finalSuggestion.seoByLocale.ar.metaDescription}
                                    onChange={(e) =>
                                      handleEdit(idx, 'seo_ar_metaDescription', e.target.value)
                                    }
                                    rows={3}
                                  />
                                </div>
                                <div>
                                  <Label>SEO Keywords (Arabic)</Label>
                                  <Input
                                    value={finalSuggestion.seoByLocale.ar.metaKeywords}
                                    onChange={(e) =>
                                      handleEdit(idx, 'seo_ar_metaKeywords', e.target.value)
                                    }
                                  />
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </TabsContent>

                      <TabsContent value="zh" className="mt-3 space-y-3">
                        {finalSuggestion.translations.zh && (
                          <>
                            <div>
                              <Label>Name (Chinese)</Label>
                              <Input
                                value={finalSuggestion.translations.zh.name}
                                onChange={(e) => handleEdit(idx, 'name', e.target.value, 'zh')}
                              />
                            </div>
                            <div>
                              <Label>Short Description (Chinese)</Label>
                              <Textarea
                                value={finalSuggestion.translations.zh.shortDescription}
                                onChange={(e) =>
                                  handleEdit(idx, 'shortDescription', e.target.value, 'zh')
                                }
                                rows={2}
                              />
                            </div>
                            <div>
                              <Label>Long Description (Chinese)</Label>
                              <Textarea
                                value={finalSuggestion.translations.zh.longDescription}
                                onChange={(e) =>
                                  handleEdit(idx, 'longDescription', e.target.value, 'zh')
                                }
                                rows={4}
                              />
                            </div>

                            {finalSuggestion.seoByLocale?.zh && (
                              <>
                                <div className="border-t pt-3" />
                                <div>
                                  <Label>SEO Title (Chinese)</Label>
                                  <Input
                                    value={finalSuggestion.seoByLocale.zh.metaTitle}
                                    onChange={(e) =>
                                      handleEdit(idx, 'seo_zh_metaTitle', e.target.value)
                                    }
                                  />
                                </div>
                                <div>
                                  <Label>SEO Description (Chinese)</Label>
                                  <Textarea
                                    value={finalSuggestion.seoByLocale.zh.metaDescription}
                                    onChange={(e) =>
                                      handleEdit(idx, 'seo_zh_metaDescription', e.target.value)
                                    }
                                    rows={3}
                                  />
                                </div>
                                <div>
                                  <Label>SEO Keywords (Chinese)</Label>
                                  <Input
                                    value={finalSuggestion.seoByLocale.zh.metaKeywords}
                                    onChange={(e) =>
                                      handleEdit(idx, 'seo_zh_metaKeywords', e.target.value)
                                    }
                                  />
                                </div>
                              </>
                            )}
                          </>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                )
              })}
            </div>
          </>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onSkip()
              onOpenChange(false)
            }}
          >
            Skip AI Preview
          </Button>
          <Button onClick={handleApply} disabled={loading || approved.size === 0}>
            Apply {approved.size > 0 && `(${approved.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
