'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowRight } from 'lucide-react'
import { BlogPostForm } from '@/components/admin/blog/blog-post-form'
import type { CreatePostInput } from '@/lib/validators/blog.validator'

export default function AdminBlogNewPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<{ id: string; nameAr: string; nameEn: string; slug: string }[]>([])
  const [authors, setAuthors] = useState<{ id: string; name: string; avatar: string | null; role: string | null }[]>([])
  const [tags, setTags] = useState<{ id: string; nameAr: string; nameEn: string; slug: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function fetchOptions() {
      try {
        const [catRes, authRes, tagRes] = await Promise.all([
          fetch('/api/admin/blog/categories?pageSize=100'),
          fetch('/api/admin/blog/authors?pageSize=100'),
          fetch('/api/admin/blog/tags'),
        ])
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
    fetchOptions()
  }, [])

  const handleSubmit = async (data: CreatePostInput) => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/blog/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to create')
      }
      const post = await res.json()
      router.push(`/admin/blog/edit/${post.id}`)
      router.refresh()
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
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
      <h1 className="text-2xl font-bold">Create post</h1>

      {categories.length === 0 || authors.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="font-medium text-amber-800">Setup required</p>
          <p className="text-sm text-amber-700">
            At least one category and one author must exist. Run the blog seed or create them manually.
          </p>
        </div>
      ) : (
        <BlogPostForm
          categories={categories}
          authors={authors}
          tags={tags}
          onSubmit={handleSubmit}
          isSubmitting={submitting}
        />
      )}
    </div>
  )
}
