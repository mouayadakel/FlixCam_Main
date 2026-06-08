'use client'

import { useState, useEffect } from 'react'
import { 
  Split, 
  TrendingUp, 
  Loader2,
  Target,
  Zap
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { Plus } from 'lucide-react'

export default function AbTestingPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [experiments, setExperiments] = useState<string[]>([])
  const [selectedExperiment, setSelectedExperiment] = useState('home_cta_v1')
  const [createOpen, setCreateOpen] = useState(false)
  const [newExpName, setNewExpName] = useState('')

  const fetchExperiments = async () => {
    try {
      const res = await fetch('/api/admin/marketing/ab-testing?list=true')
      if (res.ok) {
        const json = await res.json()
        setExperiments(json.experiments || ['home_cta_v1'])
      }
    } catch { /* default list */ }
  }

  const fetchStats = async (experiment: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/marketing/ab-testing?experiment=${experiment}`)
      if (!res.ok) throw new Error('Failed')
      setData(await res.json())
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load A/B stats', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateExperiment = async () => {
    if (!newExpName.trim()) return
    try {
      setLoading(true)
      const res = await fetch('/api/admin/marketing/ab-testing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newExpName.trim() })
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'تم البدء ✅', description: `تم إنشاء التجربة: ${newExpName}` })
      setCreateOpen(false)
      setNewExpName('')
      fetchExperiments()
    } catch (err) {
      toast({ title: 'خطأ', description: 'فشل في إنشاء التجربة', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchExperiments() }, [])
  useEffect(() => { fetchStats(selectedExperiment) }, [selectedExperiment])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary/20" />
      </div>
    )
  }

  const stats = data?.stats
  if (!stats) return null

  const crA = stats.A.views ? ((stats.A.conversions / stats.A.views) * 100).toFixed(1) : '0.0'
  const crB = stats.B.views ? ((stats.B.conversions / stats.B.views) * 100).toFixed(1) : '0.0'
  const winner = Number(crB) > Number(crA) ? 'B' : 'A'
  const diff = Math.abs(Number(crB) - Number(crA)).toFixed(1)

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-text-heading">اختبارات A/B (A/B Testing)</h1>
          <p className="text-sm text-muted-foreground">مقارنة أداء المتغيرات التسويقية لزيادة التحويل</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setCreateOpen(true)}>
             <Plus className="h-4 w-4" /> تجربة جديدة
          </Button>
          <Select value={selectedExperiment} onValueChange={setSelectedExperiment}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="اختر التجربة" />
            </SelectTrigger>
            <SelectContent>
              {experiments.length > 0 ? experiments.map(exp => (
                <SelectItem key={exp} value={exp}>{exp}</SelectItem>
              )) : (
                <SelectItem value="home_cta_v1">home_cta_v1</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* VARIANT A */}
        <Card className="border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-emerald-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 font-bold">A</div>
                المتغير الأصلي (Control)
              </CardTitle>
              <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100">نشط</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="grid grid-cols-2 gap-4">
               <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">المشاهدات</div>
                  <div className="text-2xl font-bold">{stats.A.views}</div>
               </div>
               <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">التحويلات</div>
                  <div className="text-2xl font-bold text-emerald-600">{stats.A.conversions}</div>
               </div>
             </div>
             <div className="space-y-2">
                <div className="flex justify-between text-sm">
                   <span className="text-muted-foreground">معدل التحويل (CR)</span>
                   <span className="font-bold">{crA}%</span>
                </div>
                <Progress value={Number(crA)} className="h-2 bg-slate-100" />
             </div>
             <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-sm text-muted-foreground">إجمالي العوائد</span>
                <span className="font-bold text-lg">{stats.A.revenue} ر.س</span>
             </div>
          </CardContent>
        </Card>

        {/* VARIANT B */}
        <Card className="border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-brand-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary font-bold">B</div>
                المتغير الجديد (Variant)
              </CardTitle>
              <Badge className="bg-brand-primary/5 text-brand-primary border-brand-primary/10">تجريبي</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="grid grid-cols-2 gap-4">
               <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">المشاهدات</div>
                  <div className="text-2xl font-bold">{stats.B.views}</div>
               </div>
               <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">التحويلات</div>
                  <div className="text-2xl font-bold text-brand-primary">{stats.B.conversions}</div>
               </div>
             </div>
             <div className="space-y-2">
                <div className="flex justify-between text-sm">
                   <span className="text-muted-foreground">معدل التحويل (CR)</span>
                   <span className="font-bold">{crB}%</span>
                </div>
                <Progress value={Number(crB)} className="h-2 bg-slate-100" />
             </div>
             <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-sm text-muted-foreground">إجمالي العوائد</span>
                <span className="font-bold text-lg">{stats.B.revenue} ر.س</span>
             </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-brand-primary/20 bg-brand-primary/5 shadow-sm">
        <CardContent className="p-6">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-primary text-white rounded-xl"><Zap className="h-6 w-6" /></div>
              <div className="flex-1">
                 <h4 className="font-bold text-lg">تحليل الذكاء الاصطناعي للفوارق</h4>
                 <p className="text-sm text-muted-foreground">
                    بناءً على البيانات الحالية، المتغير <b>{winner}</b> يتفوق بزيادة قدرها <b>{diff}%</b> في التحويلات.
                 </p>
              </div>
              <Button 
                className="bg-brand-primary shadow-lg shadow-brand-primary/20 gap-2"
                onClick={async () => {
                  const res = await fetch('/api/admin/marketing/ab-testing/adopt', {
                    method: 'POST',
                    body: JSON.stringify({ experimentName: selectedExperiment, winningVariant: winner })
                  })
                  if (res.ok) {
                    toast({ title: 'تم الاعتماد ✅', description: `تم تثبيت المتغير ${winner} كأصل جديد.` })
                  }
                }}
              >
                 تبني المتغير الفائز <Target className="h-4 w-4" />
              </Button>
           </div>
        </CardContent>
      </Card>

      {/* NEW: Create Experiment Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>بدء تجربة A/B جديدة</DialogTitle>
            <DialogDescription>أدخل اسم التجربة لتتبع أداء متغيرين (A و B).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>اسم التجربة (English slug)</Label>
              <Input value={newExpName} onChange={(e) => setNewExpName(e.target.value)} placeholder="مثال: home_hero_v2" dir="ltr" />
            </div>
            <Button className="w-full" onClick={handleCreateExperiment} disabled={!newExpName.trim()}>بدء التجربة</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
