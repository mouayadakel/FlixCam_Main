/**
 * @file page.tsx
 * @description Premium, touchscreen-optimized, bilingual Promissory Note & Contract signing page for FlixCam checkout.
 * @module app/public/checkout/promissory-note/[bookingId]
 */

'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useLocale } from '@/hooks/use-locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Loader2, 
  ArrowLeft, 
  ArrowRight, 
  ShieldCheck, 
  FileText, 
  PenTool, 
  CheckCircle, 
  AlertCircle, 
  Info,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react'
import { formatSar } from '@/lib/utils/format.utils'

const SignatureCanvas = dynamic(
  () => import('react-signature-canvas').then((mod) => mod.default),
  { ssr: false }
)

interface PreviewData {
  bookingId: string
  bookingNumber: string
  invoiceNumber: string
  debtorName: string
  debtorPhone: string
  debtorEmail: string
  amountSar: number
  amountInWords: string
  equipmentItems: { name: string; purchaseValue: number; quantity: number }[]
  expectedReturnDate: string
  dueDate: string
  creditorName: string
  managerLetterTemplate: string
  managerName: string
  managerTitle: string
}

export default function PromissoryNoteSignPage() {
  const { t, dir, locale } = useLocale()
  const router = useRouter()
  const params = useParams()
  const bookingId = params?.bookingId as string
  const [data, setData] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Customizer terms & steps states
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [terms, setTerms] = useState(false)
  const [damage, setDamage] = useState(false)
  const [lateFees, setLateFees] = useState(false)
  const [binding, setBinding] = useState(false)
  
  const sigRef = useRef<{ clear: () => void; toDataURL: () => string; isEmpty: () => boolean } | null>(null)

  useEffect(() => {
    if (!bookingId) return
    let cancelled = false
    fetch(`/api/promissory-notes/booking/${bookingId}/preview`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to load booking details'))))
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'فشل تحميل بيانات السند')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [bookingId])

  const allChecked = terms && damage && lateFees && binding

  const handleSign = async () => {
    if (!bookingId || !sigRef.current) return
    if (sigRef.current.isEmpty()) {
      setError(locale === 'ar' ? 'يرجى رسم التوقيع أولاً في المساحة المخصصة' : 'Please draw your signature first in the designated area')
      return
    }
    const signatureData = sigRef.current.toDataURL()
    if (!signatureData) return
    setSigning(true)
    setError(null)
    try {
      const res = await fetch('/api/promissory-notes/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          termsAccepted: true,
          damagePolicyAccepted: true,
          lateFeesAccepted: true,
          signatureData,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || 'فشل اعتماد التوقيع الالكتروني')
        setSigning(false)
        return
      }
      
      const payRes = await fetch('/api/checkout/initiate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      const payData = await payRes.json().catch(() => ({}))
      if (payRes.ok && payData.redirectUrl) {
        window.location.href = payData.redirectUrl
        return
      }
      if (payRes.ok && payData.gateway === 'moyasar') {
        window.location.href = `/checkout/moyasar/${bookingId}`
        return
      }
      router.push(`/booking/confirmation/${bookingId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ غير متوقع أثناء معالجة التوقيع')
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-900 text-white" dir={dir}>
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mx-auto" />
          <p className="text-slate-400 font-medium">جاري تجهيز وثيقة العقد الرقمية وضمان الالتزام...</p>
        </div>
      </main>
    )
  }

  if (error && !data) {
    return (
      <main className="container mx-auto max-w-lg px-4 py-16" dir={dir}>
        <Card className="border-rose-100 bg-white shadow-2xl">
          <CardContent className="pt-8 text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-rose-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-800">خطأ في الوثيقة الرقمية</h2>
            <p className="text-slate-500 text-sm">{error}</p>
            <Button variant="outline" className="w-full mt-4" onClick={() => router.push('/checkout')}>
              العودة إلى سلة المشتريات
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (!data) return null

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 md:px-8" dir={dir}>
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Branding Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-800 pb-6">
          <div className="space-y-1 text-center md:text-right">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">بوابة التوقيع الآمن | SECURE SIGNING PORTAL</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white mt-1">التوقيع الرقمي المعتمد لسند الأمر</h1>
          </div>
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <span>متوافق مع قوانين المعاملات الالكترونية بالسعودية (ZATCA)</span>
          </div>
        </div>

        {/* Wizard Progress Steps Indicator */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-500 max-w-xl mx-auto">
          <div 
            className={`py-2 border-b-2 transition-colors cursor-pointer ${step === 1 ? 'border-emerald-500 text-emerald-400' : 'border-slate-800'}`}
            onClick={() => setStep(1)}
          >
            1. مراجعة العقد / Review Contract
          </div>
          <div 
            className={`py-2 border-b-2 transition-colors cursor-pointer ${step === 2 ? 'border-emerald-500 text-emerald-400' : 'border-slate-800'}`}
            onClick={() => { if (step > 1 || terms) setStep(2) }}
          >
            2. الإقرارات الضامنة / Consents
          </div>
          <div 
            className={`py-2 border-b-2 transition-colors cursor-pointer ${step === 3 ? 'border-emerald-500 text-emerald-400' : 'border-slate-800'}`}
            onClick={() => { if (allChecked) setStep(3) }}
          >
            3. التوقيع الرقمي / Signature
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Booking Summary Box (Always visible as a side panel on desktop) */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl text-slate-200 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 h-1 w-full bg-emerald-500" />
              <CardHeader className="pb-4 border-b border-slate-800/60">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
                  <FileText className="h-5 w-5 text-slate-400" />
                  ملخص العقد والحجز
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">مستندات حجز فليكس كام</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6 text-sm">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">رقم الحجز / Booking No.</p>
                  <p className="font-mono font-bold text-white">#{data.bookingNumber}</p>
                </div>
                <div className="space-y-1 border-t border-slate-800/60 pt-3">
                  <p className="text-xs text-slate-500">رقم الفاتورة الضريبية / Tax Invoice</p>
                  <p className="font-mono font-bold text-white">{data.invoiceNumber}</p>
                </div>
                <div className="space-y-1 border-t border-slate-800/60 pt-3">
                  <p className="text-xs text-slate-500">قيمة تغطية سند الأمر الضامن / Coverage Amount</p>
                  <p className="text-xl font-black text-emerald-400">{formatSar(data.amountSar, locale)}</p>
                  <p className="text-[11px] text-slate-400 italic font-medium">{data.amountInWords}</p>
                </div>
                <div className="space-y-1 border-t border-slate-800/60 pt-3 text-xs leading-relaxed text-slate-300">
                  <p className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <span>تاريخ الاسترجاع المتوقع: {data.expectedReturnDate}</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/30 text-slate-400 text-xs leading-relaxed">
              <CardContent className="pt-4 flex gap-2.5 items-start">
                <Info className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <p>
                  سند الأمر (Promissory Note) هو مستند مالي ملزم قانونياً وقابل للتنفيذ المباشر أمام محاكم التنفيذ في المملكة العربية السعودية، وهو جزء أساسي لضمان حماية معدات السينما المؤجرة.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Interactive Steps Section */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* STEP 1: REVIEW EQUIPMENT ITEMS */}
            {step === 1 && (
              <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-xl text-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg text-white font-bold">1. مراجعة تفاصيل المعدات وعقد الإيجار</CardTitle>
                  <CardDescription className="text-slate-400">يرجى التأكد من مطابقة جميع الأجهزة والملحقات المطلوبة</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {data.equipmentItems.length > 0 ? (
                    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                      <div className="grid grid-cols-12 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-400 border-b border-slate-800">
                        <div className="col-span-7">اسم المعدة / Equipment Name</div>
                        <div className="col-span-2 text-center">الكمية</div>
                        <div className="col-span-3 text-left">قيمة التعويض</div>
                      </div>
                      <div className="divide-y divide-slate-850">
                        {data.equipmentItems.map((it, i) => (
                          <div key={i} className="grid grid-cols-12 px-4 py-3 text-sm items-center hover:bg-slate-900/10">
                            <div className="col-span-7 font-semibold text-white">{it.name}</div>
                            <div className="col-span-2 text-center font-mono">{it.quantity}</div>
                            <div className="col-span-3 text-left text-xs font-bold text-emerald-400">{formatSar(it.purchaseValue * it.quantity, locale)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm">لا توجد معدات مدرجة في هذا الحجز.</p>
                  )}

                  <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-4 text-xs text-emerald-300 leading-relaxed">
                    <div className="flex gap-2">
                      <Sparkles className="h-5 w-5 text-emerald-400 shrink-0" />
                      <p>
                        <strong>إرشاد:</strong> بعد التأكد من مطابقة المعدات وقيم التعويض، اضغط على زر الاستمرار للموافقة على الإقرارات والشروط القانونية لبدء التوقيع.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2 rounded-xl"
                      onClick={() => setStep(2)}
                    >
                      متابعة للإقرارات القانونية
                      <ArrowLeft className="ms-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 2: CONSENTS & CHECKS */}
            {step === 2 && (
              <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-xl text-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg text-white font-bold">2. الشروط والأحكام والإقرارات القانونية</CardTitle>
                  <CardDescription className="text-slate-400">يرجى قراءة والموافقة على جميع بنود المسؤولية المالية</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  <div className="space-y-4">
                    <label className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-800 bg-slate-900/25 hover:bg-slate-900/50 transition-all cursor-pointer">
                      <Checkbox 
                        checked={terms} 
                        onCheckedChange={(v) => setTerms(!!v)} 
                        className="mt-1 border-slate-600 data-[state=checked]:bg-emerald-600"
                      />
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-white">الموافقة على شروط تأجير المعدات العامة</p>
                        <p className="text-xs text-slate-500 leading-relaxed">أقر بأنني اطلعت على شروط استخدام وتأجير كاميرات ومعدات فليكس كام وسألتزم ببنودها بالكامل.</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-800 bg-slate-900/25 hover:bg-slate-900/50 transition-all cursor-pointer">
                      <Checkbox 
                        checked={damage} 
                        onCheckedChange={(v) => setDamage(!!v)} 
                        className="mt-1 border-slate-600 data-[state=checked]:bg-emerald-600"
                      />
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-white">سياسة الأضرار والتلفيات وتغطية التأمين</p>
                        <p className="text-xs text-slate-500 leading-relaxed">أتحمل كامل المسؤولية الجنائية والمالية في حال تلف أو ضياع أي من المعدات وتغطية قيمتها المصرح بها في الخطوة الأولى.</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-800 bg-slate-900/25 hover:bg-slate-900/50 transition-all cursor-pointer">
                      <Checkbox 
                        checked={lateFees} 
                        onCheckedChange={(v) => setLateFees(!!v)} 
                        className="mt-1 border-slate-600 data-[state=checked]:bg-emerald-600"
                      />
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-white">سياسة التأخير ورسوم الاسترجاع المتأخر</p>
                        <p className="text-xs text-slate-500 leading-relaxed">أوافق على احتساب رسوم إيجار يومية مضاعفة تلقائياً في حال التأخر عن موعد الإرجاع المذكور في العقد الرقمي دون موافقة كتابية مسبقة.</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-800 bg-slate-900/25 hover:bg-slate-900/50 transition-all cursor-pointer">
                      <Checkbox 
                        checked={binding} 
                        onCheckedChange={(v) => setBinding(!!v)} 
                        className="mt-1 border-slate-600 data-[state=checked]:bg-emerald-600"
                      />
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-white">الإقرار القانوني والالتزام بالدفع النهائي</p>
                        <p className="text-xs text-slate-500 leading-relaxed">أقر بأن التوقيع الرقمي يمثل التوقيع الرسمي المعتمد لسند الأمر وسأكون ملزماً بالسداد عند الاقتضاء دون شروط إضافية.</p>
                      </div>
                    </label>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <Button 
                      variant="outline" 
                      className="border-slate-800 text-slate-300 hover:bg-slate-900"
                      onClick={() => setStep(1)}
                    >
                      الرجوع للخلف
                    </Button>
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2 rounded-xl"
                      disabled={!allChecked}
                      onClick={() => setStep(3)}
                    >
                      الذهاب للوحة التوقيع
                      <ArrowLeft className="ms-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 3: INTERACTIVE SIGNATURE CANVAS */}
            {step === 3 && (
              <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-xl text-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg text-white font-bold flex items-center gap-2">
                    <PenTool className="h-5 w-5 text-emerald-400" />
                    3. التوقيع الرقمي والاعتماد الآمن
                  </CardTitle>
                  <CardDescription className="text-slate-400">يرجى رسم توقيعك بوضوح داخل المربع الأبيض أدناه</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Signature Draw Area */}
                  <div className="rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/10 p-4 transition-all hover:border-emerald-500/50">
                    <div className="rounded-xl border border-slate-800 overflow-hidden bg-white shadow-inner">
                      {React.createElement(SignatureCanvas as React.ComponentType<{ ref?: React.RefCallback<{ clear: () => void; toDataURL: () => string; isEmpty: () => boolean } | null>; canvasProps?: { className?: string }; backgroundColor?: string }>, {
                        ref: (el: { clear: () => void; toDataURL: () => string; isEmpty: () => boolean } | null) => {
                          sigRef.current = el
                        },
                        canvasProps: { className: 'w-full h-44 cursor-crosshair text-slate-900 bg-slate-50' },
                        backgroundColor: 'rgba(255, 255, 255, 1)',
                      })}
                    </div>
                    
                    <div className="mt-3 flex justify-between items-center text-xs">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-white"
                        onClick={() => sigRef.current?.clear()}
                      >
                        مسح التوقيع والبدء من جديد
                      </Button>
                      <span className="text-slate-500">منطقة توقيع رسمية محمية الكترونياً</span>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-3.5 text-xs text-rose-400 flex gap-2">
                      <AlertCircle className="h-5 w-5 shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  {/* Actions buttons */}
                  <div className="flex justify-between items-center pt-2">
                    <Button 
                      variant="outline" 
                      className="border-slate-800 text-slate-300 hover:bg-slate-900"
                      onClick={() => setStep(2)}
                    >
                      تعديل الإقرارات
                    </Button>
                    
                    <Button
                      size="lg"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-8 py-3 rounded-xl shadow-lg shadow-emerald-950/50"
                      disabled={!allChecked || signing}
                      onClick={handleSign}
                    >
                      {signing ? (
                        <>
                          <Loader2 className="me-2 h-4 w-4 animate-spin" />
                          جاري اعتماد التوقيع والختم...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="me-2 h-5 w-5 text-emerald-200" />
                          اعتماد التوقيع وإتمام الحجز
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>

        </div>

      </div>
    </main>
  )
}
