/**
 * @file page.tsx
 * @description Product review page for products that need AI review
 * @module app/admin/(routes)/inventory/products/[id]/review
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, ArrowLeft, RefreshCw, Save } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface ProductTranslation {
  locale: string
  name: string
  shortDescription: string
  longDescription: string
  seoTitle: string
  seoDescription: string
  seoKeywords: string
}

interface Product {
  id: string
  sku: string | null
  status: string
  translations: ProductTranslation[]
  category: { name: string } | null
  brand: { name: string } | null
}

export default function ProductReviewPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params?.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [edits, setEdits] = useState<Record<string, Partial<ProductTranslation>>>({})

  useEffect(() => {
    loadProduct()
  }, [productId])

  const loadProduct = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/products/${productId}`)
      if (!res.ok) throw new Error('Failed to load product')
      const data = await res.json()
      setProduct(data)

      // Initialize edits with current translations
      const initialEdits: Record<string, Partial<ProductTranslation>> = {}
      data.translations?.forEach((t: ProductTranslation) => {
        initialEdits[t.locale] = { ...t }
      })
      setEdits(initialEdits)
    } catch (error: any) {
      toast({ title: 'Failed to load product', description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleRetryAI = async () => {
    setRetrying(true)
    try {
      const res = await fetch(`/api/admin/products/${productId}/retry-ai`, {
        method: 'POST',
      })

      if (!res.ok) throw new Error('Failed to retry AI processing')
      toast({ title: 'AI processing retried', description: 'The product will be reprocessed in the background' })
      setTimeout(() => loadProduct(), 2000)
    } catch (error: any) {
      toast({ title: 'Failed to retry AI', description: error.message, variant: 'destructive' })
    } finally {
      setRetrying(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          translations: Object.entries(edits).map(([locale, data]) => ({
            locale,
            ...data,
          })),
        }),
      })

      if (!res.ok) throw new Error('Failed to save product')
      toast({ title: 'Product updated successfully' })
      await loadProduct()
    } catch (error: any) {
      toast({ title: 'Failed to save product', description: error.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const updateTranslation = (locale: string, field: keyof ProductTranslation, value: string) => {
    setEdits((prev) => ({
      ...prev,
      [locale]: {
        ...prev[locale],
        [field]: value,
      },
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Product not found</p>
          <Button variant="outline" onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const enTranslation = product.translations?.find((t) => t.locale === 'en')
  const arTranslation = product.translations?.find((t) => t.locale === 'ar')
  const zhTranslation = product.translations?.find((t) => t.locale === 'zh')

  const missingTranslations = []
  if (!arTranslation) missingTranslations.push('Arabic')
  if (!zhTranslation) missingTranslations.push('Chinese')
  if (!enTranslation?.seoTitle || !enTranslation?.seoDescription) {
    missingTranslations.push('SEO fields')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Review Product</h1>
          </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button variant="outline" onClick={handleRetryAI} disabled={retrying}>
            {retrying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry AI
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Product Information</CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline">{product.status}</Badge>
              {product.sku && <Badge variant="outline">SKU: {product.sku}</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Category:</span> {product.category?.name || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Brand:</span> {product.brand?.name || 'N/A'}
            </div>
          </div>
        </CardContent>
      </Card>

      {missingTranslations.length > 0 && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">Missing Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-700">
              The following fields are missing and need to be filled:
            </p>
            <ul className="list-disc list-inside mt-2 text-sm text-yellow-700">
              {missingTranslations.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="en" className="w-full">
        <TabsList>
          <TabsTrigger value="en">English</TabsTrigger>
          <TabsTrigger value="ar">Arabic</TabsTrigger>
          <TabsTrigger value="zh">Chinese</TabsTrigger>
        </TabsList>

        {(['en', 'ar', 'zh'] as const).map((locale) => {
          const translation = edits[locale] || product.translations?.find((t) => t.locale === locale)
          const isMissing = !translation

          return (
            <TabsContent key={locale} value={locale} className="space-y-4">
              {isMissing ? (
                <Card className="border-dashed">
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    {locale === 'en' ? 'English' : locale === 'ar' ? 'Arabic' : 'Chinese'} translation is missing.
                    <br />
                    Click &quot;Retry AI&quot; to generate it automatically, or fill it manually below.
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {locale === 'en' ? 'English' : locale === 'ar' ? 'Arabic' : 'Chinese'} Translation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={edits[locale]?.name || translation?.name || ''}
                        onChange={(e) => updateTranslation(locale, 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Short Description</Label>
                      <Textarea
                        value={edits[locale]?.shortDescription || translation?.shortDescription || ''}
                        onChange={(e) => updateTranslation(locale, 'shortDescription', e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>Long Description</Label>
                      <Textarea
                        value={edits[locale]?.longDescription || translation?.longDescription || ''}
                        onChange={(e) => updateTranslation(locale, 'longDescription', e.target.value)}
                        rows={6}
                      />
                    </div>
                    {locale === 'en' && (
                      <>
                        <div>
                          <Label>SEO Title</Label>
                          <Input
                            value={edits[locale]?.seoTitle || translation?.seoTitle || ''}
                            onChange={(e) => updateTranslation(locale, 'seoTitle', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>SEO Description</Label>
                          <Textarea
                            value={edits[locale]?.seoDescription || translation?.seoDescription || ''}
                            onChange={(e) => updateTranslation(locale, 'seoDescription', e.target.value)}
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label>SEO Keywords</Label>
                          <Input
                            value={edits[locale]?.seoKeywords || translation?.seoKeywords || ''}
                            onChange={(e) => updateTranslation(locale, 'seoKeywords', e.target.value)}
                          />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
