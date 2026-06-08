'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  MousePointer2, 
  Target, 
  Loader2,
  Calendar,
  Filter,
  ArrowRight,
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'

export default function AttributionPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [model, setModel] = useState('LINEAR')
  const [period, setPeriod] = useState({ start: '', end: '' })

  const fetchAttribution = async () => {
    try {
      setLoading(true)
      const query = new URLSearchParams({
        model,
        ...(period.start && { startDate: period.start }),
        ...(period.end && { endDate: period.end })
      })
      const res = await fetch(`/api/admin/marketing/attribution?${query}`)
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      setData(json.roas || [])
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load attribution data', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAttribution() }, [model])

  const totalRevenue = data.reduce((acc, item) => acc + item.revenue, 0)

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-text-heading">تحليلات العزو (Multi-Touch Attribution)</h1>
          <p className="text-sm text-muted-foreground">توزيع الإيرادات على قنوات التسويق المختلفة بناءً على رحلة العميل</p>
        </div>
        <div className="flex items-center gap-2">
           <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-[180px] h-9 text-xs">
                 <SelectValue placeholder="نموذج العزو" />
              </SelectTrigger>
              <SelectContent>
                 <SelectItem value="LINEAR">عزو خطي (Linear)</SelectItem>
                 <SelectItem value="FIRST_TOUCH">أول نقرة (First-Touch)</SelectItem>
                 <SelectItem value="LAST_TOUCH">آخر نقرة (Last-Touch)</SelectItem>
                 <SelectItem value="TIME_DECAY">تناقص زمني (Time-Decay)</SelectItem>
              </SelectContent>
           </Select>
           <Input type="date" className="h-9 w-32 text-[10px]" value={period.start} onChange={e => setPeriod(p => ({ ...p, start: e.target.value }))} />
           <Input type="date" className="h-9 w-32 text-[10px]" value={period.end} onChange={e => setPeriod(p => ({ ...p, end: e.target.value }))} />
           <Button variant="outline" size="icon" className="h-9 w-9" onClick={fetchAttribution}><Filter className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
         <Card className="border-brand-primary/10 shadow-sm">
            <CardHeader className="pb-2">
               <CardDescription className="text-xs font-bold uppercase tracking-wider">إجمالي المبيعات المنسوبة</CardDescription>
               <CardTitle className="text-2xl font-bold text-brand-primary">{totalRevenue.toLocaleString()} <small className="text-xs font-normal">ر.س</small></CardTitle>
            </CardHeader>
         </Card>
         <Card className="border-brand-primary/10 shadow-sm">
            <CardHeader className="pb-2">
               <CardDescription className="text-xs font-bold uppercase tracking-wider">القناة الأعلى أداءً</CardDescription>
               <CardTitle className="text-2xl font-bold text-emerald-600">{data[0]?.source || '-'}</CardTitle>
            </CardHeader>
         </Card>
         <Card className="border-brand-primary/10 shadow-sm bg-slate-50">
            <CardHeader className="pb-2">
               <CardDescription className="text-xs font-bold uppercase tracking-wider">النموذج النشط</CardDescription>
               <CardTitle className="text-lg font-bold">
                  {model === 'LINEAR' ? 'خطي' : model === 'FIRST_TOUCH' ? 'أول نقرة' : model === 'LAST_TOUCH' ? 'آخر نقرة' : 'تناقص زمني'}
               </CardTitle>
            </CardHeader>
         </Card>
         <Card className="border-brand-primary/10 shadow-sm">
            <CardHeader className="pb-2">
               <CardDescription className="text-xs font-bold uppercase tracking-wider">دقة التتبع</CardDescription>
               <CardTitle className="text-2xl font-bold text-brand-secondary">94%</CardTitle>
            </CardHeader>
         </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
         <Card className="lg:col-span-2 border-brand-primary/10 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b">
               <CardTitle className="text-lg">توزيع الإيرادات حسب القناة</CardTitle>
               <CardDescription>كيف تساهم كل قناة في إقفال الصفقات</CardDescription>
            </CardHeader>
            <Table>
               <TableHeader>
                  <TableRow>
                     <TableHead className="text-right">قناة التسويق (Source)</TableHead>
                     <TableHead className="text-center">الإيراد المنسوب</TableHead>
                     <TableHead className="text-center">الحصة من الإجمالي</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {loading ? (
                     <TableRow><TableCell colSpan={3} className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto text-brand-primary/20" /></TableCell></TableRow>
                  ) : data.length === 0 ? (
                     <TableRow><TableCell colSpan={3} className="text-center py-20 italic text-muted-foreground">لا توجد بيانات متاحة.</TableCell></TableRow>
                  ) : data.map((item, i) => (
                     <TableRow key={i} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-bold text-slate-700">{item.source}</TableCell>
                        <TableCell className="text-center font-bold text-brand-primary">{Number(item.revenue).toLocaleString()} ر.س</TableCell>
                        <TableCell className="w-[200px]">
                           <div className="flex flex-col gap-1">
                              <div className="flex justify-between text-[10px]">
                                 <span>{((item.revenue / (totalRevenue || 1)) * 100).toFixed(1)}%</span>
                              </div>
                              <Progress value={(item.revenue / (totalRevenue || 1)) * 100} className="h-1.5" />
                           </div>
                        </TableCell>
                     </TableRow>
                  ))}
               </TableBody>
            </Table>
         </Card>

         <Card className="border-brand-primary/10 shadow-sm h-fit">
            <CardHeader>
               <CardTitle className="text-md flex items-center gap-2">
                  <Info className="h-4 w-4 text-brand-primary" />
                  عن نماذج العزو
               </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs leading-relaxed">
               <div className="p-3 bg-slate-50 rounded-lg">
                  <h4 className="font-bold mb-1 text-slate-800">النموذج الخطي (Linear)</h4>
                  <p className="text-muted-foreground">يعطي وزناً متساوياً لجميع الحوارات التي قام بها العميل قبل الحجز.</p>
               </div>
               <div className="p-3 bg-slate-50 rounded-lg">
                  <h4 className="font-bold mb-1 text-slate-800">التناقص الزمني (Time-Decay)</h4>
                  <p className="text-muted-foreground">يعطي وزناً أكبر للنقرات التي حدثت في وقت قريب جداً من عملية الحجز.</p>
               </div>
               <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <h4 className="font-bold mb-1 text-emerald-800">نصيحة ذكية</h4>
                  <p className="text-emerald-700">استخدم "Time-Decay" لقياس فعالية حملات "إعادة الاستهداف"، واستخدم "First-Touch" لقياس حملات "الوعي بالعلامة التجارية".</p>
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  )
}
