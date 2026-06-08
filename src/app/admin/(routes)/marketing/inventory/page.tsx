'use client'

import { useState, useEffect } from 'react'
import {
  Package,
  TrendingUp,
  TrendingDown,
  Flame,
  Snowflake,
  Loader2,
  Zap,
  BarChart3,
  AlertTriangle,
  Download
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from '@/hooks/use-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function InventorySyncPage() {
  const [report, setReport] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchReport = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/marketing/inventory')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setReport(data.report || [])
      setSummary(data.summary || null)
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load inventory report', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReport() }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Hot': return <Badge className="bg-rose-500 text-white border-0 gap-1"><Flame className="h-3 w-3" /> ساخن</Badge>
      case 'Warm': return <Badge className="bg-amber-500 text-white border-0 gap-1"><TrendingUp className="h-3 w-3" /> دافئ</Badge>
      case 'Cold': return <Badge className="bg-sky-500 text-white border-0 gap-1"><Snowflake className="h-3 w-3" /> بارد</Badge>
      case 'Idle': return <Badge className="bg-slate-400 text-white border-0 gap-1"><TrendingDown className="h-3 w-3" /> خامل</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return '#ef4444'
    if (rate >= 50) return '#f59e0b'
    if (rate >= 15) return '#0ea5e9'
    return '#94a3b8'
  }

  const chartData = report.slice(0, 15).map(r => ({
    name: r.name?.slice(0, 20) || r.sku,
    utilization: r.utilizationRate,
    fill: getUtilizationColor(r.utilizationRate)
  }))

  const downloadCsv = () => {
    const headers = ['Name', 'SKU', 'Category', 'Status', 'Utilization%', 'Active Bookings', 'Revenue 30d (SAR)', 'Suggestion']
    const rows = report.map(r => [r.name, r.sku, r.category, r.status, r.utilizationRate, r.activeBookings, r.revenue30d, `"${r.suggestion}"`])
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `flixcam_inventory_sync_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary/20" />
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-text-heading">مزامنة المخزون والتسويق (Inventory Sync)</h1>
        <p className="text-sm text-muted-foreground">مزامنة ميزانية الإعلانات مع معدلات استخدام المعدات في الوقت الحقيقي</p>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="border-brand-primary/10 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] uppercase tracking-wider font-bold">متوسط الاستخدام</CardDescription>
              <CardTitle className="text-3xl font-bold text-brand-primary">{summary.avgUtilization}%</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-rose-200 shadow-sm bg-rose-50/50">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] uppercase tracking-wider font-bold text-rose-600 flex items-center gap-1"><Flame className="h-3 w-3" /> ساخن (Hot)</CardDescription>
              <CardTitle className="text-3xl font-bold text-rose-600">{summary.hot}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-amber-200 shadow-sm bg-amber-50/50">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] uppercase tracking-wider font-bold text-amber-600">دافئ (Warm)</CardDescription>
              <CardTitle className="text-3xl font-bold text-amber-600">{summary.warm}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-sky-200 shadow-sm bg-sky-50/50">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] uppercase tracking-wider font-bold text-sky-600 flex items-center gap-1"><Snowflake className="h-3 w-3" /> بارد (Cold)</CardDescription>
              <CardTitle className="text-3xl font-bold text-sky-600">{summary.cold}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] uppercase tracking-wider font-bold text-slate-500">خامل (Idle)</CardDescription>
              <CardTitle className="text-3xl font-bold text-slate-500">{summary.idle}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Utilization Chart + AI Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5 text-brand-primary" /> معدل الاستخدام (أعلى 15)</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} unit="%" />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="utilization" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 text-white border-0 shadow-xl p-8 flex flex-col justify-center">
          <Zap className="h-10 w-10 text-brand-primary mb-4" />
          <h3 className="text-xl font-bold mb-2">توصيات الذكاء الاصطناعي</h3>
          <div className="space-y-3 text-sm text-slate-400 leading-relaxed">
            {summary && summary.idle > 0 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <p>هناك <b className="text-white">{summary.idle} معدة خاملة</b> لم تُحجز في آخر 30 يوم. نقترح إطلاق حملة "عرض خاص" لها.</p>
              </div>
            )}
            {summary && summary.hot > 0 && (
              <div className="flex items-start gap-2">
                <Flame className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
                <p>هناك <b className="text-white">{summary.hot} معدة ساخنة</b> بنسبة استخدام فوق 80%. يمكنك إيقاف الإعلانات عليها لتوفير الميزانية.</p>
              </div>
            )}
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <p>إجمالي الإيرادات المقدّرة (30 يوم): <b className="text-white">{summary?.totalRevenue30d?.toLocaleString() || 0} ر.س</b></p>
            </div>
          </div>
        </Card>
      </div>

      {/* Equipment Table */}
      <Card className="border-brand-primary/10 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">جميع المعدات — مزامنة الإعلانات</CardTitle>
              <CardDescription>الترتيب من الأقل استخداماً (يحتاج تسويق) إلى الأكثر.</CardDescription>
            </div>
            <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={downloadCsv} disabled={!report.length}>
              <Download className="h-3 w-3" /> تصدير CSV
            </Button>
          </div>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">المعدة</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
              <TableHead className="text-center">الاستخدام</TableHead>
              <TableHead className="text-center">حجوزات نشطة</TableHead>
              <TableHead className="text-center">إيرادات 30 يوم</TableHead>
              <TableHead className="text-right">التوصية</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 italic text-muted-foreground">لا توجد معدات نشطة.</TableCell></TableRow>
            ) : report.map((item) => (
              <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{item.name}</span>
                    <span className="text-[10px] text-muted-foreground">{item.category} · {item.sku}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-bold">{item.utilizationRate}%</span>
                    <Progress value={item.utilizationRate} className="h-1.5 w-16" />
                  </div>
                </TableCell>
                <TableCell className="text-center font-medium">{item.activeBookings}</TableCell>
                <TableCell className="text-center font-bold text-emerald-600">{item.revenue30d.toLocaleString()} ر.س</TableCell>
                <TableCell>
                  <p className="text-xs text-muted-foreground max-w-[200px] leading-relaxed">{item.suggestion}</p>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
