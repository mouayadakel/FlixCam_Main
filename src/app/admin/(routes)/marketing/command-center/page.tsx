'use client'

import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Shield,
  Zap,
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  Printer,
  Loader2,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Target,
  FileText
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
import { toast } from '@/hooks/use-toast'
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip
} from 'recharts'

export default function MarketingCommandCenterPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchCommandCenter = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/marketing/command-center')
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      setData(json)
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل لوحة القيادة', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCommandCenter() }, [])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary/20" />
      </div>
    )
  }

  return (
    <div className="space-y-6 print:p-0" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-text-heading">مركز قيادة التسويق (Command Center)</h1>
          <p className="text-sm text-muted-foreground">نظرة بانورامية على أداء جميع مراحل التسويق والأتمتة</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> طباعة التقرير
          </Button>
          <div className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full text-[10px] font-bold flex items-center gap-1">
            <Activity className="h-3 w-3 animate-pulse" /> البيانات محدثة (Live)
          </div>
        </div>
      </div>

      {/* Printable Report Header (Hidden usually) */}
      <div className="hidden print:block border-b-2 border-brand-primary pb-6 mb-8 text-right">
        <h1 className="text-3xl font-bold">تقرير الأداء التسويقي لـ FlixCam</h1>
        <p className="text-slate-500">تم الاستخراج في: {new Date().toLocaleDateString('ar-SA')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Health Score Card */}
        <Card className="md:col-span-1 border-brand-primary shadow-lg bg-brand-primary/[0.02]">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Target className="h-5 w-5 text-brand-primary" /> مؤشر الصحة العامة</CardTitle>
            <CardDescription className="text-xs">نتيجة تراكمية لـ 20 فازة تسويقية</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-4 space-y-4">
             <div className="relative h-32 w-32 flex items-center justify-center">
                <svg className="h-full w-full rotate-[-90deg]">
                  <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                  <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={364} strokeDashoffset={364 - (364 * data.healthScore) / 100} className="text-brand-primary" />
                </svg>
                <div className="absolute text-3xl font-bold text-slate-900">{data.healthScore}%</div>
             </div>
             <div className="text-center">
                <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200">أداء ممتاز ✨</Badge>
                <p className="text-[10px] text-muted-foreground mt-2 px-6">حملاتك تعمل بكفاءة عالية في الاستحواذ والاستبقاء.</p>
             </div>
          </CardContent>
        </Card>

        {/* Radar Chart Card */}
        <Card className="md:col-span-2 border-brand-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><LayoutDashboard className="h-5 w-5 text-brand-primary" /> توازن القوى التسويقية</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.radar}>
                <PolarGrid opacity={0.3} />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} hide />
                <Radar name="Performance" dataKey="A" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.6} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Highlights Card */}
        <Card className="md:col-span-1 border-brand-primary/10 shadow-sm bg-slate-900 text-white border-0 overflow-hidden relative">
          <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12">
            <Zap className="h-32 w-32" />
          </div>
          <CardHeader>
            <CardTitle className="text-lg border-b border-white/10 pb-2">أبرز نجاحات الـ 24 ساعة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
             {data.highlights.map((h: any, i: number) => (
               <div key={i} className="flex gap-4 items-start relative z-10">
                 <div className="p-2 rounded-lg bg-white/10 text-brand-primary">
                    {h.icon === 'zap' ? <Zap className="h-4 w-4" /> : h.icon === 'shield' ? <Shield className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{h.title}</p>
                   <p className="text-sm font-bold text-white leading-tight">{h.description}</p>
                 </div>
               </div>
             ))}
          </CardContent>
        </Card>
      </div>

      {/* KPI Detailed Grid */}
      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-8 flex items-center gap-2">
        المؤشرات التفصيلية (Master KPIs) <ArrowRight className="h-3 w-3 rotate-180" />
      </h3>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {data.kpis.map((kpi: any, i: number) => (
          <Card key={i} className="border-brand-primary/5 hover:border-brand-primary/20 transition-all shadow-sm">
            <CardContent className="p-4 space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground truncate">{kpi.label}</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-slate-900">{kpi.value}</span>
                {kpi.trend === 'up' ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : kpi.trend === 'down' ? <TrendingDown className="h-3 w-3 text-rose-500" /> : <Activity className="h-3 w-3 text-slate-400" />}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Footer / Actions */}
      <div className="grid gap-6 md:grid-cols-2 mt-4 print:hidden">
        <Card className="border-brand-primary/10 shadow-sm overflow-hidden group">
           <CardContent className="p-0 flex">
             <div className="w-2 bg-brand-primary" />
             <div className="flex-1 p-6 space-y-4">
               <div className="flex items-center gap-3">
                 <div className="p-2 rounded-full bg-brand-primary/10 text-brand-primary">
                   <FileText className="h-5 w-5" />
                 </div>
                 <div>
                   <h4 className="font-bold">استخراج تقرير الحالة التسويقية</h4>
                   <p className="text-xs text-muted-foreground">احصل على نسخة PDF تلخص جميع إنجازات الـ 20 فازة.</p>
                 </div>
               </div>
               <Button variant="outline" className="w-full text-xs font-bold gap-2 hover:bg-brand-primary hover:text-white transition-all" onClick={handlePrint}>
                 توليد ملف PDF <ArrowRight className="h-3 w-3 rotate-180" />
               </Button>
             </div>
           </CardContent>
        </Card>

        <Card className="bg-emerald-600 text-white border-0 shadow-lg relative overflow-hidden group">
           <div className="absolute right-0 top-0 p-8 opacity-10 group-hover:scale-125 transition-transform">
             <CheckCircle2 className="h-24 w-24" />
           </div>
           <CardContent className="p-6 relative z-10 flex flex-col h-full justify-between">
             <div className="space-y-1">
               <h4 className="text-lg font-bold">اكتمال جناح التسويق الموحد 🎉</h4>
               <p className="text-sm text-emerald-100 opacity-90">تم بناء وتطوير 20 فازة استراتيجية بنجاح 100%.</p>
             </div>
             <div className="flex items-center gap-2 text-xs font-bold mt-4 bg-white/10 w-fit px-3 py-1.5 rounded-lg border border-white/20">
               <Shield className="h-4 w-4" /> نظام مؤتمت بالكامل وجاهز للنمو العالمي.
             </div>
           </CardContent>
        </Card>
      </div>
    </div>
  )
}
