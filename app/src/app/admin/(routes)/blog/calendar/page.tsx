'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
export default function AdminBlogCalendarPage() {
  const [posts, setPosts] = useState<Array<{ id: string; slug: string; titleEn: string; status: string; publishedAt: string | null }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchScheduled() {
      try {
        const res = await fetch('/api/admin/blog/posts?limit=50&sort=newest')
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        const all = (data.posts ?? []).filter(
          (p: { status: string; publishedAt: string | null }) =>
            p.status === 'SCHEDULED' || p.status === 'PUBLISHED'
        )
        setPosts(all)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchScheduled()
  }, [])

  const byMonth = posts.reduce<Record<string, typeof posts>>((acc, p) => {
    const d = p.publishedAt ? new Date(p.publishedAt) : new Date()
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  const months = Object.keys(byMonth).sort().reverse()

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
      <h1 className="text-2xl font-bold">Blog Calendar</h1>

      {loading ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">Loading...</div>
      ) : months.length === 0 ? (
        <div className="rounded-lg border border-muted bg-muted/30 p-8 text-center">
          <p className="text-muted-foreground">No scheduled or published posts.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {months.map((month) => (
            <div key={month} className="rounded-lg border p-4">
              <h2 className="mb-4 font-semibold">
                {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <ul className="space-y-2">
                {byMonth[month]!.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded bg-muted/50 px-3 py-2">
                    <div>
                      <Link href={`/admin/blog/edit/${p.id}`} className="font-medium hover:underline">
                        {p.titleEn}
                      </Link>
                      <span className="me-2 text-xs text-muted-foreground">({p.status})</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {p.publishedAt
                        ? new Date(p.publishedAt).toLocaleDateString()
                        : '-'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
