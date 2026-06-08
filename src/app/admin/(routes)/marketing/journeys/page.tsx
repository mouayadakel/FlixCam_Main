'use client'

import { useState, useEffect } from 'react'
import { 
  History, 
  User, 
  Clock, 
  ChevronLeft,
  Search,
  Loader2,
  Target,
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
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from '@/components/ui/sheet'
import { toast } from '@/hooks/use-toast'

export default function JourneysPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [timeline, setTimeline] = useState<any[]>([])
  const [loadingTimeline, setLoadingTimeline] = useState(false)

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/marketing/journeys')
      if (!res.ok) throw new Error('Failed')
      setSessions(await res.json())
    } catch (err) {
      toast({ title: 'Error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const fetchTimeline = async (sessionId: string) => {
    try {
      setLoadingTimeline(true)
      const res = await fetch(`/api/admin/marketing/journeys?sessionId=${sessionId}`)
      const data = await res.json()
      setTimeline(data.events || [])
    } catch (err) {
      toast({ title: 'Failed to load timeline', variant: 'destructive' })
    } finally {
      setLoadingTimeline(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const handleSelectSession = (session: any) => {
    setSelectedSession(session)
    fetchTimeline(session.sessionId)
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-text-heading">خريطة رحلة العميل (Customer Journeys)</h1>
        <p className="text-sm text-muted-foreground">تتبع المسار الكامل للزوار ومصادر وصولهم</p>
      </div>

      <Card className="border-brand-primary/10 shadow-sm overflow-hidden border-t-4 border-t-brand-primary">
        <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="text-right">الجلسة / العميل</TableHead>
            <TableHead className="text-right">المصدر</TableHead>
            <TableHead className="text-center">الأحداث</TableHead>
            <TableHead className="text-center">آخر نشاط</TableHead>
            <TableHead className="text-center">الحالة</TableHead>
            <TableHead className="text-left"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
             <TableRow>
               <TableCell colSpan={6} className="text-center py-10">
                 <Loader2 className="h-8 w-8 animate-spin mx-auto text-brand-primary/20" />
               </TableCell>
             </TableRow>
          ) : sessions.length === 0 ? (
             <TableRow>
               <TableCell colSpan={6} className="text-center py-10 italic text-muted-foreground">
                 لا توجد بيانات جلسات حالياً.
               </TableCell>
             </TableRow>
          ) : sessions.map((s) => (
            <TableRow key={s.sessionId} className="group hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => handleSelectSession(s)}>
              <TableCell>
                <div className="flex items-center gap-3">
                   <div className="p-2 rounded-full bg-brand-primary/10 text-brand-primary">
                      <User className="h-4 w-4" />
                   </div>
                   <div className="flex flex-col">
                      <span className="font-bold text-sm">{s.name || 'زائر مجهول'}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{s.sessionId.slice(-8)}</span>
                   </div>
                </div>
              </TableCell>
              <TableCell>
                 <Badge variant="outline" className="bg-slate-100 text-slate-700 h-5 text-[10px] shadow-none">
                    {s.source || 'Direct'}
                 </Badge>
              </TableCell>
              <TableCell className="text-center font-medium pr-6">
                 {s.eventCount}
              </TableCell>
              <TableCell className="text-center text-xs text-muted-foreground">
                 {format(new Date(s.last), 'HH:mm (yyyy/MM/dd)', { locale: arSA })}
              </TableCell>
              <TableCell className="text-center">
                 {s.hasConversion ? (
                   <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shadow-none">تم التحويل</Badge>
                 ) : (
                   <Badge variant="secondary" className="bg-slate-100 text-slate-500 shadow-none">زائر</Badge>
                 )}
              </TableCell>
              <TableCell>
                 <ChevronLeft className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </Table>
      </Card>

      <Sheet open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <SheetContent side="left" className="w-[400px] sm:w-[500px] overflow-y-auto" dir="rtl">
          <SheetHeader className="text-right space-y-4 pb-6 border-b">
            <SheetTitle className="text-2xl font-bold flex items-center gap-2">
               <History className="h-6 w-6 text-brand-primary" />
               تفاصيل رحلة العميل
            </SheetTitle>
            <SheetDescription className="flex flex-col gap-2">
               {selectedSession && (
                 <>
                   <div className="bg-slate-50 p-3 rounded-lg border flex items-center gap-4">
                      <div className="flex flex-col flex-grow text-right">
                         <span className="text-xs text-muted-foreground">معرف الجلسة</span>
                         <span className="font-mono text-sm font-bold">{selectedSession.sessionId}</span>
                      </div>
                      <Badge className="bg-brand-primary shadow-none">{selectedSession.source || 'Direct'}</Badge>
                   </div>
                 </>
               )}
            </SheetDescription>
          </SheetHeader>

          <div className="py-8">
            <h4 className="font-bold text-lg mb-6 pr-4 border-r-4 border-brand-primary">الجدول الزمني للأحداث</h4>
            
            {loadingTimeline ? (
               <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-primary/20" />
               </div>
            ) : (
              <div className="space-y-8 relative pr-4">
                <div className="absolute top-0 right-0 w-1 bg-slate-100 h-full -mr-0.5 rounded-full" />
                {timeline.map((event, idx) => (
                  <div key={event.id} className="relative group">
                    <div className={cn(
                      "absolute -right-[7px] top-1 h-3 w-3 rounded-full border-2 border-white ring-2 ring-slate-100 z-10",
                      ["Purchase", "Lead", "Contact"].includes(event.eventType) ? "bg-emerald-500 ring-emerald-100" : "bg-brand-primary ring-brand-primary/10"
                    )} />
                    <div className="pr-6">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-brand-primary">{event.eventType}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                           <Clock className="h-3 w-3" />
                           {format(new Date(event.createdAt), 'HH:mm:ss')}
                        </span>
                      </div>
                      <div className="bg-slate-50/50 p-3 rounded-lg border group-hover:bg-white group-hover:shadow-sm transition-all border-dashed">
                        {event.pageUrl && (
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1 truncate">
                             <Search className="h-3 w-3" />
                             {event.pageUrl}
                          </div>
                        )}
                        {event.entityType && (
                          <div className="text-xs font-semibold flex items-center gap-2">
                             <Target className="h-3 w-3 text-brand-primary opacity-50" />
                             {event.entityType}: {event.entityId}
                          </div>
                        )}
                        {event.value && (
                           <div className="mt-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded w-fit">
                              القيمة: {event.value} ر.س
                           </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}
