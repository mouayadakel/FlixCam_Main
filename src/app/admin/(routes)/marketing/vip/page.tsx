'use client'

import { useState, useEffect } from 'react'
import {
  Crown,
  Heart,
  TrendingUp,
  Award,
  Loader2,
  ShieldCheck,
  Zap,
  Star,
  Users,
  Edit2,
  Save,
  CheckCircle2,
  ArrowRight
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

export default function VIPHubPage() {
  const [data, setData] = useState<any>(null)
  const [perks, setPerks] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isEditingPerks, setIsEditingPerks] = useState(false)
  const [perksText, setPerksText] = useState('')

  const fetchData = async () => {
    try {
      setLoading(true)
      const [reportRes, perksRes] = await Promise.all([
        fetch('/api/admin/marketing/vip'),
        fetch('/api/admin/marketing/vip?perks=true')
      ])
      if (reportRes.ok) setData(await reportRes.json())
      if (perksRes.ok) {
        const p = await perksRes.json()
        setPerks(p.perks)
        setPerksText(p.perks.offers.join('\n'))
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل بيانات النخبة', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleUpdateVIP = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/admin/marketing/vip', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isVIP: !currentStatus })
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'تم التحديث ✅', description: 'تعديل حالة العميل بنجاح' })
      fetchData()
    } catch {
      toast({ title: 'خطأ', description: 'فشل التحديث', variant: 'destructive' })
    }
  }

  const handleSavePerks = async () => {
    try {
      const res = await fetch('/api/admin/marketing/vip', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'perks', 
          perks: { ...perks, offers: perksText.split('\n').filter(l => l.trim()) } 
        })
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'تم الحفظ ✅', description: 'تحديث مزايا النخبة بنجاح' })
      setIsEditingPerks(false)
      fetchData()
    } catch {
      toast({ title: 'خطأ', description: 'فشل الحفظ', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary/20" />
      </div>
    )
  }

  const chartData = data?.customers.slice(0, 10).map((c: any) => ({
    name: c.name.split(' ')[0],
    ltv: c.predictedLTV,
    current: c.totalSpend
  }))

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-text-heading">نُخبة العملاء ودرع الـ VIP (Customer LTV)</h1>
          <p className="text-sm text-muted-foreground">التنبؤ بالقيمة المستقبلية للعملاء وحماية أصولك الأكثر ربحية</p>
        </div>
        <div className="flex items-center gap-4">
           <Badge className="bg-brand-primary/10 text-brand-primary border-brand-primary/20 py-1 px-4 text-xs font-bold shadow-none">
             محرك التنبؤ: نشط 🤖
           </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-brand-primary/10 shadow-sm bg-brand-primary/[0.01]">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-wider font-bold text-brand-primary flex items-center gap-1">
              <Crown className="h-3 w-3" /> إجمالي النخبة (VIP)
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-brand-primary">{data?.summary.totalVIPs}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-wider font-bold">مساهمة الإيرادات</CardDescription>
            <CardTitle className="text-3xl font-bold text-emerald-600">%{data?.summary.vipRevenuePercentage}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-wider font-bold">متوسط القيمة المتوقعة (LTV)</CardDescription>
            <CardTitle className="text-3xl font-bold text-slate-800">{data?.summary.avgVIPLTV.toLocaleString()} <span className="text-xs">ر.س</span></CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* LTV Prediction Chart */}
        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-brand-primary" /> توقعات قيمة العمر الافتراضي (Top 10)</CardTitle>
            <CardDescription>القيمة الحالية (غامق) vs التوقعات المستقبلية (فاتح).</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorLtv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis unit="ر.س" hide />
                <Tooltip />
                <Area type="monotone" dataKey="ltv" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorLtv)" />
                <Area type="monotone" dataKey="current" stroke="#1e293b" fill="#1e293b" fillOpacity={0.05} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* VIP Perks Settings */}
        <Card className="bg-slate-900 border-0 shadow-xl text-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Crown className="h-32 w-32" />
          </div>
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><Award className="h-5 w-5 text-brand-primary" /> مزايا حصرية لعملاء النخبة</CardTitle>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-white" onClick={() => setIsEditingPerks(!isEditingPerks)}>
                {isEditingPerks ? <Save className="h-4 w-4" onClick={handleSavePerks} /> : <Edit2 className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="relative space-y-4">
            {isEditingPerks ? (
              <div className="space-y-3">
                <Textarea value={perksText} onChange={e => setPerksText(e.target.value)} rows={6} className="bg-white/5 border-white/10 text-white text-xs leading-relaxed" dir="rtl" />
                <Button size="sm" onClick={handleSavePerks} className="w-full">تحديث القائمة</Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {perks?.offers.map((offer: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-brand-primary shrink-0" />
                    {offer}
                  </li>
                ))}
              </ul>
            )}
            <div className="pt-4 border-t border-white/5">
              <p className="text-[10px] text-slate-500 flex items-center gap-1"><Zap className="h-3 w-3" /> يتم إرسال هذه المزايا آلياً عند ترقية العميل إلى فئة VIP.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* VIP Management Table */}
      <Card className="border-brand-primary/10 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-brand-primary" /> إدارة أعضاء النخبة (VIP Shield)</CardTitle>
          <CardDescription>قائمة العملاء الأعلى قيمة وتصنيف صحتهم التسويقية.</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">العميل</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
              <TableHead className="text-center">صحة المسار</TableHead>
              <TableHead className="text-center">إجمالي الإنفاق</TableHead>
              <TableHead className="text-center">الـ LTV المتوقع</TableHead>
              <TableHead className="text-left">الإجراء</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.customers.slice(0, 30).map((c: any) => (
              <TableRow key={c.id} className="hover:bg-slate-50/50 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold ${c.isVIP ? 'bg-brand-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {c.name.slice(0, 1)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground">{c.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {c.isVIP ? (
                    <Badge className="bg-amber-50 text-amber-600 border-amber-200 shadow-none gap-1"><Crown className="h-3 w-3" /> VIP</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-slate-400 bg-slate-50 border-slate-200">عادي</Badge>
                  )}
                </TableCell>
                <TableCell className="text-center w-[150px]">
                  <div className="flex flex-col gap-1 items-center">
                    <div className="flex justify-between w-full px-4 text-[9px] font-bold">
                      <span className={c.healthScore > 50 ? 'text-emerald-600' : 'text-rose-600'}>{c.healthScore}%</span>
                      {c.healthScore > 80 ? <ShieldCheck className="h-3 w-3 text-emerald-500" /> : <Info className="h-3 w-3 text-amber-500" />}
                    </div>
                    <Progress value={c.healthScore} className="h-1 w-24" />
                  </div>
                </TableCell>
                <TableCell className="text-center font-medium text-slate-700">{c.totalSpend.toLocaleString()} ر.س</TableCell>
                <TableCell className="text-center font-bold text-brand-primary">{c.predictedLTV.toLocaleString()} ر.س</TableCell>
                <TableCell className="text-left">
                  <Button variant="ghost" size="sm" className="h-8 text-[10px] gap-1 hover:text-brand-primary" onClick={() => handleUpdateVIP(c.id, c.isVIP)}>
                    {c.isVIP ? 'إلغاء المزايا' : 'ترقية لـ VIP'} <ArrowRight className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

function Info({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  )
}
