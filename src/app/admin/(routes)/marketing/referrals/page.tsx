'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  Loader2,
  Zap,
  Gift,
  Copy,
  Check,
  Download
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'

export default function ReferralHubPage() {
  const [stats, setStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [influencerName, setInfluencerName] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [codeCopied, setCodeCopied] = useState(false)
  const [commissionRate, setCommissionRate] = useState('0.05')
  const [payouts, setPayouts] = useState<any[]>([])
  const [loadingPayouts, setLoadingPayouts] = useState(false)
  const [payoutPeriod, setPayoutPeriod] = useState({ start: '', end: '' })

  const fetchStats = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/marketing/referrals')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setStats(data.stats || [])
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load referral stats', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const fetchPayouts = async () => {
    try {
      setLoadingPayouts(true)
      const res = await fetch('/api/admin/marketing/referrals/payouts')
      const data = await res.json()
      setPayouts(data.payouts || [])
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load payouts' })
    } finally {
      setLoadingPayouts(false)
    }
  }

  const handleGeneratePayouts = async () => {
    if (!payoutPeriod.start || !payoutPeriod.end) return
    try {
      setLoadingPayouts(true)
      const res = await fetch('/api/admin/marketing/referrals/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: payoutPeriod.start, endDate: payoutPeriod.end })
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'تم التوليد ✅', description: 'تم إنشاء مستحقات الدفع للفترة المحددة' })
      fetchPayouts()
    } catch (err) {
      toast({ title: 'خطأ', description: 'فشل في توليد المستحقات' })
    } finally {
      setLoadingPayouts(false)
    }
  }

  const handleMarkAsPaid = async (payoutId: string) => {
    const tx = prompt('أدخل رقم العملية (Transaction ID):')
    if (!tx) return
    try {
      const res = await fetch('/api/admin/marketing/referrals/payouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutId, transactionId: tx })
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'تم التحديث ✓', description: 'تم تحديد المستحقات كمدفوعة' })
      fetchPayouts()
    } catch (err) {
      toast({ title: 'خطأ', description: 'فشل التحديث' })
    }
  }

  useEffect(() => { 
    fetchStats()
    fetchPayouts()
  }, [])

  const totalClicks = stats.reduce((acc, s) => acc + s.clicks, 0)
  const totalConversions = stats.reduce((acc, s) => acc + s.conversions, 0)
  const totalRevenue = stats.reduce((acc, s) => acc + (s.revenue || 0), 0)
  const avgCR = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : '0.0'
  const topReferrer = stats.length > 0 ? [...stats].sort((a,b) => b.conversions - a.conversions)[0] : null

  // Fix 5: Generate referral code for influencer and save to DB
  const handleGenerateCode = async () => {
    if (!influencerName.trim()) return
    try {
      setLoading(true)
      const res = await fetch('/api/admin/marketing/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: influencerName.trim(),
          commissionRate: parseFloat(commissionRate)
        })
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setGeneratedCode(data.code)
      fetchStats() // Refresh list
    } catch (err) {
      toast({ title: 'خطأ', description: 'فشل في إنشاء الكود', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode)
    setCodeCopied(true)
    toast({ title: 'تم النسخ ✓', description: `كود الإحالة: ${generatedCode}` })
    setTimeout(() => setCodeCopied(false), 2000)
  }

  // Fix 11: CSV export for referral data
  const downloadCsv = () => {
    const headers = ['Code', 'Clicks', 'Conversions', 'Revenue (SAR)', 'CR%']
    const rows = stats.map(s => [s.code, s.clicks, s.conversions, s.revenue || 0, ((s.conversions / (s.clicks || 1)) * 100).toFixed(1)])
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `flixcam_referrals_${new Date().toISOString().slice(0,10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-text-heading">برنامج الإحالة (Referral Hub)</h1>
        <p className="text-sm text-muted-foreground">تتبع وإدارة السفراء والمؤثرين المحولين للعملاء</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-wider font-bold">إجمالي الإحالات</CardDescription>
            <CardTitle className="text-3xl font-bold text-brand-primary">{totalClicks}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
               <TrendingUp className="h-3 w-3 text-emerald-500" />
               معدل التحويل: <b>{avgCR}%</b>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-brand-primary/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-wider font-bold">التحويلات الناجحة</CardDescription>
            <CardTitle className="text-3xl font-bold text-emerald-600">{totalConversions}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[10px] text-muted-foreground">
               إجمالي الإيرادات: <b>{totalRevenue.toLocaleString()} ر.س</b>
            </div>
          </CardContent>
        </Card>

        <Card className="border-brand-primary/10 shadow-sm bg-brand-primary/5">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-wider font-bold text-brand-primary">أعلى سفير</CardDescription>
            <CardTitle className="text-3xl font-bold">{topReferrer?.code || '-'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[10px] text-muted-foreground">
               حقق <b>{topReferrer?.conversions || 0}</b> تحويلاً
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="leaderboard" className="w-full">
        <TabsList className="bg-slate-100 p-1 mb-4 h-auto">
           <TabsTrigger value="leaderboard" className="px-6 py-2 text-xs font-bold data-[state=active]:bg-white">المتصدرون</TabsTrigger>
           <TabsTrigger value="payouts" className="px-6 py-2 text-xs font-bold data-[state=active]:bg-white">المستحقات والعمولات</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard">
          <Card className="border-brand-primary/10 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b">
               <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">قائمة السفراء (Referrer Leaderboard)</CardTitle>
                    <CardDescription>تتبع أداء كل كود مخصص</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={downloadCsv} disabled={!stats.length}>
                     <Download className="h-3 w-3" />
                     تصدير البيانات
                  </Button>
               </div>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">كود الإحالة</TableHead>
                  <TableHead className="text-right">السفير / المؤثر</TableHead>
                  <TableHead className="text-center">النقرات</TableHead>
                  <TableHead className="text-center">التحويلات</TableHead>
                  <TableHead className="text-center">الإيرادات</TableHead>
                  <TableHead className="text-center">معدل التحويل</TableHead>
                  <TableHead className="text-left">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                   <TableRow><TableCell colSpan={7} className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-brand-primary/20" /></TableCell></TableRow>
                ) : stats.length === 0 ? (
                   <TableRow><TableCell colSpan={7} className="text-center py-10 italic text-muted-foreground">لا توجد بيانات إحالة حالياً.</TableCell></TableRow>
                ) : stats.map((s) => (
                  <TableRow key={s.code} className="hover:bg-slate-50/50 transition-colors text-xs">
                    <TableCell>
                      <div className="p-1 px-2 border border-brand-primary/10 bg-brand-primary/5 rounded font-mono text-[10px] font-bold w-fit text-brand-primary tracking-tighter">{s.code}</div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{s.name || s.code}</TableCell>
                    <TableCell className="text-center">{s.clicks}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-100 h-5 px-1.5">{s.conversions}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-bold text-brand-secondary">{(s.revenue || 0).toLocaleString()} ر.س</TableCell>
                    <TableCell className="text-center">{((s.conversions / (s.clicks || 1)) * 100).toFixed(1)}%</TableCell>
                    <TableCell><Badge variant="outline" className="text-slate-400 shadow-none h-4 text-[9px] font-normal uppercase">Active</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
           <Card className="border-brand-primary/10 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50 border-b">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                       <CardTitle className="text-lg">إدارة العمولات والمستحقات</CardTitle>
                       <CardDescription>تسوية الحسابات المالية للسفراء</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                       <Input type="date" value={payoutPeriod.start} onChange={e => setPayoutPeriod(p => ({ ...p, start: e.target.value }))} className="h-8 w-32 text-xs" />
                       <Input type="date" value={payoutPeriod.end} onChange={e => setPayoutPeriod(p => ({ ...p, end: e.target.value }))} className="h-8 w-32 text-xs" />
                       <Button size="sm" onClick={handleGeneratePayouts} disabled={loadingPayouts} className="text-xs h-8">توليد المستحقات</Button>
                    </div>
                 </div>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead className="text-right">السفير</TableHead>
                     <TableHead className="text-center">الفترة</TableHead>
                     <TableHead className="text-center">المبلغ المستحق</TableHead>
                     <TableHead className="text-center">الحالة</TableHead>
                     <TableHead className="text-center">رقم العملية</TableHead>
                     <TableHead className="text-left">الإجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {loadingPayouts ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto text-brand-primary/20" /></TableCell></TableRow>
                   ) : payouts.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-20 italic text-muted-foreground">لا توجد مستحقات حالياً.</TableCell></TableRow>
                   ) : payouts.map(p => (
                      <TableRow key={p.id} className="text-xs">
                         <TableCell className="font-bold">{p.referral?.name || p.referral?.code}</TableCell>
                         <TableCell className="text-center text-[10px] text-muted-foreground">{new Date(p.periodStart).toLocaleDateString()} - {new Date(p.periodEnd).toLocaleDateString()}</TableCell>
                         <TableCell className="text-center font-bold text-brand-primary">{Number(p.amount).toLocaleString()} ر.س</TableCell>
                         <TableCell className="text-center">
                            <Badge className={p.status === 'PAID' ? 'bg-emerald-500' : 'bg-amber-500'}>{p.status === 'PAID' ? 'مكتمل' : 'معلق'}</Badge>
                         </TableCell>
                         <TableCell className="text-center font-mono text-[9px]">{p.transactionId || '-'}</TableCell>
                         <TableCell>
                            {p.status === 'PENDING' && (
                               <Button size="sm" variant="outline" className="h-7 text-[10px] border-brand-primary text-brand-primary hover:bg-brand-primary/10" onClick={() => handleMarkAsPaid(p.id)}>تحديد كمدفوع</Button>
                            )}
                         </TableCell>
                      </TableRow>
                   ))}
                </TableBody>
              </Table>
           </Card>
        </TabsContent>
      </Tabs>
      
      <Card className="bg-slate-900 text-white border-0 shadow-xl overflow-hidden relative group">
         <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-all"><Gift className="h-32 w-32" /></div>
         <CardContent className="p-8 relative">
            <div className="max-w-2xl">
               <h3 className="text-2xl font-bold mb-2">هل ترغب في إنشاء حملة سفراء جديدة؟</h3>
               <p className="text-slate-400 text-sm mb-6">يمكنك تخصيص أكواد خاصة للمؤثرين لزيادة المبيعات بشكل عضوي.</p>
               <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                 <DialogTrigger asChild>
                   <Button className="bg-brand-primary hover:bg-brand-primary/90 text-white border-0 px-8 h-12 rounded-xl gap-2 font-bold shadow-lg shadow-brand-primary/20">
                      إنشاء كود إحالة للمؤثرين
                      <Zap className="h-4 w-4" />
                   </Button>
                 </DialogTrigger>
                 <DialogContent dir="rtl" className="sm:max-w-[425px]">
                   <DialogHeader>
                     <DialogTitle>إنشاء كود إحالة جديد</DialogTitle>
                     <DialogDescription>أدخل اسم المؤثر أو معرّفه لإنشاء كود فريد.</DialogDescription>
                   </DialogHeader>
                   <div className="space-y-4 py-4">
                     <div className="space-y-2">
                       <Label htmlFor="influencer-name">اسم المؤثر / المعرّف</Label>
                       <Input id="influencer-name" value={influencerName} onChange={(e) => setInfluencerName(e.target.value)} placeholder="مثال: ahmed_studio" dir="ltr" />
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="commission-rate">نسبة العموله (مثال: 0.10 لـ 10%)</Label>
                       <Input id="commission-rate" type="number" step="0.01" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} dir="ltr" />
                     </div>
                     <Button onClick={handleGenerateCode} className="w-full" disabled={!influencerName.trim()}>توليد الكود</Button>
                     {generatedCode && (
                       <div className="bg-slate-50 border rounded-lg p-4 flex items-center justify-between">
                         <div>
                           <p className="text-xs text-muted-foreground mb-1">كود الإحالة المولد:</p>
                           <p className="font-mono font-bold text-lg text-brand-primary">{generatedCode}</p>
                         </div>
                         <Button variant="outline" size="icon" onClick={copyCode}>
                           {codeCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                         </Button>
                       </div>
                     )}
                   </div>
                 </DialogContent>
               </Dialog>
            </div>
         </CardContent>
      </Card>
    </div>
  )
}
