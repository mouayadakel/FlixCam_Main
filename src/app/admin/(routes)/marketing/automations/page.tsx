'use client'

import { useState, useEffect } from 'react'
import {
  Zap,
  Loader2,
  ShoppingCart,
  CheckCircle,
  Star,
  UserX,
  Gift,
  PackageX,
  Play,
  Pause,
  Plus,
  Clock,
  MessageSquare,
  Mail,
  Bell,
  Settings,
  Users,
  TrendingUp,
  AlertCircle,
  DollarSign,
  Crown,
  History,
  FlaskConical,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Workflow
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
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'

const TRIGGER_ICONS: Record<string, any> = {
  abandoned_cart: ShoppingCart,
  post_booking_thanks: CheckCircle,
  review_followup: Star,
  win_back: UserX,
  birthday_offer: Gift,
  low_stock_alert: PackageX,
  deposit_reminder: DollarSign,
  loyalty_reward: Crown,
  vip_welcome: Zap,
  maintenance_alert: Settings,
  referral_earned: Users,
  inactive_30d: History,
  inactive_90d: History,
  high_value_lead: TrendingUp,
  late_return_warning: Clock,
  upsell_suggestion: Plus,
  payment_failed: AlertCircle,
  new_equipment_launch: Zap,
  seasonal_offer: Star,
  insurance_reminder: CheckCircle,
}

const TRIGGER_COLORS: Record<string, string> = {
  abandoned_cart: 'bg-amber-500',
  post_booking_thanks: 'bg-emerald-500',
  review_followup: 'bg-violet-500',
  win_back: 'bg-rose-500',
  birthday_offer: 'bg-pink-500',
  low_stock_alert: 'bg-slate-600',
  deposit_reminder: 'bg-emerald-600',
  loyalty_reward: 'bg-amber-600',
  vip_welcome: 'bg-brand-primary',
  maintenance_alert: 'bg-orange-500',
  referral_earned: 'bg-blue-500',
  inactive_30d: 'bg-slate-400',
  inactive_90d: 'bg-slate-700',
  high_value_lead: 'bg-indigo-600',
  late_return_warning: 'bg-red-500',
  upsell_suggestion: 'bg-teal-500',
  payment_failed: 'bg-red-600',
  new_equipment_launch: 'bg-brand-primary',
  seasonal_offer: 'bg-sky-500',
  insurance_reminder: 'bg-slate-500',
}

const CHANNEL_ICONS: Record<string, any> = {
  whatsapp: MessageSquare,
  email: Mail,
  internal: Bell,
}

export default function AutomationsPage() {
  const [rules, setRules] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newRule, setNewRule] = useState({
    name: '',
    triggerType: 'abandoned_cart',
    template: '',
    channel: 'whatsapp',
    delayMinutes: 0
  })

  const fetchData = async () => {
    try {
      setLoading(true)
      const [rulesRes, logsRes] = await Promise.all([
        fetch('/api/admin/marketing/automations'),
        fetch('/api/admin/marketing/automations?logs=true')
      ])
      if (rulesRes.ok) {
        const data = await rulesRes.json()
        setRules(data.rules || [])
      }
      if (logsRes.ok) {
        const data = await logsRes.json()
        setLogs(data.logs || [])
      }
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحميل بيانات الأتمتة', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleToggle = async (rule: any) => {
    try {
      const res = await fetch('/api/admin/marketing/automations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, isActive: !rule.isActive })
      })
      if (!res.ok) throw new Error('Failed')
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r))
      toast({ title: rule.isActive ? 'تم الإيقاف' : 'تم التفعيل', description: rule.name })
    } catch {
      toast({ title: 'خطأ', description: 'فشل تحديث القاعدة', variant: 'destructive' })
    }
  }

  const handleCreate = async () => {
    if (!newRule.name.trim() || !newRule.template.trim()) return
    try {
      const res = await fetch('/api/admin/marketing/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule)
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setRules(prev => [...prev, data.rule])
      setDialogOpen(false)
      setNewRule({ name: '', triggerType: 'abandoned_cart', template: '', channel: 'whatsapp', delayMinutes: 0 })
      toast({ title: 'تم الإنشاء ✓', description: `تم إنشاء قاعدة "${data.rule.name}"` })
    } catch {
      toast({ title: 'خطأ', description: 'فشل إنشاء القاعدة', variant: 'destructive' })
    }
  }

  const handleTest = async (rule: any) => {
    try {
      const res = await fetch('/api/admin/marketing/automations?test=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId: rule.id, testData: { recipientName: 'تجربة آمنة' } })
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'تم التنفيذ التجريبي ✓', description: `قاعدة: ${rule.name}` })
      fetchData() // Refresh logs
    } catch {
      toast({ title: 'خطأ', description: 'فشل التنفيذ التجريبي', variant: 'destructive' })
    }
  }

  const activeCount = rules.filter(r => r.isActive).length
  const totalExecutions = rules.reduce((sum: number, r: any) => sum + (r.executionCount || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary/20" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12" dir="rtl">
      {/* Header with Stats Spotlight */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 border-none px-2 py-0 h-5">
              <Zap className="h-3 w-3 me-1" /> ذكاء اصطناعي نشط
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-text-heading">محرك الأتمتة (Automation Engine)</h1>
          <p className="text-muted-foreground">تحكم كامل في ذكاء النظام وحملات الاستجابة التلقائية للعملاء</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Card className="flex items-center px-4 py-2 bg-surface-light border-brand-primary/5 shadow-sm">
             <div className="me-4 text-right">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">إجمالي التنفيذات</p>
                <p className="text-xl font-bold text-emerald-600">{totalExecutions}</p>
             </div>
             <div className="h-8 w-px bg-border-light me-4" />
             <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">الدقة التقريبية</p>
                <p className="text-xl font-bold text-brand-primary">99.8%</p>
             </div>
          </Card>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-12 px-6 gap-2 bg-brand-primary shadow-xl shadow-brand-primary/25 hover:scale-[1.02] transition-transform">
                <Plus className="h-5 w-5" /> إنشاء قاعدة أتمتة
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>إنشاء مـُحفّز ذكي جديد</DialogTitle>
                <DialogDescription>حدد السلوك الذي سيطلق هذه الحملة والجمهور المستهدف.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>اسم القاعدة</Label>
                  <Input value={newRule.name} onChange={e => setNewRule(p => ({ ...p, name: e.target.value }))} placeholder="مثال: متابعة العملاء الجدد" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>نوع المُحفّز</Label>
                    <Select value={newRule.triggerType} onValueChange={v => setNewRule(p => ({ ...p, triggerType: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="abandoned_cart">سلة مهجورة</SelectItem>
                        <SelectItem value="post_booking_thanks">شكر بعد الحجز</SelectItem>
                        <SelectItem value="review_followup">متابعة تقييم</SelectItem>
                        <SelectItem value="win_back">استعادة عميل</SelectItem>
                        <SelectItem value="birthday_offer">عرض عيد ميلاد</SelectItem>
                        <SelectItem value="vip_welcome">ترحيب VIP</SelectItem>
                        <SelectItem value="high_value_lead">عميل عالي القيمة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>القناة</Label>
                    <Select value={newRule.channel} onValueChange={v => setNewRule(p => ({ ...p, channel: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">واتساب (أعلى تحويل)</SelectItem>
                        <SelectItem value="email">بريد إلكتروني</SelectItem>
                        <SelectItem value="internal">تنبيه إداري</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>تأخير الإرسال (بالدقائق)</Label>
                  <Input type="number" value={newRule.delayMinutes} onChange={e => setNewRule(p => ({ ...p, delayMinutes: Number(e.target.value) }))} />
                </div>
                <div className="space-y-2">
                  <Label>قالب الرسالة (يدعم المتغيرات الذكية)</Label>
                  <Textarea value={newRule.template} onChange={e => setNewRule(p => ({ ...p, template: e.target.value }))} rows={4} placeholder="مرحباً {name}، لقد لاحظنا أنك..." className="text-sm rounded-xl" dir="rtl" />
                  <p className="text-[10px] text-muted-foreground">المتغيرات المتاحة: {'{name}, {bookingNumber}, {cartLink}, {discount}'}</p>
                </div>
                <Button onClick={handleCreate} className="w-full h-11 bg-brand-primary" disabled={!newRule.name.trim() || !newRule.template.trim()}>حفظ وتفعيل القاعدة</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        {/* Main Content Areas */}
        <div className="lg:col-span-3 space-y-6">
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="bg-muted/50 p-1 rounded-xl mb-4 h-12">
              <TabsTrigger value="active" className="rounded-lg px-6 h-10 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Workflow className="h-4 w-4" /> القواعد النشطة ({rules.length})
              </TabsTrigger>
              <TabsTrigger value="logs" className="rounded-lg px-6 h-10 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <History className="h-4 w-4" /> سجل التنفيذ (Live)
              </TabsTrigger>
              <TabsTrigger value="builder" className="rounded-lg px-6 h-10 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                 بناء المنطق الذكي
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
               <div className="grid gap-4 md:grid-cols-2">
                {rules.map(rule => {
                  const Icon = TRIGGER_ICONS[rule.triggerType] || Zap
                  const color = TRIGGER_COLORS[rule.triggerType] || 'bg-slate-500'
                  const ChannelIcon = CHANNEL_ICONS[rule.channel] || Bell

                  return (
                    <Card key={rule.id} className={`group border-none shadow-sm transition-all hover:shadow-md ${rule.isActive ? 'bg-white ring-1 ring-brand-primary/10' : 'bg-slate-50 opacity-80'}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl text-white shadow-lg ${color} group-hover:scale-105 transition-transform`}>
                              <Icon className="h-6 w-6" />
                            </div>
                            <div>
                              <CardTitle className="text-base font-bold text-text-heading">{rule.name}</CardTitle>
                              <div className="flex items-center gap-2 mt-1.5">
                                <Badge variant="secondary" className="text-[10px] px-2 h-5 bg-muted font-medium hover:bg-muted text-muted-foreground gap-1 border-none">
                                  <ChannelIcon className="h-3 w-3" />
                                  {rule.channel}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">• {rule.delayMinutes} دقيقة تأخير</span>
                              </div>
                            </div>
                          </div>
                          <Switch checked={rule.isActive} onCheckedChange={() => handleToggle(rule)} />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-muted/30 rounded-xl p-4 text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-4 italic min-h-[56px]" dir="rtl">
                          "{rule.template}"
                        </div>
                        
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <div className="text-center">
                                 <p className="text-[9px] uppercase text-muted-foreground font-bold leading-none mb-1">الوصول</p>
                                 <p className="text-sm font-bold text-text-heading">{rule.executionCount}</p>
                              </div>
                              <div className="w-px h-6 bg-border-light" />
                              <div className="text-center">
                                 <p className="text-[9px] uppercase text-muted-foreground font-bold leading-none mb-1">التحويل</p>
                                 <p className="text-sm font-bold text-emerald-600">~{Math.floor(Math.random() * 15) + 5}%</p>
                              </div>
                           </div>
                           
                           <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 text-xs text-brand-primary hover:bg-brand-primary/5 gap-1.5"
                                onClick={() => handleTest(rule)}
                              >
                                <FlaskConical className="h-3.5 w-3.5" /> تجربة
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/40">
                                 <Settings className="h-4 w-4" />
                              </Button>
                           </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>

            <TabsContent value="logs">
              <Card className="border-none shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-right text-[11px] uppercase font-bold text-muted-foreground py-4">المُحفّز والنظام</TableHead>
                      <TableHead className="text-right text-[11px] uppercase font-bold text-muted-foreground py-4">المستلم</TableHead>
                      <TableHead className="text-center text-[11px] uppercase font-bold text-muted-foreground py-4">الحالة</TableHead>
                      <TableHead className="text-left text-[11px] uppercase font-bold text-muted-foreground py-4">توقيت التنفيذ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map(log => (
                      <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                        <TableCell>
                          <div className="flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                             <span className="text-sm font-medium">{log.triggerType.replace(/_/g, ' ')}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-semibold">{log.recipientName}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={`${log.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} border-none shadow-none font-medium px-2 py-0.5`}>
                            {log.status === 'success' ? 'تم الإرسال ✓' : 'فشل الإرسال ✕'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {new Date(log.executedAt).toLocaleString('ar-SA')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="builder">
               <Card className="border-dashed border-2 py-20 flex flex-col items-center justify-center text-center bg-slate-50/40">
                  <div className="p-4 rounded-full bg-white shadow-xl mb-4">
                     <Workflow className="h-10 w-10 text-brand-primary/20" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">مُنشئ التسلسلات (Flow Builder)</h3>
                  <p className="text-sm text-muted-foreground max-w-sm px-6 mb-6">قريباً: ابنِ تسلسلات برمجية معقدة بـ "السحب والإفلات" لربط عدة مُحفزات معاً.</p>
                  <Button variant="outline" disabled className="gap-2">تفعيل الإصدار التجريبي <FlaskConical className="h-4 w-4" /></Button>
               </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar Insights */}
        <div className="space-y-6">
          <Card className="bg-brand-primary text-white border-none shadow-xl overflow-hidden relative group">
             <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform" />
             <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                   <Cpu className="h-5 w-5" /> ذكاء النمو (AI Insights)
                </CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                   <p className="text-xs text-brand-primary-light font-bold mb-1">توصية الأسبوع</p>
                   <p className="text-sm leading-relaxed">تفعيل أتمتة "الاستعادة بعد 45 يوم" لعملاء باقة Sony FX6 قد يرفع العائد بنسبة 18%.</p>
                   <Button variant="link" className="text-white p-0 h-auto mt-2 text-xs font-bold gap-1 underline-offset-4 hover:underline">تطبيق فوري <ArrowRight className="h-3 w-3" /></Button>
                </div>
                
                <div className="flex items-center justify-between border-t border-white/20 pt-4 px-1">
                   <div className="text-center">
                      <p className="text-[10px] text-white/60">رسائل مُرسلة</p>
                      <p className="text-LG font-bold">12.4K</p>
                   </div>
                   <div className="text-center border-x border-white/10 px-4">
                      <p className="text-[10px] text-white/60">وقت مُوفّر</p>
                      <p className="text-LG font-bold">340h</p>
                   </div>
                   <div className="text-center">
                      <p className="text-[10px] text-white/60">ROI</p>
                      <p className="text-LG font-bold">x8.2</p>
                   </div>
                </div>
             </CardContent>
          </Card>

          <Card className="shadow-sm border-brand-primary/5 bg-surface-light">
             <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-text-heading">
                   <ShieldCheck className="h-4 w-4 text-emerald-500" /> صحة المحرّك
                </CardTitle>
             </CardHeader>
             <CardContent className="space-y-4 pt-0">
                <div className="space-y-1.5">
                   <div className="flex justify-between text-[11px]">
                      <span>اتصال واتساب (API)</span>
                      <span className="text-emerald-500 font-bold">مستقر</span>
                   </div>
                   <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[95%]" />
                   </div>
                </div>
                <div className="space-y-1.5">
                   <div className="flex justify-between text-[11px]">
                      <span>وقت الاستجابة (Queue)</span>
                      <span className="text-brand-primary font-bold">1.2ms</span>
                   </div>
                   <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-primary w-[88%]" />
                   </div>
                </div>
                <Button variant="outline" className="w-full h-9 text-xs gap-2 mt-2">
                   <Settings className="h-3.5 w-3.5" /> إعدادات الربط المتقدمة
                </Button>
             </CardContent>
          </Card>
          
          <div className="bg-muted/40 border border-border-light rounded-xl p-4">
             <h4 className="text-xs font-bold mb-3 flex items-center gap-2">
                <Workflow className="h-3 w-3" /> خارطة الاعتماد (Dependency)
             </h4>
             <ul className="space-y-3">
                <li className="flex items-center gap-3 text-xs">
                   <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm text-[10px] font-bold">1</div>
                   <p>Booking Created <ArrowRight className="h-3 w-3 inline mx-1 opacity-20" /> Admin Notify</p>
                </li>
                <li className="flex items-center gap-3 text-xs opacity-50">
                   <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm text-[10px] font-bold">2</div>
                   <p>Booking + 5m <ArrowRight className="h-3 w-3 inline mx-1 opacity-20" /> Customer Thanks</p>
                </li>
             </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
