/**
 * Blog post form with tabs: Content, Metadata, SEO, Conversion.
 */

'use client'

import type { Resolver } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createPostSchema, type CreatePostInput, type CreatePostFormValues } from '@/lib/validators/blog.validator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { TiptapEditor } from './tiptap-editor'
import { ImageUploader } from './image-uploader'
import { SeoFields } from './seo-fields'
import { AiPanel } from './ai-panel'
import { PublishControls } from './publish-controls'
import { MultiSelectCheckbox } from '@/components/ui/multi-select-checkbox'
import { RelatedEquipmentSelector } from '@/components/forms/related-equipment-selector'
import { slugify } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
const DEFAULT_CONTENT = { type: 'doc', content: [] } as Record<string, unknown>

interface BlogPostFormProps {
  defaultValues?: Partial<CreatePostInput>
  categories: { id: string; nameAr: string; nameEn: string; slug: string }[]
  authors: { id: string; name: string; avatar: string | null; role: string | null }[]
  tags: { id: string; nameAr: string; nameEn: string; slug: string }[]
  onSubmit: (data: CreatePostFormValues) => Promise<void>
  isSubmitting?: boolean
}

export function BlogPostForm({
  defaultValues,
  categories,
  authors,
  tags,
  onSubmit,
  isSubmitting = false,
}: BlogPostFormProps) {
  const form = useForm<CreatePostFormValues>({
    resolver: zodResolver(createPostSchema) as Resolver<CreatePostFormValues>,
    defaultValues: {
      titleAr: '',
      titleEn: '',
      slug: '',
      excerptAr: '',
      excerptEn: '',
      content: defaultValues?.content ?? DEFAULT_CONTENT,
      coverImage: defaultValues?.coverImage ?? '',
      coverImageAltAr: null,
      coverImageAltEn: null,
      categoryId: defaultValues?.categoryId ?? '',
      authorId: defaultValues?.authorId ?? '',
      status: defaultValues?.status ?? 'DRAFT',
      publishedAt: defaultValues?.publishedAt ?? null,
      readingTime: null,
      featured: defaultValues?.featured ?? false,
      trending: defaultValues?.trending ?? false,
      tagIds: defaultValues?.tagIds ?? [],
      metaTitleAr: null,
      metaTitleEn: null,
      metaDescriptionAr: null,
      metaDescriptionEn: null,
      metaKeywordsAr: null,
      metaKeywordsEn: null,
      ogImage: null,
      relatedEquipmentIds: defaultValues?.relatedEquipmentIds ?? [],
      ...defaultValues,
    },
  })

  const titleEn = form.watch('titleEn')
  const slug = form.watch('slug')

  const handleTitleEnChange = (value: string) => {
    form.setValue('titleEn', value)
    if (!slug || slug === slugify(form.getValues('titleEn'))) {
      form.setValue('slug', slugify(value))
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="conversion">Conversion</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4">
              <div className="space-y-2">
                <Label>Title (AR)</Label>
                <Input
                  {...form.register('titleAr')}
                  placeholder="العنوان بالعربية"
                />
                {form.formState.errors.titleAr && (
                  <p className="text-sm text-destructive">{form.formState.errors.titleAr.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Title (EN)</Label>
                <Input
                  value={titleEn}
                  onChange={(e) => handleTitleEnChange(e.target.value)}
                  placeholder="Title in English"
                />
                {form.formState.errors.titleEn && (
                  <p className="text-sm text-destructive">{form.formState.errors.titleEn.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  {...form.register('slug')}
                  placeholder="url-slug"
                />
                {form.formState.errors.slug && (
                  <p className="text-sm text-destructive">{form.formState.errors.slug.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Excerpt (AR)</Label>
                <Textarea
                  {...form.register('excerptAr')}
                  rows={2}
                  placeholder="ملخص بالعربية"
                />
                {form.formState.errors.excerptAr && (
                  <p className="text-sm text-destructive">{form.formState.errors.excerptAr.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Excerpt (EN)</Label>
                <Textarea
                  {...form.register('excerptEn')}
                  rows={2}
                  placeholder="Excerpt in English"
                />
                {form.formState.errors.excerptEn && (
                  <p className="text-sm text-destructive">{form.formState.errors.excerptEn.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <TiptapEditor
                  content={form.watch('content') ?? DEFAULT_CONTENT}
                  onChange={(c) => form.setValue('content', c)}
                />
              </div>
            </div>
            <div className="space-y-4">
              <ImageUploader
                value={form.watch('coverImage')}
                onChange={(url) => form.setValue('coverImage', url)}
                label="Cover image"
              />
              <AiPanel
                title={form.watch('titleEn') ?? ''}
                content={form.watch('content') ?? null}
                language="en"
                onInjectContent={(c) => form.setValue('content', c)}
                onInjectMeta={(meta) => {
                  form.setValue('metaTitleEn', meta.metaTitle)
                  form.setValue('metaDescriptionEn', meta.metaDescription)
                  form.setValue('metaKeywordsEn', meta.keywords.join(', '))
                }}
                onInjectEquipmentIds={(ids) => form.setValue('relatedEquipmentIds', ids)}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="metadata" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.watch('categoryId')}
                  onValueChange={(v) => form.setValue('categoryId', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nameEn} / {c.nameAr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.categoryId && (
                  <p className="text-sm text-destructive">{form.formState.errors.categoryId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Author</Label>
                <Select
                  value={form.watch('authorId')}
                  onValueChange={(v) => form.setValue('authorId', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select author" />
                  </SelectTrigger>
                  <SelectContent>
                    {authors.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.authorId && (
                  <p className="text-sm text-destructive">{form.formState.errors.authorId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Reading time (minutes)</Label>
                <Input
                  type="number"
                  min={0}
                  max={120}
                  {...form.register('readingTime', { valueAsNumber: true })}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <MultiSelectCheckbox
                  options={tags.map((t) => ({ id: t.id, label: `${t.nameEn} / ${t.nameAr}` }))}
                  selectedIds={form.watch('tagIds') ?? []}
                  onToggle={(id, checked) => {
                    const current = form.getValues('tagIds') ?? []
                    if (checked) {
                      form.setValue('tagIds', [...current, id])
                    } else {
                      form.setValue('tagIds', current.filter((x) => x !== id))
                    }
                  }}
                  label="Tags"
                />
              </div>
            </div>
            <div>
              <PublishControls
                status={form.watch('status') ?? 'DRAFT'}
                publishedAt={
                  form.watch('publishedAt')
                    ? new Date(form.watch('publishedAt')!).toISOString()
                    : ''
                }
                featured={form.watch('featured') ?? false}
                trending={form.watch('trending') ?? false}
                onStatusChange={(v) => form.setValue('status', v as CreatePostInput['status'])}
                onPublishedAtChange={(v) => form.setValue('publishedAt', v ? new Date(v) : null)}
                onFeaturedChange={(v) => form.setValue('featured', v)}
                onTrendingChange={(v) => form.setValue('trending', v)}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <SeoFields
            metaTitleAr={form.watch('metaTitleAr') ?? ''}
            metaTitleEn={form.watch('metaTitleEn') ?? ''}
            metaDescriptionAr={form.watch('metaDescriptionAr') ?? ''}
            metaDescriptionEn={form.watch('metaDescriptionEn') ?? ''}
            metaKeywordsAr={form.watch('metaKeywordsAr') ?? ''}
            metaKeywordsEn={form.watch('metaKeywordsEn') ?? ''}
            onChange={(field, value) => form.setValue(field as keyof CreatePostInput, value)}
          />
        </TabsContent>

        <TabsContent value="conversion" className="space-y-4">
          <RelatedEquipmentSelector
            label="Related equipment"
            value={form.watch('relatedEquipmentIds') ?? []}
            onChange={(ids) => form.setValue('relatedEquipmentIds', ids)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Primary CTA (AR)</Label>
              <Input
                value={form.watch('primaryCtaTextAr') ?? ''}
                onChange={(e) => form.setValue('primaryCtaTextAr', e.target.value || null)}
                placeholder="استأجر المعدات الآن"
              />
            </div>
            <div className="space-y-2">
              <Label>Primary CTA (EN)</Label>
              <Input
                value={form.watch('primaryCtaTextEn') ?? ''}
                onChange={(e) => form.setValue('primaryCtaTextEn', e.target.value || null)}
                placeholder="Rent Equipment Now"
              />
            </div>
            <div className="space-y-2">
              <Label>Primary CTA URL</Label>
              <Input
                value={form.watch('primaryCtaUrl') ?? ''}
                onChange={(e) => form.setValue('primaryCtaUrl', e.target.value || null)}
                placeholder="/equipment"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </div>
    </form>
  )
}
