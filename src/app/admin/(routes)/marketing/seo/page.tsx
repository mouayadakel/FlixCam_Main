'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { MarketingSettingsEditor } from '@/components/admin/marketing-settings-editor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, Globe, AlertCircle, CheckCircle2, ArrowRight, Download, Sparkles, Loader2 } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts'

interface GapData {
  id: string
  type: string
  name: string
  slug: string
  missingTitle: boolean
  missingDesc: boolean
}

export default function MarketingSeoPage() {
  const [data, setData] = useState<{ gaps: GapData[]; score: number; totalCount: number; missingCount: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)

    void (async () => {
      try {
        const res = await fetch('/api/admin/marketing/seo/gaps')
        if (!active) return
        if (res.ok) {
          setData(await res.json())
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => { active = false }
  }, [])

  const score = data?.score || 0
  
  // Data for the Donut Gauge Chart
  const gaugeData = [
    { name: 'Score', value: score },
    { name: 'Remaining', value: 100 - score },
  ]
  const gaugeColors = [score > 80 ? '#10b981' : score > 50 ? '#f59e0b' : '#ef4444', '#f3f4f6']

  const handleGenerateSeo = async (gap: GapData) => {
    try {
      setGeneratingId(gap.id)
      const res = await fetch('/api/admin/marketing/seo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: gap.id,
          type: gap.type,
          name: gap.name,
          locale: 'ar'
        })
      })
      
      if (res.ok) {
        // Refresh data to remove handled gap
        const refreshRes = await fetch('/api/admin/marketing/seo/gaps')
        if (refreshRes.ok) {
          setData(await refreshRes.json())
        }
      }
    } catch (err) {
      console.error('Failed to generate SEO:', err)
    } finally {
      setGeneratingId(null)
    }
  }

  const downloadCsv = () => {
    if (!data?.gaps) return
    const headers = ['Type', 'Name', 'Slug', 'Missing Title', 'Missing Description']
    const rows = data.gaps.map(g => [
      g.type,
      g.name,
      g.slug,
      g.missingTitle ? 'Yes' : 'No',
      g.missingDesc ? 'Yes' : 'No'
    ])
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `flixcam_seo_gaps_${new Date().toISOString().slice(0,10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-text-heading">صحة الـ SEO والظهور</h1>
          <p className="text-xs text-muted-foreground">مراقبة صحة محركات البحث والفجوات النصية والصور</p>
        </div>
        <Button 
          className="bg-brand-primary shadow-lg shadow-brand-primary/20 gap-2"
          onClick={async () => {
            const res = await fetch('/api/admin/marketing/seo/bulk-fix', {
              method: 'POST',
              body: JSON.stringify({ type: 'Equipment' })
            })
            if (res.ok) {
              const data = await res.json()
              alert(`تم البدء في معالجة ${data.count} منتجات. يرجى التحديث بعد قليل.`)
              window.location.reload()
            }
          }}
        >
          <Sparkles className="h-4 w-4" />
          معالجة الفجوات بالذكاء الاصطناعي (Bulk Fix)
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Visual SEO Score Gauge */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-brand-primary" />
              مؤشر صحة الـ SEO
            </CardTitle>
            <CardDescription>
              مدى اكتمال العلامات الوصفية للمنتجات
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-0">
            {loading ? (
               <div className="h-[200px] w-full flex items-center justify-center text-muted-foreground text-sm">جاري التحميل...</div>
            ) : (
               <div className="h-[200px] w-full relative">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie
                       data={gaugeData}
                       cx="50%"
                       cy="100%"
                       startAngle={180}
                       endAngle={0}
                       innerRadius={60}
                       outerRadius={80}
                       paddingAngle={0}
                       dataKey="value"
                       stroke="none"
                     >
                       {gaugeData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={gaugeColors[index]} />
                       ))}
                       <Label
                          value={`${score}/100`}
                          position="center"
                          dy={-10}
                          className="text-3xl font-bold fill-foreground"
                       />
                     </Pie>
                   </PieChart>
                 </ResponsiveContainer>
               </div>
            )}
            <p className="text-sm text-center text-muted-foreground mt-2 px-4">
              {score >= 90 ? 'ممتاز! منتجاتك محسنة بقوة.' : score >= 60 ? 'جيد، لكن توجد بعض المنتجات تحتاج لوصف.' : 'ضعيف. يرجى ملء العناوين والوصف للمنتجات.'}
            </p>
          </CardContent>
        </Card>

        {/* Content Gap Scanner */}
        <Card className="shadow-sm lg:col-span-2 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                ماسح فجوات المحتوى (Content Gap)
              </CardTitle>
              <CardDescription>
                المنتجات والاستديوهات التي لا تحتوي على عنوان SEO أو وصف مخصص.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={downloadCsv} disabled={!data?.gaps?.length}>
              <Download className="ms-2 h-4 w-4" />
              تصدير CSV
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
             <div className="rounded-md border h-[250px] overflow-auto">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0">
                    <TableRow>
                      <TableHead className="text-right">المنتج / الكيان</TableHead>
                      <TableHead className="text-right">المفقود</TableHead>
                      <TableHead className="text-center w-[100px]">إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                       <TableRow>
                         <TableCell colSpan={3} className="h-24 text-center">جاري الفحص...</TableCell>
                       </TableRow>
                    ) : (data?.gaps || []).length === 0 ? (
                       <TableRow>
                         <TableCell colSpan={3} className="h-24 text-center flex flex-col items-center justify-center text-emerald-600 gap-2">
                            <CheckCircle2 className="h-6 w-6" />
                            لا توجد فجوات! كل المنتجات محسنة.
                         </TableCell>
                       </TableRow>
                    ) : (data?.gaps || []).map((gap) => (
                      <TableRow key={gap.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{gap.name}</div>
                          <div className="text-xs text-muted-foreground">{gap.type}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {gap.missingTitle && <Badge variant="destructive" className="text-[10px]">بدون عنوان</Badge>}
                            {gap.missingDesc && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-600">بدون وصف</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs h-7 gap-1 text-brand-primary border-brand-primary/20 hover:bg-brand-primary/10"
                              onClick={() => handleGenerateSeo(gap)}
                              disabled={generatingId === gap.id}
                            >
                              {generatingId === gap.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Sparkles className="h-3 w-3" />
                              )}
                              AI توليد
                            </Button>
                            <Button variant="ghost" size="sm" asChild className="text-xs h-7">
                               <a href={gap.type === 'Equipment' ? `/admin/inventory` : `/admin/studios`} target="_blank" rel="noreferrer">تعديل</a>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="h-px bg-border-light/60 my-6" />

      {/* Google SERP Preview & Global Settings */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm border-brand-primary/10">
          <CardHeader className="bg-muted/10 pb-4">
            <CardTitle className="flex items-center gap-2 text-base text-brand-primary">
              <Search className="h-5 w-5" />
              الإعدادات العامة (Global Metadata)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <MarketingSettingsEditor title="" categories={['business']} />
            <MarketingSettingsEditor title="" categories={['seo']} />
          </CardContent>
        </Card>

        {/* SERP Simulator */}
        <Card className="shadow-sm bg-surface-light border-dashed">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground flex items-center gap-2">
              <Globe className="h-4 w-4" />
              معاينة محرك بحث جوجل (SERP Preview)
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="bg-white p-4 rounded-lg border shadow-sm max-w-sm" dir="ltr">
               <div className="flex items-center gap-3 mb-1">
                 <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                   <img src="/icon.png" alt="Icon" className="w-full h-full object-cover" />
                 </div>
                 <div>
                   <div className="text-sm text-[#202124]">FlixCam.rent</div>
                   <div className="text-xs text-[#4d5156]">https://flixcam.rent</div>
                 </div>
               </div>
               <div className="text-xl text-[#1a0dab] hover:underline cursor-pointer mb-1 leading-tight">
                 FlixCam.rent - Cinematic Equipment & Studio Rental
               </div>
               <div className="text-sm text-[#4d5156] leading-snug">
                 Rent professional cinematic equipment and studios in Riyadh, Saudi Arabia. Cameras, lenses, lighting, and more.
               </div>
             </div>
             <p className="text-xs text-muted-foreground mt-4 leading-relaxed" dir="rtl">
               هذه هي المعاينة الافتراضية للموقع الرئيسي. قم بتعبئة الإعدادات العامة لتحديث بطاقة العرض في المحركات ومنصات التواصل.
             </p>
             <div className="flex flex-wrap gap-2 text-xs mt-4" dir="rtl">
               <a className="text-brand-primary hover:underline font-medium" href="/sitemap.xml" target="_blank" rel="noreferrer">
                 /sitemap.xml
               </a>
               <span className="text-muted-foreground">|</span>
               <a className="text-brand-primary hover:underline font-medium" href="/robots.txt" target="_blank" rel="noreferrer">
                 /robots.txt
               </a>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
