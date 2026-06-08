'use client'

import { useState, useEffect } from 'react'
import {
  Users2,
  TrendingDown,
  TrendingUp,
  Target,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRightLeft,
  History,
  Zap,
  BarChart,
  ChevronDown
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
import { Badge } from '@/components/ui/badge'
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
import { toast } from '@/hooks/use-toast'
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell, CartesianGrid } from 'recharts'

export default function CompetitorMonitorPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newEntry, setNewEntry] = useState({
    competitorName: '',
    equipmentName: '',
    price: ''
  })

  const fetchComparison = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/marketing/competitor')
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      setData(json)
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل تقرير السوق', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchComparison() }, [])

  const handleLogPrice = async () => {
    if (!newEntry.competitorName || !newEntry.equipmentName || !newEntry.price) return
    try {
      const res = await fetch('/api/admin/marketing/competitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newEntry, price: Number(newEntry.price) })
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'تم الحفظ ✅', description: 'تم تسجيل سعر المنافس بنجاح' })
      setDialogOpen(false)
      setNewEntry({ competitorName: '', equipmentName: '', price: '' })
      fetchComparison()
    } catch {
      toast({ title: 'خطأ', description: 'فشل التسجيل', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary/20" />
      </div>
    )
  }

  const scatterData = data?.alerts.map((a: any) => ({
    name: a.equipmentName,
    ourPrice: a.flixcamPrice,
    compPrice: a.competitorAvg,
    gap: a.gap
  }))

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-text-heading">مراقب المنافسين وتسعير السوق (Market Parity)</h1>
          <p className="text-sm text-muted-foreground">مراقبة أسعار السوق وتعديل استراتيجيات التسويق بناءً على التنافسية</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-brand-primary shadow-lg shadow-brand-primary/20">
              <Plus className="h-4 w-4" /> إضافة سعر منافس
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>تسجيل سعر منافس</DialogTitle>
              <DialogDescription>أدخل اسم المنافس، المنتج، وسعره الحالي للمقارنة.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>اسم المنافس</Label>
                <Input value={newEntry.competitorName} onChange={e => setNewEntry(p => ({ ...p, competitorName: e.target.value }))} placeholder="مثال: متجر الكاميرات الحديثة" />
              </div>
              <div className="space-y-2">
                <Label>اسم المعدة / المنتج</Label>
                <Input value={newEntry.equipmentName} onChange={e => setNewEntry(p => ({ ...p, equipmentName: e.target.value }))} placeholder="مثال: Sony A7IV" />
              </div>
              <div className="space-y-2">
                <Label>السعر اليومي (ر.س)</Label>
                <Input type="number" value={newEntry.price} onChange={e => setNewEntry(p => ({ ...p, price: e.target.value }))} placeholder="0.00" />
              </div>
              <Button onClick={handleLogPrice} className="w-full">حفظ البيانات</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-wider font-bold">منتجات مراقبة</CardDescription>
            <CardTitle className="text-3xl font-bold text-slate-800">{data?.summary.totalTracked}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-wider font-bold text-emerald-600">أقل من السوق</CardDescription>
            <CardTitle className="text-3xl font-bold text-emerald-600">{data?.summary.betterCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-wider font-bold text-rose-600">أعلى من السوق</CardDescription>
            <CardTitle className="text-3xl font-bold text-rose-600">{data?.summary.worseCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-wider font-bold text-brand-primary">تموضعنا في السوق</CardDescription>
            <CardTitle className="text-xl font-bold text-brand-primary">
              {data?.summary.marketPosition === 'Premium' ? 'نخبوي (High-End)' : data?.summary.marketPosition === 'Aggressive' ? 'هجومي (Aggressive)' : 'متوازن (Balanced)'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Market Heatmap / Scatter */}
        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><ArrowRightLeft className="h-5 w-5 text-brand-primary" /> خريطة التنافسية (سعرنا vs المنافسين)</CardTitle>
            <CardDescription>النقاط تحت الخط = أنت أوفر. فوق الخط = أنت أغلى.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" dataKey="compPrice" name="سعر المنافس" unit="ر.س" hide />
                <YAxis type="number" dataKey="ourPrice" name="سعرنا" unit="ر.س" hide />
                <ZAxis type="number" dataKey="gap" range={[50, 400]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload
                    return (
                      <div className="bg-white p-3 border rounded-lg shadow-xl text-xs space-y-1">
                        <p className="font-bold">{d.name}</p>
                        <p>سعرنا: {d.ourPrice} ر.س</p>
                        <p>متوسط السوق: {d.compPrice} ر.س</p>
                        <p className={d.gap > 0 ? 'text-rose-600' : 'text-emerald-600 font-bold'}>
                          الفارق: {d.gap > 0 ? `+${d.gap}%` : `${d.gap}%`}
                        </p>
                      </div>
                    )
                  }
                  return null
                }} />
                <Scatter name="Products" data={scatterData}>
                  {scatterData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.gap > 0 ? '#ef4444' : '#10b981'} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI Tactical Suggestions */}
        <Card className="bg-slate-900 border-0 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-white"><Zap className="h-5 w-5 text-brand-primary" /> تحسين استراتيجية التسويق (AI Insight)</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto max-h-[350px]">
             {data?.alerts.map((alert: any, idx: number) => (
               <div key={idx} className="p-4 border-b border-white/5 flex gap-4 items-start hover:bg-white/5 transition-colors">
                 <div className={`mt-1 p-1.5 rounded-lg ${alert.status === 'better' ? 'bg-emerald-500/20 text-emerald-400' : alert.status === 'worse' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-500/20 text-slate-400'}`}>
                   {alert.status === 'better' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                 </div>
                 <div className="flex-1 space-y-1">
                   <div className="flex items-center justify-between">
                     <span className="text-sm font-bold text-white">{alert.equipmentName}</span>
                     <Badge variant="outline" className={`text-[10px] border-white/10 ${alert.gap > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                       {alert.gap > 0 ? `+${alert.gap}% أغلى` : `${alert.gap}% أوفر`}
                     </Badge>
                   </div>
                   <p className="text-xs text-slate-400 leading-relaxed">{alert.suggestion}</p>
                 </div>
               </div>
             ))}
             {data?.alerts.length === 0 && (
               <div className="p-10 text-center text-slate-500 italic text-sm">
                 لا توجد بيانات مقارنة حالية. أضف أسعار المنافسين للبدء.
               </div>
             )}
          </CardContent>
        </Card>
      </div>

      {/* Comparison Table */}
      <Card className="border-brand-primary/10 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="text-lg">جدول مقارنة الأسعار</CardTitle>
          <CardDescription>مقارنة تفصيلية بين أسعار FlixCam ومتوسط السوق.</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">المعدة</TableHead>
              <TableHead className="text-center">سعر FlixCam</TableHead>
              <TableHead className="text-center">متوسط السوق</TableHead>
              <TableHead className="text-center">الفرق %</TableHead>
              <TableHead className="text-right">خطة التسويق المقترحة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.alerts.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 italic text-muted-foreground">أضف بيانات المنافسين لتفعيل التقرير.</TableCell></TableRow>
            ) : data?.alerts.map((alert: any) => (
              <TableRow key={alert.id} className="hover:bg-slate-50/50 transition-colors">
                <TableCell className="font-bold">{alert.equipmentName}</TableCell>
                <TableCell className="text-center font-bold text-brand-primary">{alert.flixcamPrice} ر.س</TableCell>
                <TableCell className="text-center font-medium text-slate-500">{alert.competitorAvg} ر.س</TableCell>
                <TableCell className="text-center font-bold">
                  <span className={alert.gap > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                    {alert.gap > 0 ? `+${alert.gap}%` : `${alert.gap}%`}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[300px] py-4">
                  {alert.suggestion}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
