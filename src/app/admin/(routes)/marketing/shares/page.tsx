'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { Share2, Trophy, Download, Loader2, ArrowRight, ExternalLink } from 'lucide-react'

interface ShareEvent {
  id: string
  eventType: string
  pageUrl: string | null
  entityType: string | null
  entityId: string | null
  createdAt: string
}

const PLATFORM_COLORS: Record<string, string> = {
  whatsapp: '#25D366',
  facebook: '#1877F2',
  twitter: '#1DA1F2',
  telegram: '#229ED9',
  copy: '#9CA3AF',
  email: '#6B7280',
  other: '#94a3b8',
}

const PIE_COLORS = ['#25D366', '#1877F2', '#1DA1F2', '#229ED9', '#9CA3AF', '#6B7280', '#94a3b8']

function detectPlatform(ev: ShareEvent): string {
  const url = ev.pageUrl?.toLowerCase() || ''
  const type = ev.eventType?.toLowerCase() || ''
  if (url.includes('wa.me') || type.includes('whatsapp')) return 'whatsapp'
  if (url.includes('facebook') || type.includes('facebook')) return 'facebook'
  if (url.includes('twitter') || type.includes('twitter')) return 'twitter'
  if (url.includes('telegram') || type.includes('telegram')) return 'telegram'
  if (type.includes('copy')) return 'copy'
  if (type.includes('email') || url.includes('mailto')) return 'email'
  return 'other'
}

export default function MarketingSharesPage() {
  const [events, setEvents] = useState<ShareEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const res = await fetch('/api/admin/marketing/events?days=90')
        if (!active) return
        if (res.ok) {
          const json = await res.json() as { recent?: ShareEvent[] }
          const shares = (json.recent ?? []).filter(
            (x) => x.eventType.toLowerCase().includes('share') || x.eventType === 'blog_share' || x.eventType === 'ShareContent'
          )
          setEvents(shares)
        }
      } catch { /* ignore */ }
      finally { if (active) setLoading(false) }
    })()
    return () => { active = false }
  }, [])

  // Platform breakdown for pie chart
  const platformData = useMemo(() => {
    const counts: Record<string, number> = {}
    events.forEach(ev => {
      const p = detectPlatform(ev)
      counts[p] = (counts[p] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [events])

  // Leaderboard: most-shared content
  const leaderboard = useMemo(() => {
    const contentMap: Record<string, { name: string; url: string; count: number }> = {}
    events.forEach(ev => {
      const key = ev.pageUrl || ev.entityId || 'unknown'
      if (!contentMap[key]) {
        contentMap[key] = { name: ev.pageUrl || key, url: ev.pageUrl || '', count: 0 }
      }
      contentMap[key].count++
    })
    return Object.values(contentMap).sort((a, b) => b.count - a.count).slice(0, 10)
  }, [events])

  const totalShares = events.length
  const topPlatform = platformData.length > 0 ? platformData[0].name : '-'
  const topContent = leaderboard.length > 0 ? leaderboard[0].name : '-'

  const downloadCsv = () => {
    if (!events.length) return
    const headers = ['Rank', 'Content', 'URL', 'Total Shares']
    const rows = leaderboard.map((item, idx) => [idx + 1, item.name, item.url, item.count])
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `flixcam_shares_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-text-heading">أحداث المشاركة (Share Events)</h1>
          <p className="text-sm text-muted-foreground">تتبع مشاركات المحتوى عبر المنصات — آخر 90 يوم</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/marketing/social">
              <Share2 className="me-2 h-4 w-4" />
              مركز التواصل الاجتماعي
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardDescription className="text-[10px] uppercase tracking-wider font-bold">إجمالي المشاركات</CardDescription>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-brand-primary">{loading ? '...' : totalShares.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-1">آخر 90 يوم</p>
          </CardContent>
        </Card>

        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardDescription className="text-[10px] uppercase tracking-wider font-bold">المنصة الأكثر</CardDescription>
            <Trophy className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-800 capitalize">{loading ? '...' : topPlatform}</p>
            <p className="text-[10px] text-muted-foreground mt-1">الأعلى في عدد المشاركات</p>
          </CardContent>
        </Card>

        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardDescription className="text-[10px] uppercase tracking-wider font-bold">أكثر محتوى مشاركة</CardDescription>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm font-bold text-slate-700 truncate" title={topContent}>
              {loading ? '...' : topContent.replace(/^https?:\/\/[^/]+/, '')}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">المحتوى الأكثر انتشاراً</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Platform Distribution Pie */}
        <Card className="shadow-sm border-brand-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-brand-primary" />
              توزيع المنصات
            </CardTitle>
            <CardDescription>
              {totalShares > 0 ? `${totalShares} مشاركة من مختلف المنصات` : 'لا توجد مشاركات مسجلة بعد'}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {loading ? (
              <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-primary/20" /></div>
            ) : platformData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Share2 className="h-10 w-10 opacity-30" />
                <p className="text-sm">لا توجد أحداث مشاركة</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={40}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {platformData.map((entry, index) => (
                      <Cell key={entry.name} fill={PLATFORM_COLORS[entry.name] || PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'مشاركات']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="shadow-sm border-brand-primary/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                الأكثر مشاركة (Leaderboard)
              </CardTitle>
              <CardDescription>أبرز المحتوى الذي شاركه الزوار</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={downloadCsv} disabled={!leaderboard.length}>
              <Download className="ms-2 h-4 w-4" />
              تصدير CSV
            </Button>
          </CardHeader>
          <CardContent className="overflow-hidden">
            <div className="rounded-md border h-[240px] overflow-auto">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0">
                  <TableRow>
                    <TableHead className="w-[40px] text-center">#</TableHead>
                    <TableHead className="text-right">المحتوى</TableHead>
                    <TableHead className="text-center w-[80px]">مشاركات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={3} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-brand-primary/20" /></TableCell></TableRow>
                  ) : leaderboard.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground italic">لا توجد بيانات</TableCell></TableRow>
                  ) : leaderboard.map((item, idx) => (
                    <TableRow key={item.name} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="text-center font-bold text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="text-sm truncate max-w-[200px]" title={item.name}>
                        {item.url ? (
                          <a href={item.url} target="_blank" rel="noreferrer" className="text-brand-primary hover:underline">
                            {item.name.replace(/^https?:\/\/[^/]+/, '')}
                          </a>
                        ) : item.name}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{item.count}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Raw Events Table */}
      <Card className="shadow-sm border-brand-primary/10 overflow-hidden">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="text-lg">سجل الأحداث الخام</CardTitle>
          <CardDescription>جميع أحداث المشاركة المسجلة (blog_share, share_*, ShareContent)</CardDescription>
        </CardHeader>
        <div className="max-h-[300px] overflow-auto">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0">
              <TableRow>
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">المنصة</TableHead>
                <TableHead className="text-right">الرابط</TableHead>
                <TableHead className="text-left">الوقت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center h-16"><Loader2 className="h-6 w-6 animate-spin mx-auto text-brand-primary/20" /></TableCell></TableRow>
              ) : events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-10 italic">
                    لا توجد أحداث مشاركة مسجلة بعد.
                  </TableCell>
                </TableRow>
              ) : events.map((ev) => (
                <TableRow key={ev.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">{ev.eventType}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="capitalize text-sm font-medium">{detectPlatform(ev)}</span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{ev.pageUrl ?? '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(ev.createdAt).toLocaleString('ar-SA')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
