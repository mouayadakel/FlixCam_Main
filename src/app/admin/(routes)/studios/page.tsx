/**
 * @file page.tsx
 * @description Premium Soundstage Room Scheduler – hourly lane grids, live room telemetry, and backdrop/grip gear checklists
 * @module app/admin/(routes)/studios
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Eye, 
  Plus, 
  RefreshCw, 
  Video, 
  Clock, 
  Sparkles, 
  Check, 
  MapPin, 
  Lightbulb, 
  TrendingUp, 
  Users 
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

interface StudioRow {
  id: string
  name: string
  slug: string
  capacity: number
  hourlyRate: number
  areaSqm: number
  studioType: string
  status: 'VACANT' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE'
  activeBookingName?: string
  timeLeftMinutes?: number
}

export default function StudiosPage() {
  const { toast } = useToast()
  const [studios, setStudios] = useState<StudioRow[]>([])
  const [loading, setLoading] = useState(true)

  // Hourly grid slots (09:00 AM - 09:00 PM)
  const HOURS = ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00', '21:00']

  // Track props add-ons checklist
  const [propsManifest, setPropsManifest] = useState({
    ledWallActivated: true,
    gripKitAllocated: false,
    greenScreenSetup: false,
    profotoLighting: true
  })

  // Selected Studio details overlay
  const [selectedStudio, setSelectedStudio] = useState<StudioRow | null>(null)

  const [error, setError] = useState<string | null>(null)

  const loadStudios = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/studios?pageSize=50', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const rows = Array.isArray(json.data) ? json.data : []
      setStudios(
        rows.map((s: any) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          capacity: s.capacity ?? 0,
          hourlyRate: s.hourlyRate ?? 0,
          areaSqm: s.areaSqm ?? 0,
          studioType: s.studioType ?? s.description ?? '—',
          status: s.isActive ? 'VACANT' : 'MAINTENANCE',
        }))
      )
    } catch (err) {
      console.error('Failed to load studios:', err)
      setError('تعذّر تحميل الاستوديوهات.')
      setStudios([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStudios()
  }, [])

  const getStatusBadge = (status: StudioRow['status']) => {
    switch (status) {
      case 'OCCUPIED':
        return <Badge className="bg-red-500/20 text-red-700 border-red-300 animate-pulse">شاغل (Occupied)</Badge>
      case 'CLEANING':
        return <Badge className="bg-amber-500/20 text-amber-700 border-amber-300">تنظيف وتعقيم (Cleaning)</Badge>
      case 'MAINTENANCE':
        return <Badge className="bg-purple-500/20 text-purple-700 border-purple-300">صيانة الغرفة</Badge>
      case 'VACANT':
      default:
        return <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-300">شاغر وجاهز (Vacant)</Badge>
    }
  }

  return (
    <div className="space-y-6 select-none" dir="rtl">
      {/* Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-slate-900/5 dark:bg-slate-900/40 p-5 rounded-xl border">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Video className="h-8 w-8 text-primary animate-pulse" />
            مركز إدارة وحجز الاستوديوهات ومسارح الصوت
          </h1>
          <p className="text-sm text-slate-500 mt-1">تنسيق فترات الإيجار بالساعة، تتبع الإشغال، وإكسسوارات الإضاءة.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={loadStudios} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button asChild>
            <Link href="/admin/studios/new">
              <Plus className="me-2 h-4 w-4" />
              إضافة استوديو جديد
            </Link>
          </Button>
        </div>
      </div>

      {/* Hourly Lane visual Timeline scheduler */}
      <Card className="border shadow-lg">
        <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b pb-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            مخطط الإشغال الزمني لاستوديوهات فليكس كام اليومي
          </CardTitle>
          <CardDescription>فترات الحجوزات النشطة مقسمة بساعات العمل الرسمية</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 overflow-x-auto">
          {loading ? (
            <div className="space-y-4 py-8">
              {[1, 2].map(i => <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />)}
            </div>
          ) : error ? (
            <div className="py-12 text-center text-slate-500 border border-dashed border-red-200 rounded-lg">
              <p className="font-bold">{error}</p>
              <Button variant="outline" size="sm" onClick={loadStudios} className="mt-4 font-bold">
                إعادة المحاولة
              </Button>
            </div>
          ) : studios.length === 0 ? (
            <div className="py-12 text-center text-slate-500 border border-dashed rounded-lg">
              <p className="font-bold">لا توجد استوديوهات مسجلة</p>
            </div>
          ) : (
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[220px]">اسم مسرح الصوت / الجناح</TableHead>
                  {HOURS.map(h => <TableHead key={h} className="text-center font-bold">{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {studios.map((st) => (
                  <TableRow key={st.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-black text-slate-900 dark:text-slate-100">
                      <div>
                        <div>{st.name.split(' - ')[0]}</div>
                        <span className="text-[10px] font-bold text-slate-400 block mt-0.5">{st.studioType}</span>
                      </div>
                    </TableCell>
                    {/* Hourly Blocks mapping */}
                    <TableCell colSpan={2} className="p-1">
                      {st.status === 'OCCUPIED' ? (
                        <div className="bg-red-500/10 border-2 border-red-300 rounded-lg p-2 text-center text-xs font-bold text-red-700 animate-pulse">
                          {st.activeBookingName} ({st.timeLeftMinutes} دقيقة متبقية)
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-dashed rounded-lg p-2 text-center text-xs text-slate-400">
                          فترة شاغرة
                        </div>
                      )}
                    </TableCell>
                    <TableCell colSpan={2} className="p-1">
                      <div className="bg-slate-50 border border-dashed rounded-lg p-2 text-center text-xs text-slate-400">
                        فترة شاغرة
                      </div>
                    </TableCell>
                    <TableCell colSpan={3} className="p-1">
                      {st.status === 'CLEANING' ? (
                        <div className="bg-amber-500/10 border border-amber-300 rounded-lg p-2 text-center text-xs font-bold text-amber-700">
                          جاري التعقيم والتجهيز (30 دقيقة)
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-dashed rounded-lg p-2 text-center text-xs text-slate-400">
                          فترة شاغرة
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Grid list with diagnostic details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Studio spaces list grid */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border shadow-md">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-base font-bold">بطاقات تفاصيل الاستوديوهات والمساحات</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {studios.map((st) => (
                <div key={st.id} className="p-4 border rounded-xl bg-white dark:bg-slate-950 flex flex-col sm:flex-row justify-between gap-4 items-center">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-base">{st.name}</span>
                      {getStatusBadge(st.status)}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-xs font-semibold text-slate-500 pt-1">
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span>السعة: {st.capacity} شخص</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span>المساحة: {st.areaSqm} متر مربع</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
                        <span>التسعير: {st.hourlyRate} ر.س / ساعة</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setSelectedStudio(st)
                        toast({
                          title: 'تم عرض تفاصيل الاستوديو! 🎨',
                          description: 'يمكنك الآن ضبط الإكسسوارات والملحقات لهذا الجناح.'
                        })
                      }}
                      className="font-bold gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      التحكم والغرفة
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right side: Suite Add-ons Props Manifest */}
        <div className="space-y-6">
          <Card className="border shadow-md">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                ملحقات وإكسسوارات الغرفة (Props Manifest)
              </CardTitle>
              <CardDescription>التحقق من حالة تجهيز الاستوديو النشط</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={propsManifest.ledWallActivated}
                  onChange={(e) => setPropsManifest({ ...propsManifest, ledWallActivated: e.target.checked })}
                  className="h-4 w-4 text-primary rounded"
                />
                <span className="text-sm font-semibold">شاشة LED الخلفية الافتراضية (LED Virtual Wall)</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={propsManifest.gripKitAllocated}
                  onChange={(e) => setPropsManifest({ ...propsManifest, gripKitAllocated: e.target.checked })}
                  className="h-4 w-4 text-primary rounded"
                />
                <span className="text-sm font-semibold">حقيبة الجريب والستاندات (Grip & C-Stands)</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={propsManifest.greenScreenSetup}
                  onChange={(e) => setPropsManifest({ ...propsManifest, greenScreenSetup: e.target.checked })}
                  className="h-4 w-4 text-primary rounded"
                />
                <span className="text-sm font-semibold">تجهيز الكروما الخضراء (Chroma Green setup)</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={propsManifest.profotoLighting}
                  onChange={(e) => setPropsManifest({ ...propsManifest, profotoLighting: e.target.checked })}
                  className="h-4 w-4 text-primary rounded"
                />
                <span className="text-sm font-semibold">أطقم إضاءة بروفوتو ستوديو (Profoto lighting)</span>
              </label>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
