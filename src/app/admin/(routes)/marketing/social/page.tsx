'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { MarketingSettingsEditor } from '@/components/admin/marketing-settings-editor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from 'recharts'
import { Share2, Trophy, ArrowRight, MessageCircle, Facebook, Twitter, Download } from 'lucide-react'

interface EventData {
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
  linkedin: '#0A66C2',
  email: '#6B7280',
  copy: '#9CA3AF',
  pinterest: '#E60023',
}

function getPlatformFromEvent(ev: EventData): string {
  const url = ev.pageUrl?.toLowerCase() || ''
  const type = ev.eventType?.toLowerCase() || ''
  if (url.includes('wa.me') || type.includes('whatsapp')) return 'whatsapp'
  if (url.includes('facebook') || type.includes('facebook')) return 'facebook'
  if (url.includes('twitter') || type.includes('twitter')) return 'twitter'
  if (url.includes('telegram') || type.includes('telegram')) return 'telegram'
  if (url.includes('linkedin') || type.includes('linkedin')) return 'linkedin'
  if (url.includes('pinterest') || type.includes('pinterest')) return 'pinterest'
  if (type.includes('copy')) return 'copy'
  if (type.includes('email') || url.includes('mailto')) return 'email'
  return 'other'
}

export default function MarketingSocialPage() {
  const [shareEvents, setShareEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const res = await fetch('/api/admin/marketing/events?days=30')
        if (!active) return
        if (res.ok) {
          const json = await res.json() as { recent: EventData[] }
          // Filter to share-type events
          const shares = (json.recent || []).filter(e =>
            e.eventType?.toLowerCase().includes('share') ||
            e.eventType === 'social_share' ||
            e.eventType === 'ShareContent'
          )
          setShareEvents(shares)
        }
      } catch (err) { console.error(err) }
      finally { if (active) setLoading(false) }
    })()
    return () => { active = false }
  }, [])

  // Aggregate by platform for pie chart
  const platformData = useMemo(() => {
    const counts: Record<string, number> = {}
    shareEvents.forEach(ev => {
      const platform = getPlatformFromEvent(ev)
      counts[platform] = (counts[platform] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [shareEvents])

  // Leaderboard: most-shared content
  const leaderboard = useMemo(() => {
    const entityCounts: Record<string, { name: string; url: string; count: number }> = {}
    shareEvents.forEach(ev => {
      const key = ev.pageUrl || ev.entityId || 'unknown'
      if (!entityCounts[key]) {
        entityCounts[key] = { name: ev.pageUrl || key, url: ev.pageUrl || '', count: 0 }
      }
      entityCounts[key].count++
    })
    return Object.values(entityCounts).sort((a, b) => b.count - a.count).slice(0, 10)
  }, [shareEvents])

  const downloadCsv = () => {
    if (!leaderboard) return
    const headers = ['Rank', 'Content Name', 'URL', 'Total Shares']
    const rows = leaderboard.map((item, idx) => [
      idx + 1,
      item.name,
      item.url,
      item.count
    ])
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `flixcam_social_shares_${new Date().toISOString().slice(0,10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const totalShares = shareEvents.length

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-text-heading">مركز التواصل الاجتماعي</h1>
        <p className="text-xs text-muted-foreground">تحليلات المشاركة عبر المنصات وقوالب الرسائل</p>
      </div>

      {/* KPI */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Share2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المشاركات (30 يوم)</p>
              <p className="text-3xl font-bold">{loading ? '...' : totalShares.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pie Chart: Platform Origin */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-brand-primary" />
              توزيع منصات المشاركة
            </CardTitle>
            <CardDescription>
              {totalShares > 0 ? `${totalShares} مشاركة من مختلف المنصات` : 'لا توجد مشاركات مسجلة بعد'}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {loading ? (
              <div className="h-full flex items-center justify-center bg-muted/20 rounded-xl text-sm text-muted-foreground">جاري التحميل...</div>
            ) : platformData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Share2 className="h-10 w-10 opacity-30" />
                <p className="text-sm">لم يتم تسجيل أحداث مشاركة بعد</p>
                <p className="text-xs text-center px-8">أضف تتبع أحداث ShareContent على صفحات المنتجات</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {platformData.map(entry => (
                      <Cell
                        key={entry.name}
                        fill={PLATFORM_COLORS[entry.name] || '#94a3b8'}
                      />
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
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                الأكثر مشاركة (Leaderboard)
              </CardTitle>
              <CardDescription>أبرز المحتوى الذي شاركه الزوار</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={downloadCsv} disabled={!leaderboard?.length}>
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
                    <TableRow><TableCell colSpan={3} className="h-24 text-center">جاري التحميل...</TableCell></TableRow>
                  ) : leaderboard.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">لا توجد بيانات</TableCell></TableRow>
                  ) : leaderboard.map((item, idx) => (
                    <TableRow key={item.name}>
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

      <div className="h-px bg-border-light/60" />

      {/* Platform Icons Legend */}
      <div className="flex flex-wrap gap-3" dir="rtl">
        {[
          { name: 'WhatsApp', color: PLATFORM_COLORS.whatsapp, icon: MessageCircle },
          { name: 'Facebook', color: PLATFORM_COLORS.facebook, icon: Facebook },
          { name: 'X (Twitter)', color: PLATFORM_COLORS.twitter, icon: Twitter },
        ].map(p => (
          <div key={p.name} className="flex items-center gap-2 rounded-full px-3 py-1 bg-muted/30 text-sm">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            {p.name}
          </div>
        ))}
      </div>

      {/* Social Links Settings */}
      <Card className="shadow-sm border-brand-primary/10">
        <CardHeader className="bg-muted/10 pb-4">
          <CardTitle className="text-base text-brand-primary flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            روابط منصات التواصل (Social Links)
          </CardTitle>
          <CardDescription>تُستخدم في Schema.org وبطاقات المشاركة</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <MarketingSettingsEditor title="" categories={['social']} />
        </CardContent>
      </Card>
    </div>
  )
}
