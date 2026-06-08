'use client'

import { useState, useEffect } from 'react'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  BarChart3,
  Loader2,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  History,
  Info
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts'

const COLORS = ['#0ea5e9', '#ef4444', '#f59e0b', '#10b981', '#6366f1', '#94a3b8']

export default function BudgetOptimizerPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newEntry, setNewEntry] = useState({
    channel: 'Google',
    amount: '',
    note: ''
  })

  const fetchBudget = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/marketing/budget')
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      setData(json)
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل بيانات الميزانية', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBudget() }, [])

  const handleAddSpend = async () => {
    if (!newEntry.amount) return
    try {
      const res = await fetch('/api/admin/marketing/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newEntry, amount: Number(newEntry.amount) })
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'تمت الإضافة', description: 'تم تسجيل مصروفات جديدة بنجاح' })
      setDialogOpen(false)
      setNewEntry({ channel: 'Google', amount: '', note: '' })
      fetchBudget()
    } catch {
      toast({ title: 'خطأ', description: 'فشل إضافة المدخل', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary/20" />
      </div>
    )
  }

  const pieData = data?.channels.filter((c: any) => c.spend > 0).map((c: any) => ({
    name: c.channel,
    value: c.spend
  }))

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-text-heading">تحسين الميزانية والعائد (ROI Optimizer)</h1>
          <p className="text-sm text-muted-foreground">تتبع المصروفات الإعلانية مقابل الإيرادات وتحليل العائد لكل قناة</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-brand-primary shadow-lg shadow-brand-primary/20">
              <Plus className="h-4 w-4" /> إضافة مصروفات
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>تسجيل مصروفات إعلانية</DialogTitle>
              <DialogDescription>أدخل المبلغ والمنصة لتتبع العائد بدقة.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>القناة / المنصة</Label>
                <Select value={newEntry.channel} onValueChange={v => setNewEntry(p => ({ ...p, channel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Google">Google Ads</SelectItem>
                    <SelectItem value="Meta">Meta (FB/IG)</SelectItem>
                    <SelectItem value="TikTok">TikTok</SelectItem>
                    <SelectItem value="Snapchat">Snapchat</SelectItem>
                    <SelectItem value="Referral">إحالات / مؤثرين</SelectItem>
                    <SelectItem value="Organic">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>المبلغ (ر.س)</Label>
                <Input type="number" value={newEntry.amount} onChange={e => setNewEntry(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>ملاحظة (اختياري)</Label>
                <Input value={newEntry.note} onChange={e => setNewEntry(p => ({ ...p, note: e.target.value }))} placeholder="حملة الربيع..." />
              </div>
              <Button onClick={handleAddSpend} className="w-full">حفظ البيانات</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-wider font-bold">إجمالي المصروفات (30 يوم)</CardDescription>
            <CardTitle className="text-3xl font-bold text-slate-900">{data?.summary.totalSpend.toLocaleString()} <span className="text-xs font-normal">ر.س</span></CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-wider font-bold text-brand-primary">إجمالي الإيرادات</CardDescription>
            <CardTitle className="text-3xl font-bold text-brand-primary">{data?.summary.totalRevenue.toLocaleString()} <span className="text-xs font-normal">ر.س</span></CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-wider font-bold text-emerald-600">إجمالي العائد ROI</CardDescription>
            <CardTitle className="text-3xl font-bold text-emerald-600">%{data?.summary.overallROI}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-wider font-bold text-brand-primary">أفضل قناة أداءً</CardDescription>
            <CardTitle className="text-xl font-bold text-slate-800">{data?.summary.bestROI?.channel || 'N/A'}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* ROI Chart */}
        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-text-heading"><BarChart3 className="h-5 w-5 text-brand-primary" /> العائد لكل قناة %</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.channels}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="channel" />
                <YAxis unit="%" />
                <Tooltip formatter={(val) => [`%${val}`, 'عائد ROI']} />
                <Bar dataKey="roi" radius={[4, 4, 0, 0]}>
                  {data?.channels.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.roi > 100 ? '#10b981' : entry.roi > 0 ? '#0ea5e9' : '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Allocation Donut */}
        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-text-heading"><PieChartIcon className="h-5 w-5 text-brand-primary" /> توزيع الميزانية الحالية</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center relative">
            {pieData?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" paddingAngle={5}>
                    {pieData.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => [`${Number(val).toLocaleString()} ر.س`, 'صرف']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground italic text-sm">لا توجد مصروفات مسجلة.</p>
            )}
            <div className="absolute flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-muted-foreground">صرف إجمالي</span>
              <span className="text-lg font-bold">{data?.summary.totalSpend.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Recommendation Panel */}
        <Card className="md:col-span-2 border-brand-primary shadow-sm bg-brand-primary/[0.01]">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Target className="h-5 w-5 text-brand-primary" /> توصيات إعادة توزيع الميزانية (AI Suggest)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data?.recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">لا توجد توصيات حالياً. نحتاج لمزيد من بيانات الصرف والمبيعات.</p>
            ) : data?.recommendations.map((rec: any, idx: number) => (
              <div key={idx} className="flex items-start gap-4 p-4 rounded-xl border bg-white shadow-sm border-brand-primary/10">
                <div className={`p-2 rounded-lg ${rec.action === 'increase' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {rec.action === 'increase' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{rec.channel}</span>
                    <Badge variant="outline" className={rec.action === 'increase' ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}>
                      {rec.action === 'increase' ? 'زيادة الإنفاق' : 'تقليل الإنفاق'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{rec.reason}</p>
                  <div className="flex items-center gap-6 mt-2 text-[10px] font-medium text-slate-500">
                    <span>التوزيع الحالي: {rec.currentAllocation}%</span>
                    <span>التوزيع المقترح: {rec.suggestedAllocation}%</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent History Table */}
        <Card className="border-brand-primary/10 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> سجل الصرف</CardTitle>
          </CardHeader>
          <Table>
            <TableBody>
              {data?.history.length === 0 ? (
                <TableRow><TableCell className="text-center py-10 italic text-xs">لا يوجد تاريخ صرف.</TableCell></TableRow>
              ) : data?.history.map((h: any) => (
                <TableRow key={h.id}>
                  <TableCell className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800">{h.channel}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(h.date).toLocaleDateString('ar-SA')}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-left font-bold text-slate-900">{h.amount.toLocaleString()} ر.س</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  )
}
