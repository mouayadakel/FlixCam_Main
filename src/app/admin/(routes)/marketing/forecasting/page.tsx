'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Zap, 
  Loader2, 
  Search, 
  BarChart3,
  Lightbulb,
  Package
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
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'

export default function ForecastingPage() {
  const [data, setData] = useState<any[]>([])
  const [aiInsights, setAiInsights] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingAi, setLoadingAi] = useState(false)
  const [search, setSearch] = useState('')

  const fetchForecast = async (getAi = false) => {
    try {
      if (getAi) setLoadingAi(true)
      else setLoading(true)
      
      const res = await fetch(`/api/admin/marketing/forecasting?ai=${getAi}`)
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      setData(json.forecast || [])
      if (json.aiInsights) setAiInsights(json.aiInsights)
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load forecasting data', variant: 'destructive' })
    } finally {
      setLoading(false)
      setLoadingAi(false)
    }
  }

  useEffect(() => { fetchForecast() }, [])

  const filteredData = data.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) || 
    f.category.toLowerCase().includes(search.toLowerCase())
  )

  const highRiskCount = data.filter(f => f.riskLevel === 'HIGH').length

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-text-heading">رؤى وتوقعات المخزون (Inventory Intelligence)</h1>
          <p className="text-sm text-muted-foreground">توقع الطلب المستقبلي وتحليل مخاطر النفاد باستخدام الذكاء الاصطناعي</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" className="gap-2" onClick={() => fetchForecast(true)} disabled={loadingAi}>
              {loadingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4 text-brand-primary" />}
              تحديث رؤى الذكاء الاصطناعي
           </Button>
           <Input 
             placeholder="بحث عن معدة أو تصنيف..." 
             className="w-[250px] h-9" 
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider">بنود تحت خطر النفاد</CardDescription>
            <CardTitle className="text-3xl font-bold text-rose-600">{highRiskCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
               <AlertCircle className="h-3 w-3 text-rose-500" />
               تتطلب إجراءات شراء فورية
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider">متوسط استخدام الأصول</CardDescription>
            <CardTitle className="text-3xl font-bold text-brand-primary">
              {(data.reduce((acc, f) => acc + f.utilizationRate, 0) / (data.length || 1) * 100).toFixed(0)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
               <TrendingUp className="h-3 w-3 text-emerald-500" />
               أداء صحي للعام الحالي
            </div>
          </CardContent>
        </Card>

        <Card className="border-brand-primary/10 shadow-sm bg-brand-primary/5">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider">توقعات الطلب القادم</CardDescription>
            <CardTitle className="text-3xl font-bold text-brand-secondary">
               {data.reduce((acc, f) => acc + f.predictedDemand, 0)} <small className="text-xs font-normal">وحدة</small>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[10px] text-muted-foreground">
               زيادة متوقعة بنسبة <b>20%</b>
            </div>
          </CardContent>
        </Card>
      </div>

      {aiInsights && (
        <Card className="bg-slate-900 text-white border-0 shadow-xl overflow-hidden group">
          <CardContent className="p-8 relative">
             <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-all"><Zap className="h-40 w-40" /></div>
             <div className="flex items-start gap-6 relative">
                <div className="p-4 bg-brand-primary/20 rounded-2xl border border-brand-primary/30">
                   <Zap className="h-8 w-8 text-brand-primary" />
                </div>
                <div className="space-y-4 max-w-4xl">
                   <h3 className="text-2xl font-bold tracking-tight">استراتيجية المشتريات والنمو المقترحة (AI Strategy)</h3>
                   <div className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">
                      {aiInsights}
                   </div>
                   <div className="flex gap-4 pt-4">
                      <Button variant="outline" className="bg-white/5 border-white/10 text-white text-xs h-9 hover:bg-white/10">أرسل التقرير للمدير المالي</Button>
                      <Button className="bg-brand-primary hover:bg-brand-primary/90 text-white text-xs h-9 px-6 font-bold shadow-lg shadow-brand-primary/20">تفعيل حملة شراء</Button>
                   </div>
                </div>
             </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-brand-primary/10 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b">
           <CardTitle className="text-lg">تفاصيل التوقعات لكل معدّة</CardTitle>
           <CardDescription>بناءً على نشاط الـ 180 يوماً الماضية</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">المعدة / التصنيف</TableHead>
              <TableHead className="text-center">المخزون الحالي</TableHead>
              <TableHead className="text-center">الطلب المتوقع</TableHead>
              <TableHead className="text-center">الاستخدام</TableHead>
              <TableHead className="text-center">مستوى المخاطر</TableHead>
              <TableHead className="text-left">التوصية</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
               <TableRow><TableCell colSpan={6} className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto text-brand-primary/20" /></TableCell></TableRow>
            ) : filteredData.length === 0 ? (
               <TableRow><TableCell colSpan={6} className="text-center py-20 italic text-muted-foreground">لا توجد بيانات متاحة.</TableCell></TableRow>
            ) : filteredData.map((f) => (
              <TableRow key={f.equipmentId} className="hover:bg-slate-50/50 transition-colors">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{f.name}</span>
                    <span className="text-[10px] text-muted-foreground">{f.category}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center font-bold">{f.totalQuantity}</TableCell>
                <TableCell className="text-center">
                   <div className="flex flex-col items-center">
                      <span className="font-bold text-brand-primary">{f.predictedDemand}</span>
                      {f.predictedDemand > f.totalQuantity && <span className="text-[10px] text-rose-500 font-bold">عجز: {f.predictedDemand - f.totalQuantity}</span>}
                   </div>
                </TableCell>
                <TableCell className="text-center">
                   <div className="w-[100px] mx-auto space-y-1">
                      <div className="flex justify-between text-[10px]">
                         <span>{(f.utilizationRate * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={f.utilizationRate * 100} className="h-1" />
                   </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={
                    f.riskLevel === 'HIGH' ? "bg-rose-500 hover:bg-rose-600 border-0" : 
                    f.riskLevel === 'MEDIUM' ? "bg-amber-500 hover:bg-amber-600 border-0" : 
                    "bg-emerald-500 hover:bg-emerald-600 border-0"
                  }>
                    {f.riskLevel === 'HIGH' ? 'خطر عالٍ' : f.riskLevel === 'MEDIUM' ? 'متوسط' : 'آمن'}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px] text-[10px] leading-relaxed italic text-muted-foreground">
                   {f.recommendation}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
