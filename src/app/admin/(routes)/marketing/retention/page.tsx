'use client'

import { useState, useEffect } from 'react'
import { 
  Zap, 
  Loader2, 
  AlertTriangle, 
  Heart, 
  Star,
  MessageSquare,
  ArrowUpRight,
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from '@/hooks/use-toast'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

export default function RetentionHubPage() {
  const [segments, setSegments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [draftOpen, setDraftOpen] = useState(false)
  const [draftLoading, setDraftLoading] = useState(false)
  const [draftContent, setDraftContent] = useState('')
  const [draftCustomer, setDraftCustomer] = useState<any>(null)
  const [campaignLoading, setCampaignLoading] = useState(false)

  const fetchSegments = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/marketing/retention')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setSegments(data.segments || [])
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load retention stats', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSegments() }, [])

  const segmentStats = segments.reduce((acc, s) => {
    acc[s.segment] = (acc[s.segment] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const chartData = Object.entries(segmentStats).map(([name, value]) => ({ name, value }))
  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#6366f1']

  const handleDraftReengagement = async (customer: any) => {
    setDraftCustomer(customer)
    setDraftOpen(true)
    setDraftLoading(true)
    setDraftContent('')
    try {
      const res = await fetch('/api/admin/marketing/ai/reply-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadName: customer.name,
          leadMessage: `عميل من فئة "${customer.segment}" - أنفق ${customer.rfm.monetary} ر.س - آخر حجز منذ ${customer.rfm.recency} يوم - عدد الحجوزات: ${customer.rfm.frequency}. اكتب رسالة واتساب مخصصة لإعادة تواصل مع تقديم عرض خصم حصري.`
        })
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setDraftContent(data.draft || 'لم يتمكن الذكاء الاصطناعي من إنشاء مسودة.')
    } catch {
      setDraftContent('حدث خطأ أثناء إنشاء المسودة. يرجى المحاولة مرة أخرى.')
    } finally {
      setDraftLoading(false)
    }
  }

  const handleGenerateCampaign = async () => {
    setCampaignLoading(true)
    try {
      const atRiskCount = segmentStats['At Risk'] || 0
      const dormantCount = segmentStats['Dormant'] || 0
      const avgCLV = segments.length > 0 
        ? (segments.reduce((acc: number, s: any) => acc + s.rfm.monetary, 0) / segments.length).toFixed(0) 
        : '0'
      const res = await fetch('/api/admin/marketing/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: `Retention Analysis: ${atRiskCount} at-risk customers, ${dormantCount} dormant customers, avg CLV = ${avgCLV} SAR. Suggest a targeted re-engagement campaign strategy in Arabic.`
        })
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      toast({ title: '✨ استراتيجية الذكاء الاصطناعي', description: data.analysis?.slice(0, 200) || 'تم إنشاء الاستراتيجية بنجاح.' })
    } catch {
      toast({ title: 'خطأ', description: 'فشل في إنشاء الاستراتيجية', variant: 'destructive' })
    } finally {
      setCampaignLoading(false)
    }
  }

  const getSegmentBadge = (segment: string) => {
    switch (segment) {
      case 'Whale': return <Badge className="bg-sky-500 text-white border-0"><Star className="h-3 w-3 mr-1" /> Whale (قيمة عالية جداً)</Badge>
      case 'Loyalist': return <Badge className="bg-emerald-500 text-white border-0"><Heart className="h-3 w-3 mr-1" /> Loyalist (منضبط)</Badge>
      case 'At Risk': return <Badge className="bg-amber-500 text-white border-0"><AlertTriangle className="h-3 w-3 mr-1" /> At Risk (عرضة للفقد)</Badge>
      case 'Dormant': return <Badge className="bg-rose-500 text-white border-0">Dormant (متوقف)</Badge>
      default: return <Badge variant="secondary">New (جديد)</Badge>
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-text-heading">تحليلات الاحتفاظ بالعملاء (Retention Hub)</h1>
        <p className="text-sm text-muted-foreground">تحليل القيمة الدائمة للعملاء وتوقع تراجع الاهتمام (Churn Prediction)</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-brand-primary/10 shadow-sm">
           <CardHeader className="pb-2">
              <CardDescription className="text-xs font-bold uppercase tracking-wider">متوسط القيمة الدائمة (Avg CLV)</CardDescription>
              <CardTitle className="text-3xl font-bold text-brand-primary">
                 {(segments.reduce((acc, s) => acc + s.rfm.monetary, 0) / (segments.length || 1)).toFixed(0)} ر.س
              </CardTitle>
           </CardHeader>
        </Card>
        <Card className="border-brand-primary/10 shadow-sm">
           <CardHeader className="pb-2">
              <CardDescription className="text-xs font-bold uppercase tracking-wider">عملاء "الحيتان" (Whales)</CardDescription>
              <CardTitle className="text-3xl font-bold text-sky-600">{segmentStats['Whale'] || 0}</CardTitle>
           </CardHeader>
        </Card>
        <Card className="border-brand-primary/10 shadow-sm">
           <CardHeader className="pb-2">
              <CardDescription className="text-xs font-bold uppercase tracking-wider">المعرضون للمخاطرة (At Risk)</CardDescription>
              <CardTitle className="text-3xl font-bold text-rose-600">{segmentStats['At Risk'] || 0}</CardTitle>
           </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
         <Card className="border-brand-primary/10 shadow-sm">
            <CardHeader><CardTitle className="text-lg">توزيع فئات العملاء (Segmentation)</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                     </Pie>
                     <Tooltip /><Legend />
                  </PieChart>
               </ResponsiveContainer>
            </CardContent>
         </Card>
         <Card className="bg-slate-900 text-white border-0 shadow-xl p-8 flex flex-col justify-center">
            <Zap className="h-10 w-10 text-brand-primary mb-4" />
            <h3 className="text-xl font-bold mb-2">رؤى الذكاء الاصطناعي للاحتفاظ</h3>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
               بناءً على تحليل RFM، هناك <b>{segmentStats['At Risk'] || 0} عملاء</b> لم يحجزوا منذ أكثر من 60 يوماً.
            </p>
            <Button className="bg-brand-primary hover:bg-brand-primary/90 text-white border-0 rounded-xl gap-2 font-bold w-fit" onClick={handleGenerateCampaign} disabled={campaignLoading}>
               {campaignLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
               توليد حملة استهداف آلي
            </Button>
         </Card>
      </div>

      <Card className="border-brand-primary/10 shadow-sm overflow-hidden">
         <Table>
            <TableHeader className="bg-slate-50">
               <TableRow>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-center">فئة العميل</TableHead>
                  <TableHead className="text-center">إجمالي الإنفاق</TableHead>
                  <TableHead className="text-center">آخر حجز (منذ أيام)</TableHead>
                  <TableHead className="text-left">إجراءات ذكية</TableHead>
               </TableRow>
            </TableHeader>
            <TableBody>
               {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-brand-primary/20" /></TableCell></TableRow>
               ) : segments.map((s) => (
                  <TableRow key={s.userId} className="hover:bg-slate-50/50 transition-colors">
                     <TableCell><div className="flex flex-col"><span className="font-bold text-sm">{s.name}</span><span className="text-xs text-muted-foreground">{s.email}</span></div></TableCell>
                     <TableCell className="text-center">{getSegmentBadge(s.segment)}</TableCell>
                     <TableCell className="text-center font-bold">{s.rfm.monetary} ر.س</TableCell>
                     <TableCell className="text-center text-xs">{s.rfm.recency} يوم</TableCell>
                     <TableCell>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-brand-primary border-brand-primary/20 hover:bg-brand-primary/5 shadow-none" onClick={() => handleDraftReengagement(s)}>
                           <MessageSquare className="h-3.5 w-3.5" /> مسودة إعادة تواصل
                        </Button>
                     </TableCell>
                  </TableRow>
               ))}
            </TableBody>
         </Table>
      </Card>

      <Sheet open={draftOpen} onOpenChange={setDraftOpen}>
        <SheetContent side="left" className="w-[400px] sm:w-[500px] overflow-y-auto" dir="rtl">
          <SheetHeader className="text-right pb-6 border-b">
            <SheetTitle className="text-xl font-bold flex items-center gap-2"><MessageSquare className="h-5 w-5 text-brand-primary" /> مسودة إعادة تواصل</SheetTitle>
            {draftCustomer && <p className="text-sm text-muted-foreground mt-2">للعميل: <b>{draftCustomer.name}</b></p>}
          </SheetHeader>
          <div className="py-6">
            {draftLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-brand-primary/30" />
                <p className="text-sm text-muted-foreground">الذكاء الاصطناعي يكتب الرسالة...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap">{draftContent}</div>
                <Button className="w-full gap-2" onClick={() => { navigator.clipboard.writeText(draftContent); toast({ title: 'تم النسخ ✓', description: 'تم نسخ الرسالة إلى الحافظة.' }) }}>نسخ الرسالة</Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
