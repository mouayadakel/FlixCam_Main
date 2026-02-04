/**
 * @file ai-preview-dialog.tsx
 * @description AI preview dialog for reviewing AI suggestions before import
 * @module components/features/import
 */

'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
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
      const allIndices = new Set<number>(data.suggestions?.map((_: unknown, idx: number) => idx) ?? [])
      setApproved(allIndices)
    } catch (error: any) {
      toast({
        title: 'Failed to generate AI preview',
        description: error.message,
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
                ...(current.translations?.[locale] || suggestions[index]?.aiSuggestions.translations[locale]),
                [field]: value,
              },
            },
          },
        }
      } else {
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Preview - Review Suggestions
          </DialogTitle>
          <DialogDescription>
            Review and edit AI-generated translations and SEO suggestions before applying them to your import.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-3">Generating AI suggestions...</span>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No suggestions generated
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
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
                    }
                  : suggestion.aiSuggestions

                return (
                  <div
                    key={idx}
                    className={`border rounded-lg p-4 ${isApproved ? 'border-green-500 bg-green-50/50' : 'border-gray-200'}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">Row {idx + 1}: {suggestion.original.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {suggestion.original.category} • {suggestion.original.brand}
                        </p>
                      </div>
                      <Button
                        variant={isApproved ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleApproval(idx)}
                      >
                        {isApproved ? (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Approved
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                    </div>

                    <Tabs defaultValue="seo" className="w-full">
                      <TabsList>
                        <TabsTrigger value="seo">SEO</TabsTrigger>
                        <TabsTrigger value="ar">Arabic</TabsTrigger>
                        <TabsTrigger value="zh">Chinese</TabsTrigger>
                      </TabsList>

                      <TabsContent value="seo" className="space-y-3 mt-3">
                        <div>
                          <Label>Meta Title</Label>
                          <Input
                            value={finalSuggestion.seo.metaTitle}
                            onChange={(e) => handleEdit(idx, 'metaTitle', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Meta Description</Label>
                          <Textarea
                            value={finalSuggestion.seo.metaDescription}
                            onChange={(e) => handleEdit(idx, 'metaDescription', e.target.value)}
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label>Meta Keywords</Label>
                          <Input
                            value={finalSuggestion.seo.metaKeywords}
                            onChange={(e) => handleEdit(idx, 'metaKeywords', e.target.value)}
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="ar" className="space-y-3 mt-3">
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
                                onChange={(e) => handleEdit(idx, 'shortDescription', e.target.value, 'ar')}
                                rows={2}
                              />
                            </div>
                            <div>
                              <Label>Long Description (Arabic)</Label>
                              <Textarea
                                value={finalSuggestion.translations.ar.longDescription}
                                onChange={(e) => handleEdit(idx, 'longDescription', e.target.value, 'ar')}
                                rows={4}
                              />
                            </div>
                          </>
                        )}
                      </TabsContent>

                      <TabsContent value="zh" className="space-y-3 mt-3">
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
                                onChange={(e) => handleEdit(idx, 'shortDescription', e.target.value, 'zh')}
                                rows={2}
                              />
                            </div>
                            <div>
                              <Label>Long Description (Chinese)</Label>
                              <Textarea
                                value={finalSuggestion.translations.zh.longDescription}
                                onChange={(e) => handleEdit(idx, 'longDescription', e.target.value, 'zh')}
                                rows={4}
                              />
                            </div>
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
          <Button variant="outline" onClick={onSkip}>
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
