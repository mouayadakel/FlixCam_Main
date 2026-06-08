'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { MarketingSettingsEditor } from '@/components/admin/marketing-settings-editor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Activity, Funnel as FunnelIcon, Settings, Tag, ArrowRight, Download } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { arSA } from 'date-fns/locale'

interface EventData {
  id: string
  eventType: string
  pageUrl: string | null
  entityType: string | null
  entityId: string | null
  value: number | null
  createdAt: string
}

interface MarketingDataType {
  byType: Array<{ eventType: string, _count: number }>
  recent: EventData[]
}

const FUNNEL_COLORS = ['#3b82f6', '#8b5cf6', '#10b981']

export default function MarketingPixelsPage() {
  const [data, setData] = useState<MarketingDataType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)

    void (async () => {
      try {
        const res = await fetch('/api/admin/marketing/events?days=30')
        if (!active) return
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch (err) {
        console.error('Failed to load events', err)
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => { active = false }
  }, [])

  // Process data for Funnel Chart
  const funnelData = useMemo(() => {
    if (!data?.byType) return []
    let views = 0
    let intent = 0
    let conversions = 0

    data.byType.forEach(t => {
      const type = t.eventType.toLowerCase()
      if (type.includes('view')) views += t._count
      else if (type.includes('cart') || type.includes('search')) intent += t._count
      else if (type.includes('purchase') || type.includes('lead')) conversions += t._count
    })

    // Fallbacks to avoid 0s ruining the visual
    if (views === 0) views = Math.max(intent, conversions, 1)

    return [
      { name: '1. الزيارات (Views)', value: views, pct: '100%' },
      { name: '2. النية (Adds/Intent)', value: intent, pct: `${((intent / views) * 100).toFixed(1)}%` },
      { name: '3. التحويل (Conversions)', value: conversions, pct: `${((conversions / views) * 100).toFixed(1)}%` }
    ]
  }, [data])

  const downloadCsv = () => {
    if (!data?.recent) return
    const headers = ['ID', 'Event Type', 'Page URL', 'Entity Type', 'Entity Id', 'Value', 'Date']
    const rows = data.recent.map(ev => [
      ev.id,
      ev.eventType,
      ev.pageUrl || '',
      ev.entityType || '',
      ev.entityId || '',
      ev.value || 0,
      new Date(ev.createdAt).toISOString()
    ])
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `flixcam_events_${new Date().toISOString().slice(0,10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-text-heading">البكسلات ومسار التحويل</h1>
        <p className="text-xs text-muted-foreground">تتبع التدفقات (Funnel) وإدارة معرفات التتبع الخارجية</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Funnel Chart */}
        <Card className="shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-brand-primary" />
              مسار التحويل (Sales Funnel)
            </CardTitle>
            <CardDescription>
              تسلسل تفاعل الزوار عبر منصة FlixCam في آخر 30 يوم
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex-1">
            {loading ? (
              <div className="h-full w-full flex items-center justify-center bg-muted/20 rounded-xl text-sm text-muted-foreground">جاري التحميل...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={12} width={120} />
                  <Tooltip 
                    formatter={(value, name, props) => [value, props.payload.pct]} 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }} 
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={40}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Live Event Stream */}
        <Card className="shadow-sm flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-500" />
                أحدث الأحداث (Live Stream)
              </CardTitle>
              <CardDescription>
                آخر 100 حدث تسويقي تم تسجيله على الموقع
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={downloadCsv} disabled={!data?.recent?.length}>
              <Download className="ms-2 h-4 w-4" />
              تصدير CSV
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
             <div className="rounded-md border h-[300px] overflow-auto">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0">
                    <TableRow>
                      <TableHead className="text-right">الحدث</TableHead>
                      <TableHead className="text-right">الكيان</TableHead>
                      <TableHead className="text-right">القيمة</TableHead>
                      <TableHead className="text-right">الوقت</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                       <TableRow>
                         <TableCell colSpan={4} className="h-24 text-center">جاري التحميل...</TableCell>
                       </TableRow>
                    ) : (data?.recent || []).length === 0 ? (
                       <TableRow>
                         <TableCell colSpan={4} className="h-24 text-center">لا توجد أحداث حديثة</TableCell>
                       </TableRow>
                    ) : (data?.recent || []).map((ev) => (
                      <TableRow key={ev.id}>
                        <TableCell>
                          <Badge variant={ev.eventType.includes('Purchase') ? 'default' : 'secondary'} className={ev.eventType.includes('Purchase') ? 'bg-emerald-500' : ''}>
                            {ev.eventType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs truncate max-w-[150px]" title={ev.pageUrl || ''}>
                          {ev.entityType ? `${ev.entityType} (${ev.entityId?.slice(0, 6)}...)` : (ev.pageUrl ? new URL(ev.pageUrl).pathname : '-')}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-medium">
                          {ev.value ? `${ev.value} SAR` : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                           {formatDistanceToNow(new Date(ev.createdAt), { addSuffix: true, locale: arSA })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="h-px bg-border-light/60 my-6" />

      {/* Settings Forms */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-muted-foreground" />
          إعدادات معرفات التتبع (Pixel IDs)
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-sm border-brand-primary/10">
            <CardHeader className="bg-muted/10 pb-4">
              <CardTitle className="text-base text-brand-primary">Google Ecosystem</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <MarketingSettingsEditor title="" categories={['google']} />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-brand-primary/10">
            <CardHeader className="bg-muted/10 pb-4">
              <CardTitle className="text-base text-blue-600">Meta Ecosystem</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <MarketingSettingsEditor title="" categories={['meta']} />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-brand-primary/10">
            <CardHeader className="bg-muted/10 pb-4">
              <CardTitle className="text-base text-purple-600">Other Platforms</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <MarketingSettingsEditor title="" categories={['tiktok', 'snapchat', 'pinterest', 'twitter', 'microsoft']} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
