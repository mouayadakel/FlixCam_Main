'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Eye, ShieldAlert, CheckCircle2, AlertCircle, Loader2, ZoomIn, Info } from 'lucide-react'
import Image from 'next/image'

interface DamageComparisonViewProps {
  claimId: string
  checkoutPhotos: string[]
  checkinPhotos: string[]
  aiAnalysis?: {
    damageDetected: boolean
    confidence: number
    findings: string
    severity: string
    highlights?: Array<{ x: number, y: number, label: string }>
  }
  onAnalyze: () => Promise<void>
}

export const DamageComparisonView: React.FC<DamageComparisonViewProps> = ({
  claimId,
  checkoutPhotos,
  checkinPhotos,
  aiAnalysis,
  onAnalyze
}) => {
  const [analyzing, setAnalyzing] = useState(false)

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      await onAnalyze()
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50 border-b pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl flex items-center gap-2">
              <Eye className="h-5 w-5 text-brand-primary" />
              مقارنة حالة المعدات (قبل وبعد)
            </CardTitle>
            {!aiAnalysis && (
              <Button 
                onClick={handleAnalyze} 
                disabled={analyzing}
                className="rounded-full shadow-md bg-brand-primary hover:bg-brand-primary/90"
              >
                {analyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin ms-2" />
                ) : (
                  <ShieldAlert className="h-4 w-4 ms-2" />
                )}
                بدء تشخيص الذكاء الاصطناعي
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Checkout Photos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  عند الاستلام (Checkout)
                </Badge>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Baseline Proof</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {checkoutPhotos.map((url, i) => (
                  <div key={i} className="aspect-square relative rounded-xl border-2 border-slate-100 overflow-hidden hover:border-brand-primary transition-all group">
                    <Image src={url} alt="Checkout" fill className="object-cover" unoptimized />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <ZoomIn className="h-6 w-6 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Checkin Photos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  عند الإرجاع (Check-in)
                </Badge>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Visual Audit</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {checkinPhotos.map((url, i) => (
                  <div key={i} className="aspect-square relative rounded-xl border-2 border-slate-100 overflow-hidden hover:border-brand-primary transition-all group">
                    <Image src={url} alt="Check-in" fill className="object-cover" unoptimized />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <ZoomIn className="h-6 w-6 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Insights Overlay */}
          {aiAnalysis && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-[1px] flex-1 bg-slate-100" />
                <Badge className="bg-slate-900 text-white gap-2 px-3 py-1">
                   Gemini Vision Insight
                </Badge>
                <div className="h-[1px] flex-1 bg-slate-100" />
              </div>

              {aiAnalysis.damageDetected ? (
                <Alert className="border-red-200 bg-red-50/50 rounded-2xl">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <AlertTitle className="text-red-800 text-lg font-bold mb-2">تم اكتشاف ضرر محتمل ⚠️</AlertTitle>
                  <AlertDescription className="text-red-700 leading-relaxed">
                    <p className="font-medium mb-3">{aiAnalysis.findings}</p>
                    <div className="flex gap-4 items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase opacity-60">Severity:</span>
                        <Badge variant="destructive" className="h-6">{aiAnalysis.severity}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase opacity-60">Confidence:</span>
                        <span className="text-sm font-bold">{Math.round(aiAnalysis.confidence * 100)}%</span>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-green-200 bg-green-50/50 rounded-2xl">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <AlertTitle className="text-green-800 text-lg font-bold mb-1">المعدة سليمة ✅</AlertTitle>
                  <AlertDescription className="text-green-700 font-medium">
                    لم يكتشف نظام الذكاء الاصطناعي أي تغييرات جوهرية أو ضرر مادي يتجاوز الاستخدام المهني المعتاد.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 justify-center text-muted-foreground text-xs bg-slate-50 py-3 rounded-xl border">
        <Info className="h-4 w-4" />
        استخدم صوراً عالية الدقة لزيادة دقة تحليل الذكاء الاصطناعي.
      </div>
    </div>
  )
}
