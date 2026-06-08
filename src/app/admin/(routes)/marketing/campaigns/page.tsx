'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  ArrowRight,
  Copy,
  Check,
  Megaphone,
  BarChart3,
  Link2,
  ExternalLink,
  Download,
  Plus,
  Mail,
  MessageSquare,
  Send,
  Clock,
  Loader2
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { ar } from 'date-fns/locale'

interface CampaignStat {
  name: string
  views: number
  leads: number
  purchases: number
  revenue: number
  lastActive: string
}

interface Blast {
  id: string
  name: string
  type: string
  status: string
  sentAt: string | null
  totalRecipients: number
  createdAt: string
}

export default function MarketingCampaignsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<CampaignStat[]>([])
  const [blasts, setBlasts] = useState<Blast[]>([])
  const [copied, setCopied] = useState(false)

  // UTM Generator State
  const [baseUrl, setBaseUrl] = useState('')
  const [source, setSource] = useState('')
  const [medium, setMedium] = useState('')
  const [campaignName, setCampaignName] = useState('')
  const [content, setContent] = useState('')

  const generatedUrl = useMemo(() => {
    if (!baseUrl) return ''
    try {
      const url = new URL(baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`)
      if (source) url.searchParams.set('utm_source', source)
      if (medium) url.searchParams.set('utm_medium', medium)
      if (campaignName) url.searchParams.set('utm_campaign', campaignName)
      if (content) url.searchParams.set('utm_content', content)
      return url.toString()
    } catch { return 'URL غير صالح' }
  }, [baseUrl, source, medium, campaignName, content])

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const res = await fetch('/api/admin/marketing/campaigns')
        if (!active) return
        if (res.ok) {
          const json = await res.json()
          setCampaigns(json.campaigns || [])
          setBlasts(json.blasts || [])
        }
      } catch (err) { console.error(err) }
      finally { if (active) setLoading(false) }
    })()
    return () => { active = false }
  }, [])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedUrl)
    setCopied(true)
    toast({ title: 'تم النسخ ✓', description: 'تم نسخ الرابط المرمز إلى الحافظة.' })
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadCsv = () => {
    if (!campaigns) return
    const headers = ['Campaign Name', 'Views', 'Leads', 'Purchases', 'Revenue (SAR)', 'Last Active']
    const rows = campaigns.map(c => [
      c.name,
      c.views,
      c.leads,
      c.purchases,
      c.revenue,
      new Date(c.lastActive).toISOString()
    ])
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `flixcam_campaigns_${new Date().toISOString().slice(0,10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-text-heading">مدير الحملات (Campaigns Manager)</h1>
          <p className="text-xs text-muted-foreground">إدارة القنوات الإعلانية UTM وحملات التواصل المباشر</p>
        </div>
        <Button className="gap-2 bg-brand-primary">
          <Plus className="h-4 w-4" /> حملة جديدة
        </Button>
      </div>

      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="performance">أداء الروابط (UTM)</TabsTrigger>
          <TabsTrigger value="blasts">الحملات المباشرة (Blasts)</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6 pt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* UTM Generator */}
            <Card className="shadow-sm border-brand-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-brand-primary" />
                  منشئ روابط UTM
                </CardTitle>
                <CardDescription>ترميز روابط الموقع لتتبع مصدر كل زائر والاشتراكات الناتجة.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="base-url">رابط الصفحة المقصودة (Base URL)</Label>
                  <Input id="base-url" placeholder="https://flixcam.rent/..." value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} dir="ltr" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="utm-source">المصدر (Source)</Label>
                    <Input id="utm-source" placeholder="google, meta..." value={source} onChange={(e) => setSource(e.target.value)} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="utm-medium">الوسيلة (Medium)</Label>
                    <Input id="utm-medium" placeholder="cpc, social..." value={medium} onChange={(e) => setMedium(e.target.value)} dir="ltr" />
                  </div>
                </div>
                <div className="p-4 bg-muted/40 rounded-lg border border-dashed">
                  <Label className="text-xs text-muted-foreground mb-2 block">الرابط المولد:</Label>
                  <div className="flex gap-2">
                    <Input value={generatedUrl} readOnly className="bg-white text-xs" dir="ltr" />
                    <Button size="icon" variant="outline" onClick={copyToClipboard} disabled={!generatedUrl || generatedUrl.includes('صالح')}>
                      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Campaign Performance Table */}
            <Card className="shadow-sm flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-amber-500" /> أداء الروابط
                </CardTitle>
                <Button variant="outline" size="sm" onClick={downloadCsv} disabled={!campaigns?.length}>
                  <Download className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <div className="rounded-md border-t h-[350px] overflow-auto">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="text-right">الحملة</TableHead>
                        <TableHead className="text-center">زيارات</TableHead>
                        <TableHead className="text-right">العائد</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={3} className="h-32 text-center text-xs">جاري التحميل...</TableCell></TableRow>
                      ) : campaigns.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="h-32 text-center text-xs text-muted-foreground">لا توجد بيانات.</TableCell></TableRow>
                      ) : campaigns.map((campaign) => (
                        <TableRow key={campaign.name}>
                          <TableCell className="py-3">
                            <div className="font-bold text-sm">{campaign.name}</div>
                            <div className="text-[10px] text-muted-foreground mt-1">نشاط: {formatDistanceToNow(new Date(campaign.lastActive), { addSuffix: true, locale: ar })}</div>
                          </TableCell>
                          <TableCell className="text-center text-sm">{campaign.views.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="font-bold text-emerald-600">{campaign.revenue.toLocaleString()} ر.س</div>
                            <div className="text-[10px] text-muted-foreground">{campaign.purchases} حجز مؤكد</div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="blasts" className="space-y-6 pt-4">
          <Card className="shadow-sm border-brand-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-brand-primary" /> سجل حملات التواصل المباشر
              </CardTitle>
              <CardDescription>تتبع حملات الرسائل النصية والبريد الإلكتروني والواتساب.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               <Table>
                 <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-right">اسم الحملة</TableHead>
                      <TableHead className="text-center">النوع</TableHead>
                      <TableHead className="text-center">المستلمين</TableHead>
                      <TableHead className="text-center">الحالة</TableHead>
                      <TableHead className="text-left">التاريخ</TableHead>
                    </TableRow>
                 </TableHeader>
                 <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={5} className="h-48 text-center text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin mx-auto opacity-20" /></TableCell></TableRow>
                    ) : blasts.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                        <Mail className="h-8 w-8 mx-auto opacity-20 mb-2" />
                        لا توجد حملات مرسلة حالياً.
                      </TableCell></TableRow>
                    ) : blasts.map((blast) => (
                      <TableRow key={blast.id}>
                        <TableCell className="font-bold py-4">{blast.name}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2 text-xs">
                             {blast.type === 'email' ? <Mail className="h-3 w-3" /> : blast.type === 'whatsapp' ? <MessageSquare className="h-3 w-3" /> : <Send className="h-3 w-3" />}
                             <span className="capitalize">{blast.type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold">{blast.totalRecipients}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={blast.status === 'completed' ? 'default' : 'secondary'} className={blast.status === 'completed' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                            {blast.status === 'completed' ? 'مكتمل' : blast.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-left text-xs text-muted-foreground">
                           {formatDistanceToNow(new Date(blast.createdAt), { addSuffix: true, locale: ar })}
                        </TableCell>
                      </TableRow>
                    ))}
                 </TableBody>
               </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-surface-light border-dashed shadow-none">
          <CardContent className="pt-6 flex flex-col items-center text-center">
             <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center mb-3">
                <ExternalLink className="h-5 w-5 text-brand-primary" />
             </div>
             <p className="text-sm font-bold mb-1">دليل UTM</p>
             <p className="text-xs text-muted-foreground">ترميز الروابط يساعدك في معرفة أي منصة إعلانية تجلب مبيعات أكثر حقيقية.</p>
          </CardContent>
        </Card>
        <Card className="bg-surface-light border-dashed shadow-none">
          <CardContent className="pt-6 flex flex-col items-center text-center">
             <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                <BarChart3 className="h-5 w-5 text-amber-600" />
             </div>
             <p className="text-sm font-bold mb-1">تتبع التحويل</p>
             <p className="text-xs text-muted-foreground">نظام فليكس كام يحسب التحويلات بناءً على آخر حملة ضغط عليها العميل.</p>
          </CardContent>
        </Card>
        <Card className="bg-surface-light border-dashed shadow-none">
          <CardContent className="pt-6 flex flex-col items-center text-center">
             <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <Clock className="h-5 w-5 text-emerald-600" />
             </div>
             <p className="text-sm font-bold mb-1">تزامن البيانات</p>
             <p className="text-xs text-muted-foreground">يتم تحديث إحصائيات الحملات المباشرة والأتمتة في غضون ثوانٍ من التنفيذ.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
