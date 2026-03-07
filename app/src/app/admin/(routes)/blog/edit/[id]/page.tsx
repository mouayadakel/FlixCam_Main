'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowRight } from 'lucide-react'
import { BlogPostForm } from '@/components/admin/blog/blog-post-form'
import type { CreatePostInput } from '@/lib/validators/blog.validator'

export default function AdminBlogEditPage() {
  const router = useRouter()
  const params = useParams()
  const id = (params?.id as string) ?? ''

  const [post, setPost] = useState<Record<string, unknown> | null>(null)
  const [categories, setCategories] = useState<{ id: string; nameAr: string; nameEn: string; slug: string }[]>([])
  const [authors, setAuthors] = useState<{ id: string; name: string; avatar: string | null; role: string | null }[]>([])
  const [tags, setTags] = useState<{ id: string; nameAr: string; nameEn: string; slug: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const [postRes, catRes, authRes, tagRes] = await Promise.all([
          fetch(`/api/admin/blog/posts/${id}`),
          fetch('/api/admin/blog/categories'),
          fetch('/api/admin/blog/authors'),
          fetch('/api/admin/blog/tags'),
        ])
        if (!postRes.ok) {
          if (postRes.status === 404) router.replace('/admin/blog')
          return
        }
        const postData = await postRes.json()
        setPost(postData)
        if (catRes.ok) {
          const catData = await catRes.json()
          const catList = catData.items ?? (Array.isArray(catData) ? catData : [])
          setCategories(catList.map((c: { id: string; nameAr: string; nameEn: string; slug: string }) => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn, slug: c.slug })))
        }
        if (authRes.ok) {
          const authData = await authRes.json()
          const authList = authData.items ?? (Array.isArray(authData) ? authData : [])
          setAuthors(authList.map((a: { id: string; name: string; avatar: string | null; role: string | null }) => ({ id: a.id, name: a.name, avatar: a.avatar ?? null, role: a.role ?? null })))
        }
        if (tagRes.ok) setTags(await tagRes.json())
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, router])

  const handleSubmit = async (data: CreatePostInput) => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/blog/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to update')
      }
      router.refresh()
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !post) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  const defaultValues: Partial<CreatePostInput> = {
    titleAr: post.titleAr as string,
    titleEn: post.titleEn as string,
    slug: post.slug as string,
    excerptAr: post.excerptAr as string,
    excerptEn: post.excerptEn as string,
    content: (post.content as Record<string, unknown>) ?? { type: 'doc', content: [] },
    coverImage: post.coverImage as string,
    coverImageAltAr: (post.coverImageAltAr as string) ?? null,
    coverImageAltEn: (post.coverImageAltEn as string) ?? null,
    categoryId: post.categoryId as string,
    authorId: post.authorId as string,
    status: post.status as CreatePostInput['status'],
    publishedAt: post.publishedAt ? new Date(post.publishedAt as string) : null,
    readingTime: (post.readingTime as number) ?? null,
    featured: (post.featured as boolean) ?? false,
    trending: (post.trending as boolean) ?? false,
    tagIds: ((post.tags as { id: string }[]) ?? []).map((t) => t.id),
    metaTitleAr: (post.metaTitleAr as string) ?? null,
    metaTitleEn: (post.metaTitleEn as string) ?? null,
    metaDescriptionAr: (post.metaDescriptionAr as string) ?? null,
    metaDescriptionEn: (post.metaDescriptionEn as string) ?? null,
    metaKeywordsAr: (post.metaKeywordsAr as string) ?? null,
    metaKeywordsEn: (post.metaKeywordsEn as string) ?? null,
    ogImage: (post.ogImage as string) ?? null,
    relatedEquipmentIds: (post.relatedEquipmentIds as string[]) ?? [],
    primaryCtaTextAr: (post.primaryCtaTextAr as string) ?? null,
    primaryCtaTextEn: (post.primaryCtaTextEn as string) ?? null,
    primaryCtaUrl: (post.primaryCtaUrl as string) ?? null,
    secondaryCtaTextAr: (post.secondaryCtaTextAr as string) ?? null,
    secondaryCtaTextEn: (post.secondaryCtaTextEn as string) ?? null,
    secondaryCtaUrl: (post.secondaryCtaUrl as string) ?? null,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/blog">
            <ArrowRight className="me-1 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>
      <h1 className="text-2xl font-bold">Edit post</h1>

      <BlogPostForm
        defaultValues={defaultValues}
        categories={categories}
        authors={authors}
        tags={tags}
        onSubmit={handleSubmit}
        isSubmitting={submitting}
      />
    </div>
  )
}
