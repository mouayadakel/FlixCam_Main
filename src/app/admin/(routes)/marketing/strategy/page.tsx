'use client'

import { useState, useEffect } from 'react'
import { 
  Sparkles, 
  Loader2, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Target,
  Search,
  Zap,
  LayoutDashboard,
  Timer,
  ShieldCheck,
  MousePointer2,
  DollarSign,
  Users,
  BrainCircuit,
  Maximize2
} from 'lucide-react'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function StrategyPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchStrategy = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/marketing/ai/tasks')
      if (!res.ok) throw new Error('Failed to fetch')
      setTasks(await res.json())
    } catch (err) {
      toast({ title: 'خطأ في التحليل', description: 'فشل تحميل المهام الاستراتيجية', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStrategy()
  }, [])

  const getPriorityStyles = (p: string) => {
    switch (p?.toLowerCase()) {
      case 'critical': return 'bg-rose-500 text-white border-rose-600 shadow-lg shadow-rose-200 animate-pulse'
      case 'high': return 'bg-orange-500 text-white border-orange-600 shadow-md shadow-orange-100'
      case 'medium': return 'bg-brand-primary text-white border-brand-primary-dark shadow-sm'
      default: return 'bg-slate-500 text-white'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'seo': return <Search className="h-6 w-6 text-blue-500" />
      case 'pricing': return <DollarSign className="h-6 w-6 text-emerald-500" />
      case 'inventory': return <Maximize2 className="h-6 w-6 text-orange-500" />
      case 'recovery': return <Timer className="h-6 w-6 text-rose-500" />
      case 'conversion': return <TrendingUp className="h-6 w-6 text-indigo-500" />
      default: return <Target className="h-6 w-6 text-brand-primary" />
    }
  }

  return (
    <div className="space-y-8 pb-12" dir="rtl">
      {/* Header with AI Heartbeat */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
            </span>
            <Badge variant="outline" className="text-[10px] font-bold border-brand-primary/20 text-brand-primary">
              نظام "كورتكس" نشط (Cortex Active)
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-text-heading">غرفة العمليات الاستراتيجية</h1>
          <p className="text-muted-foreground">قرارات ذكية مدعومة بالبيانات لرفع مبيعات وبصمة فليكس كام</p>
        </div>
        
        <Button 
          variant="outline" 
          onClick={fetchStrategy} 
          disabled={loading}
          className="h-11 border-brand-primary/10 hover:bg-brand-primary/5 gap-2 px-6 shadow-sm"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
          تحديث التحليل الحالي
        </Button>
      </div>

      {/* Metrics Spotlight Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-none shadow-xl shadow-indigo-100">
            <CardContent className="p-6">
               <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm"><TrendingUp className="h-5 w-5" /></div>
                  <Badge className="bg-white/20 border-none text-[10px]">30 يوم الأخيرة</Badge>
               </div>
               <p className="text-xs text-indigo-100 font-bold mb-1">معدل التحويل (Conv. Rate)</p>
               <h3 className="text-2xl font-black">2.4%</h3>
               <div className="h-1 w-full bg-white/10 mt-4 rounded-full overflow-hidden">
                  <div className="h-full bg-white w-1/3" />
               </div>
            </CardContent>
         </Card>
         
         <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white border-none shadow-xl shadow-rose-100">
            <CardContent className="p-6">
               <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm"><Timer className="h-5 w-5" /></div>
                  <Badge className="bg-white/20 border-none text-[10px]">قابلة للاسترداد</Badge>
               </div>
               <p className="text-xs text-rose-100 font-bold mb-1">قيمة السلال المهجورة</p>
               <h3 className="text-2xl font-black">$4,280</h3>
               <p className="text-[10px] text-rose-100 mt-4">بناءً على 12 عملية لم تكتمل</p>
            </CardContent>
         </Card>

         <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none shadow-xl shadow-emerald-100">
            <CardContent className="p-6">
               <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm"><Users className="h-5 w-5" /></div>
                  <Badge className="bg-white/20 border-none text-[10px]">اهتمام عالي</Badge>
               </div>
               <p className="text-xs text-emerald-100 font-bold mb-1">العملاء المحتملين (Leads)</p>
               <h3 className="text-2xl font-black">84</h3>
               <p className="text-[10px] text-emerald-100 mt-4">جاهزون للمتابعة الشخصية</p>
            </CardContent>
         </Card>

         <Card className="bg-white border-brand-primary/10 shadow-lg group hover:scale-[1.02] transition-transform">
            <CardContent className="p-6 flex flex-col justify-center h-full">
               <div className="flex items-center gap-2 text-brand-primary font-bold mb-2">
                  <ShieldCheck className="h-5 w-5" />
                  صحة العلامة
               </div>
               <p className="text-3xl font-black text-text-heading">92/100</p>
               <p className="text-[10px] text-muted-foreground mt-2">SEO + توازن الأسعار + توفر المخزون</p>
            </CardContent>
         </Card>
      </div>

      {/* Strategic AI Feed */}
      <div className="space-y-4">
         <div className="flex items-center gap-2 px-1">
            <Sparkles className="h-5 w-5 text-brand-primary fill-brand-primary/20" />
            <h2 className="text-xl font-bold">التوصيات الاستراتيجية (AI Strategic Stream)</h2>
         </div>

         <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
               Array(6).fill(0).map((_, i) => (
                  <Card key={i} className="animate-pulse h-[280px] bg-slate-50/50 border-none" />
               ))
            ) : tasks.length === 0 ? (
               <Card className="col-span-full py-20 border-dashed border-2 flex flex-col items-center justify-center bg-slate-50/40">
                  <LayoutDashboard className="h-16 w-16 text-muted-foreground opacity-10 mb-4" />
                  <p className="text-muted-foreground font-medium italic">مركز التحليل فارغ حالياً. حاول تحديث البيانات.</p>
               </Card>
            ) : tasks.map((task) => (
               <Card key={task.id} className="group relative overflow-hidden border-none shadow-md bg-white hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col h-full ring-1 ring-slate-100">
                  <div className={cn("absolute top-0 right-0 h-1 w-full", 
                     task.priority === 'critical' ? 'bg-rose-500' : 
                     task.priority === 'high' ? 'bg-orange-500' : 'bg-brand-primary'
                  )} />
                  
                  <CardHeader className="pb-3">
                     <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 group-hover:bg-white group-hover:rotate-6 transition-all duration-300">
                           {getTypeIcon(task.type)}
                        </div>
                        <Badge className={cn("px-2 py-0.5 text-[10px] font-bold border-none", getPriorityStyles(task.priority))}>
                           {task.priority === 'critical' ? 'حرج جداً' : task.priority === 'high' ? 'أولوية قصوى' : 'تحسين هام'}
                        </Badge>
                     </div>
                     <CardTitle className="text-xl font-black text-text-heading leading-tight group-hover:text-brand-primary transition-colors">
                        {task.title}
                     </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="flex-grow pt-0 pb-6">
                     <p className="text-sm text-slate-600 leading-relaxed font-medium line-clamp-3">
                        {task.description}
                     </p>
                  </CardContent>
                  
                  <CardFooter className="bg-slate-50/80 p-5 group-hover:bg-white border-t border-slate-100/50 transition-colors">
                     <Link href={task.actionLink} className="w-full">
                        <Button className="w-full h-12 gap-3 bg-brand-primary text-white font-bold shadow-lg shadow-brand-primary/10 group-hover:shadow-brand-primary/25 transition-all">
                           {task.actionLabel}
                           <MousePointer2 className="h-4 w-4" />
                        </Button>
                     </Link>
                  </CardFooter>
               </Card>
            ))}
         </div>
      </div>

      {/* Strategic Vision Banner */}
      <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 p-8 md:p-12 text-white shadow-2xl">
         <div className="absolute -right-20 -top-20 w-80 h-80 bg-brand-primary/20 rounded-full blur-[100px]" />
         <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-[100px]" />
         
         <div className="relative flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1 space-y-6">
               <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-brand-primary-light">
                  <Sparkles className="h-4 w-4" /> تقارير "ما وراء البيانات"
               </div>
               <h3 className="text-3xl md:text-4xl font-black leading-tight">
                  حوّل المشاهدات إلى <span className="text-brand-primary">أصول استقطاب</span> دائمة.
               </h3>
               <p className="text-slate-400 leading-relaxed text-lg max-w-2xl">
                  نظام "كورتكس" لا يقترح فقط، بل يتعلم من عادات حجز عملائك. تذكر أن 80% من نمو العلامة يأتي من 20% من التحسينات التي تظهر هنا.
               </p>
               <div className="flex flex-wrap gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3">
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">المعالجة الحالية</p>
                     <p className="text-xl font-black">1.2M نقطة بيانات / يوم</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3">
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">دقة التوقعات</p>
                     <p className="text-xl font-black text-brand-primary">94.8%</p>
                  </div>
               </div>
            </div>
            
            <div className="w-full md:w-auto">
               <div className="relative p-1 bg-gradient-to-tr from-brand-primary to-indigo-500 rounded-[2.5rem] shadow-2xl shadow-brand-primary/20">
                  <div className="bg-slate-900 rounded-[2.3rem] p-8 space-y-4 min-w-[300px]">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-brand-primary" /></div>
                        <span className="text-sm font-bold">تم إصلاح 312 فجوة SEO</span>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center"><AlertTriangle className="h-5 w-5 text-emerald-500" /></div>
                        <span className="text-sm font-bold">توفير 15% من ميزانية "أدز"</span>
                     </div>
                     <div className="pt-4 border-t border-white/10">
                        <Button className="w-full h-11 bg-white text-slate-900 hover:bg-slate-100 font-black">تنزيل تقرير الـ ROI الكامل</Button>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  )
}
