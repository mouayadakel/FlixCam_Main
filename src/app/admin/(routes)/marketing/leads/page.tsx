'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  MessageSquare, 
  Phone, 
  Mail, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MoreHorizontal,
  Sparkles,
  Loader2,
  ExternalLink,
  Search,
  Download,
  Filter
} from 'lucide-react'
import { format } from 'date-fns'
import { arSA } from 'date-fns/locale'
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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'

export default function LeadsHubPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [draftingId, setDraftingId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  const fetchLeads = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.append('status', filterStatus)
      if (filterType !== 'all') params.append('type', filterType)
      
      const res = await fetch(`/api/admin/marketing/leads?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch')
      setLeads(await res.json())
    } catch (err) {
      toast({ title: 'خطأ', description: 'لم يتم تحميل العملاء', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [filterStatus, filterType])

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/admin/marketing/leads', {
        method: 'PATCH',
        body: JSON.stringify({ id, status })
      })
      if (res.ok) {
        toast({ title: 'تم التحديث', description: `تم تحديث الحالة إلى ${status}` })
        fetchLeads()
      }
    } catch (err) {
      toast({ title: 'فشل التحديث', variant: 'destructive' })
    }
  }

  const handleAiDraft = async (id: string) => {
    try {
      setDraftingId(id)
      const res = await fetch('/api/admin/marketing/ai/reply-draft', {
        method: 'POST',
        body: JSON.stringify({ eventId: id })
      })
      const data = await res.json()
      if (data.draft) {
        // Open WhatsApp with the draft
        const lead = leads.find(l => l.id === id)
        const phone = lead?.metadata?.phone || '+966'
        const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(data.draft)}`
        window.open(url, '_blank')
        toast({ title: 'تم إنشاء المسودة', description: 'تم فتح واتساب بالرسالة المقترحة' })
      }
    } catch (err) {
      toast({ title: 'فشل الذكاء الاصطناعي', description: 'لم نتمكن من إنشاء المسودة', variant: 'destructive' })
    } finally {
      setDraftingId(null)
    }
  }

  const getIntentBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-emerald-500 text-white border-0 shadow-sm animate-pulse-subtle">نية عالية ({score}%)</Badge>
    if (score >= 50) return <Badge className="bg-amber-500 text-white border-0">متوسط ({score}%)</Badge>
    return <Badge variant="secondary" className="opacity-50">منخفض ({score}%)</Badge>
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'new': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">جديد</Badge>
      case 'contacted': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">تم التواصل</Badge>
      case 'converted': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">محول (عميل)</Badge>
      case 'lost': return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">مفقود</Badge>
      default: return <Badge variant="secondary">غير معروف</Badge>
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-text-heading">مركز العملاء المحتملين (Leads Hub)</h1>
        <p className="text-sm text-muted-foreground">تحويل المهتمين إلى مبيعات عبر المتابعة الذكية</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="bg-white">
            <Filter className="h-4 w-4 ml-2 opacity-50" />
            <SelectValue placeholder="نوع الحدث" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأحداث</SelectItem>
            <SelectItem value="Lead">Lead (طلب استفسار)</SelectItem>
            <SelectItem value="AddToCart">إضافة للسلة</SelectItem>
            <SelectItem value="Purchase">شراء مؤكد</SelectItem>
            <SelectItem value="Contact">تواصل مباشر</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="bg-white">
            <CheckCircle2 className="h-4 w-4 ml-2 opacity-50" />
            <SelectValue placeholder="حلالة العميل" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="New">جديد</SelectItem>
            <SelectItem value="Contacted">تم التواصل</SelectItem>
            <SelectItem value="Converted">محول</SelectItem>
            <SelectItem value="Lost">مفقود</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="shadow-sm border-brand-primary/10 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-right">العميل / الحدث</TableHead>
              <TableHead className="text-center">درجة النية</TableHead>
              <TableHead className="text-right">الاهتمامات</TableHead>
              <TableHead className="text-center">التاريخ</TableHead>
              <TableHead className="text-center">القيمة</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
              <TableHead className="text-left">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-brand-primary opacity-20" />
                </TableCell>
              </TableRow>
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 italic text-muted-foreground">
                  لا توجد سجلات مطابقة للمعايير.
                </TableCell>
              </TableRow>
            ) : leads.map((lead) => (
              <TableRow key={lead.id} className="group hover:bg-slate-50/50 transition-colors">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">
                      {lead.metadata?.name || lead.metadata?.email || 'زائر غير معروف'}
                    </span>
                    <Badge variant="secondary" className="w-fit text-[10px] h-4 mt-1">
                      {lead.eventType}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                   {getIntentBadge(lead.score || 0)}
                </TableCell>
                <TableCell>
                  <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {lead.metadata?.utm_source && (
                      <span className="bg-slate-100 px-1 rounded ml-1">
                        {lead.metadata.utm_source}
                      </span>
                    )}
                    {lead.entityType && (
                      <span className="text-brand-primary">
                        {lead.entityType} #{lead.entityId?.slice(-4)}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center text-xs text-muted-foreground">
                  {format(new Date(lead.createdAt), 'yyyy/MM/dd HH:mm', { locale: arSA })}
                </TableCell>
                <TableCell className="text-center font-medium">
                  {lead.value ? `${lead.value} ر.س` : '-'}
                </TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(lead.metadata?.status || 'New')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 gap-1.5 text-xs text-brand-primary border-brand-primary/20 hover:bg-brand-primary/5 shadow-none"
                      onClick={() => handleAiDraft(lead.id)}
                      disabled={draftingId === lead.id}
                    >
                      {draftingId === lead.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      رد ذكي
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>إجراءات المتابعة</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleUpdateStatus(lead.id, 'Contacted')}>
                          <MessageSquare className="ml-2 h-4 w-4 text-amber-500" />
                          تم التواصل
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(lead.id, 'Converted')}>
                          <CheckCircle2 className="ml-2 h-4 w-4 text-emerald-500" />
                          تعميد كعميل
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(lead.id, 'Lost')}>
                          <AlertCircle className="ml-2 h-4 w-4 text-rose-500" />
                          مفقود / غير مهتم
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                           <a href={`https://wa.me/${(lead.metadata?.phone || '').replace(/\D/g, '')}`} target="_blank">
                             <Phone className="ml-2 h-4 w-4 text-brand-primary" />
                             تواصل واتساب
                           </a>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
