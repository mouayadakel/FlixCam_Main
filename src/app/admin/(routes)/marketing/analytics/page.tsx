'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Eye,
  ShoppingCart,
  CreditCard,
  Users,
  Loader2,
  Download,
  ArrowRight,
  Zap,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts'
import { toast } from '@/hooks/use-toast'

interface EventTypeStat {
  eventType: string
  _count: number
}

interface TrendPoint {
  date: string
  views: number
  adds: number
  purchases: number
  leads: number
}

interface RecentEvent {
  id: string
  eventType: string
  pageUrl: string | null
  entityType: string | null
  entityId: string | null
  value: number | null
  createdAt: string
}

interface FunnelStep {
  step: string
  count: number
}

const EVENT_COLORS: Record<string, string> = {
  ViewContent: '#3b82f6',
  PageView: '#60a5fa',
  equipment_view: '#93c5fd',
  AddToCart: '#f59e0b',
  add_to_cart: '#fbbf24',
  Purchase: '#10b981',
  Lead: '#8b5cf6',
  Contact: '#ec4899',
  ShareContent: '#06b6d4',
  Search: '#6366f1',
}

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1', '#ef4444', '#14b8a6', '#f97316']

export default function MarketingAnalyticsPage() {
  const [byType, setByType] = useState<EventTypeStat[]>([])
  const [trends, setTrends] = useState<TrendPoint[]>([])
  const [recent, setRecent] = useState<RecentEvent[]>([])
  const [funnel, setFunnel] = useState<FunnelStep[]>([])
  const [total, setTotal] = useState(0)
  const [estimatedRoi, setEstimatedRoi] = useState(0)
  const [days, setDays] = useState('30')
  const [loading, setLoading] = useState(true)

  const fetchData = async (rangeDays: string) => {
    try {
      setLoading(true)
      const [eventsRes, analyticsRes] = await Promise.all([
        fetch(`/api/admin/marketing/events?days=${rangeDays}`),
        fetch('/api/admin/marketing/analytics'),
      ])

      if (eventsRes.ok) {
        const json = await eventsRes.json()
        setByType(json.byType || [])
        setTrends(json.trends || [])
        setRecent(json.recent || [])
        setTotal(json.total || 0)
        setEstimatedRoi(json.estimatedRoi || 0)
      }

      if (analyticsRes.ok) {
        const json = await analyticsRes.json()
        setFunnel(json.funnel || [])
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل بيانات التحليلات', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(days)
  }, [days])

  // Derived metrics
  const totalViews = useMemo(() => byType.filter(t => t.eventType.toLowerCase().includes('view')).reduce((s, t) => s + t._count, 0), [byType])
  const totalLeads = useMemo(() => byType.filter(t => t.eventType === 'Lead').reduce((s, t) => s + t._count, 0), [byType])
  const totalPurchases = useMemo(() => byType.filter(t => t.eventType === 'Purchase').reduce((s, t) => s + t._count, 0), [byType])
  const conversionRate = useMemo(() => totalViews > 0 ? ((totalPurchases / totalViews) * 100).toFixed(1) : '0.0', [totalViews, totalPurchases])

  // Pie chart data
  const pieData = useMemo(() =>
    byType
      .filter(t => t._count > 0)
      .sort((a, b) => b._count - a._count)
      .slice(0, 10)
      .map(t => ({ name: t.eventType, value: t._count })),
    [byType])

  // Funnel bar chart data
  const funnelData = useMemo(() => {
    if (funnel.length > 0) return funnel.map(f => ({ name: f.step, value: f.count }))
    // Fallback: compute from byType
    return [
      { name: 'الزيارات', value: totalViews },
      { name: 'الاهتمام (سلة)', value: byType.filter(t => t.eventType.toLowerCase().includes('cart')).reduce((s, t) => s + t._count, 0) },
      { name: 'التحويل (شراء)', value: totalPurchases },
    ]
  }, [funnel, byType, totalViews, totalPurchases])

  const downloadCsv = () => {
    if (!recent.length) return
    const headers = ['ID', 'نوع الحدث', 'الرابط', 'نوع الكيان', 'معرّف الكيان', 'القيمة', 'التاريخ']
    const rows = recent.map(ev => [
      ev.id,
      ev.eventType,
      ev.pageUrl || '',
      ev.entityType || '',
      ev.entityId || '',
      ev.value ?? '',
      new Date(ev.createdAt).toISOString(),
    ])
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `flixcam_analytics_${new Date().toISOString().slice(0, 10)}.csv`)
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
          <h1 className="text-2xl font-bold tracking-tight text-text-heading">التحليلات التسويقية (Analytics)</h1>
          <p className="text-sm text-muted-foreground">نظرة شاملة على أحداث الموقع والمسارات التحويلية</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[140px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">آخر 7 أيام</SelectItem>
              <SelectItem value="14">آخر 14 يوم</SelectItem>
              <SelectItem value="30">آخر 30 يوم</SelectItem>
              <SelectItem value="60">آخر 60 يوم</SelectItem>
              <SelectItem value="90">آخر 90 يوم</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={downloadCsv} disabled={!recent.length}>
            <Download className="me-2 h-4 w-4" />
            تصدير CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardDescription className="text-[10px] uppercase tracking-wider font-bold">إجمالي الأحداث</CardDescription>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-800">{loading ? '...' : total.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-1">آخر {days} يوم</p>
          </CardContent>
        </Card>

        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardDescription className="text-[10px] uppercase tracking-wider font-bold flex items-center gap-1"><Eye className="h-3 w-3" /> المشاهدات</CardDescription>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{loading ? '...' : totalViews.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-1">زيارات المنتجات والصفحات</p>
          </CardContent>
        </Card>

        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardDescription className="text-[10px] uppercase tracking-wider font-bold flex items-center gap-1"><Users className="h-3 w-3" /> العملاء المحتملين</CardDescription>
            <TrendingUp className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-violet-600">{loading ? '...' : totalLeads.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Leads مسجّلة</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none shadow-xl shadow-emerald-100">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardDescription className="text-[10px] uppercase tracking-wider font-bold text-emerald-100">مبيعات + ROI</CardDescription>
            <CreditCard className="h-4 w-4 text-emerald-200" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{loading ? '...' : totalPurchases}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] text-emerald-100">نسبة التحويل: {conversionRate}%</span>
              <span className="text-[10px] text-emerald-100">ROI: {estimatedRoi.toLocaleString()} ر.س</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trends Area Chart */}
        <Card className="lg:col-span-2 shadow-sm border-brand-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-brand-primary" />
              اتجاه الأحداث اليومية
            </CardTitle>
            <CardDescription>المشاهدات، الإضافات للسلة، المشتريات، والعملاء المحتملين</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {loading ? (
              <div className="h-full flex items-center justify-center bg-muted/20 rounded-xl">
                <Loader2 className="h-8 w-8 animate-spin text-brand-primary/20" />
              </div>
            ) : trends.length === 0 ? (
              <div className="h-full flex items-center justify-center bg-muted/20 rounded-xl text-sm text-muted-foreground">لا توجد بيانات اتجاهات.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="date"
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val: string) => {
                      const d = new Date(val)
                      return `${d.getDate()}/${d.getMonth() + 1}`
                    }}
                  />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="views" name="مشاهدات" stroke="#3b82f6" fillOpacity={1} fill="url(#colorViews)" strokeWidth={2} />
                  <Area type="monotone" dataKey="adds" name="سلة" stroke="#f59e0b" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
                  <Area type="monotone" dataKey="purchases" name="مشتريات" stroke="#10b981" fillOpacity={1} fill="url(#colorPurchases)" strokeWidth={2} />
                  <Area type="monotone" dataKey="leads" name="عملاء محتملين" stroke="#8b5cf6" fill="transparent" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Event Type Distribution Pie */}
        <Card className="shadow-sm border-brand-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-brand-primary" />
              توزيع الأحداث
            </CardTitle>
            <CardDescription>حسب النوع — آخر {days} يوم</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {loading ? (
              <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-primary/20" /></div>
            ) : pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">لا توجد أحداث مسجلة</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'أحداث']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <Card className="shadow-sm border-brand-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5 text-brand-primary" />
            مسار التحويل (Conversion Funnel)
          </CardTitle>
          <CardDescription>تدفق الزوار من المشاهدة إلى الشراء</CardDescription>
        </CardHeader>
        <CardContent className="h-[200px]">
          {loading ? (
            <div className="h-full flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-primary/20" /></div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="#E5E7EB" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={12} width={100} />
                <Tooltip formatter={(value) => [Number(value).toLocaleString(), 'أحداث']} contentStyle={{ borderRadius: '8px' }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={32}>
                  {funnelData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#f59e0b', '#10b981'][index % 3]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Recent Events Table */}
      <Card className="shadow-sm border-brand-primary/10 overflow-hidden">
        <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between">
          <div className="space-y-1.5">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              آخر 100 حدث تسويقي
            </CardTitle>
            <CardDescription>أحدث الأحداث المسجلة على الموقع</CardDescription>
          </div>
          <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200 gap-1 py-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
            بث حي
          </Badge>
        </CardHeader>
        <div className="max-h-[400px] overflow-auto">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0">
              <TableRow>
                <TableHead className="text-right">الحدث</TableHead>
                <TableHead className="text-right">الكيان</TableHead>
                <TableHead className="text-center">القيمة</TableHead>
                <TableHead className="text-left">التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-brand-primary/20" />
                  </TableCell>
                </TableRow>
              ) : recent.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">
                    لا توجد أحداث مسجلة في هذه الفترة.
                  </TableCell>
                </TableRow>
              ) : recent.map((ev) => (
                <TableRow key={ev.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell>
                    <Badge
                      variant={ev.eventType === 'Purchase' ? 'default' : 'secondary'}
                      className={ev.eventType === 'Purchase' ? 'bg-emerald-500' : ''}
                    >
                      {ev.eventType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs truncate max-w-[200px]" title={ev.pageUrl || ''}>
                    {ev.entityType
                      ? `${ev.entityType} (${ev.entityId?.slice(0, 6)}...)`
                      : ev.pageUrl
                        ? (() => { try { return new URL(ev.pageUrl).pathname } catch { return ev.pageUrl } })()
                        : '-'}
                  </TableCell>
                  <TableCell className="text-center text-xs font-mono font-medium">
                    {ev.value ? `${Number(ev.value).toLocaleString()} ر.س` : '-'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(ev.createdAt).toLocaleString('ar-SA')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
