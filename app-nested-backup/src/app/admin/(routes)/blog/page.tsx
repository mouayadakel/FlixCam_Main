'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus } from 'lucide-react'
import { BlogPostList } from '@/components/admin/blog/blog-post-list'
import type { BlogPostListItem } from '@/lib/types/blog.types'

export default function AdminBlogPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [posts, setPosts] = useState<BlogPostListItem[]>([])
  const [categories, setCategories] = useState<{ id: string; nameAr: string; nameEn: string; slug: string }[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const search = searchParams?.get('q') ?? ''
  const category = searchParams?.get('category') ?? ''
  const page = Math.max(1, parseInt(searchParams?.get('page') ?? '1', 10))

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (category) params.set('category', category)
      params.set('page', String(page))
      params.set('limit', '20')

      const [postsRes, categoriesRes] = await Promise.all([
        fetch(`/api/admin/blog/posts?${params}`),
        fetch('/api/admin/blog/categories'),
      ])

      if (!postsRes.ok) {
        const postsErr = await postsRes.json().catch(() => ({}))
        throw new Error(postsErr.error ?? `Posts: ${postsRes.status}`)
      }
      if (!categoriesRes.ok) {
        const catErr = await categoriesRes.json().catch(() => ({}))
        throw new Error(catErr.error ?? `Categories: ${categoriesRes.status}`)
      }

      const postsData = await postsRes.json()
      const categoriesData = await categoriesRes.json()
      const catList = Array.isArray(categoriesData) ? categoriesData : (categoriesData.items ?? [])

      setPosts(postsData.posts ?? [])
      setTotal(postsData.total ?? 0)
      setTotalPages(postsData.totalPages ?? 1)
      setCategories(catList.map((c: { id: string; nameAr: string; nameEn: string; slug: string }) => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn, slug: c.slug })))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل البيانات'
      setError(msg)
      setPosts([])
      setCategories([])
      setTotal(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }, [search, category, page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSearchChange = (q: string) => {
    const next = new URLSearchParams(searchParams?.toString() ?? '')
    if (q) next.set('q', q)
    else next.delete('q')
    next.delete('page')
    router.push(`/admin/blog?${next}`)
  }

  const handleCategoryChange = (c: string) => {
    const next = new URLSearchParams(searchParams?.toString() ?? '')
    if (c) next.set('category', c)
    else next.delete('category')
    next.delete('page')
    router.push(`/admin/blog?${next}`)
  }

  const handlePageChange = (p: number) => {
    const next = new URLSearchParams(searchParams?.toString() ?? '')
    next.set('page', String(p))
    router.push(`/admin/blog?${next}`)
  }

  if (loading && posts.length === 0 && !error) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6" dir="rtl">
        <p className="font-medium text-destructive">فشل تحميل المدونة</p>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => fetchData()}>
          إعادة المحاولة
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Blog Posts</h1>
        <Button asChild>
          <Link href="/admin/blog/new">
            <Plus className="me-2 h-4 w-4" />
            New post
          </Link>
        </Button>
      </div>

      <BlogPostList
        posts={posts}
        categories={categories}
        total={total}
        page={page}
        totalPages={totalPages}
        search={search}
        category={category}
        onSearchChange={handleSearchChange}
        onCategoryChange={handleCategoryChange}
        onPageChange={handlePageChange}
      />
    </div>
  )
}
