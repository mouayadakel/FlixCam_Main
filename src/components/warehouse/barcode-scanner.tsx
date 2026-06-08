'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Camera, X, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

interface BarcodeScannerProps {
  onScan?: (decodedText: string) => Promise<void> | void
  onClose: () => void
  isOpen: boolean
  mode?: 'CHECKOUT' | 'CHECKIN'
}

export function BarcodeScanner({
  onScan,
  onClose,
  isOpen,
  mode = 'CHECKOUT',
}: BarcodeScannerProps) {
  const { toast } = useToast()
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const onScanRef = useRef(onScan)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const lastScannedCode = useRef<string | null>(null)
  const lastScannedTime = useRef<number>(0)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    if (!isOpen) return

    setIsInitializing(true)
    setIsProcessing(false)
    setScanStatus('idle')

    const timer = setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        'warehouse-scanner-region',
        {
          fps: 20,
          qrbox: { width: 250, height: 150 },
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
          ],
          rememberLastUsedCamera: true,
          supportedScanTypes: [0],
        },
        false
      )

      scanner.render(
        async (decodedText) => {
          const now = Date.now()
          if (decodedText === lastScannedCode.current && now - lastScannedTime.current < 2000) {
            return
          }
          lastScannedCode.current = decodedText
          lastScannedTime.current = now

          setIsProcessing(true)
          try {
            if (onScanRef.current) {
              await onScanRef.current(decodedText)
            }
            setScanStatus('success')
            setTimeout(() => setScanStatus('idle'), 1500)
          } catch (error) {
            setScanStatus('error')
            toast({
              title: 'خطأ في المسح',
              description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
              variant: 'destructive',
            })
            setTimeout(() => setScanStatus('idle'), 3000)
          } finally {
            setIsProcessing(false)
          }
        },
        () => {}
      )

      scannerRef.current = scanner
      setIsInitializing(false)
    }, 300)

    return () => {
      clearTimeout(timer)
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {})
      }
    }
  }, [isOpen, toast])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Card className="relative w-full max-w-lg overflow-hidden rounded-2xl border-0 bg-white shadow-2xl">
        <div className="absolute end-4 top-4 z-10">
          <Button
            variant="outline"
            size="icon"
            onClick={onClose}
            className="rounded-full border-0 bg-white/90 shadow-lg hover:bg-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <CardContent className="p-0">
          <div className="relative flex aspect-video items-center justify-center bg-slate-900">
            {isInitializing && (
              <div className="flex flex-col items-center gap-3 text-white">
                <Loader2 className="h-8 w-8 animate-spin opacity-50" />
                <span className="animate-pulse text-sm font-medium">جاري تشغيل الكاميرا...</span>
              </div>
            )}
            <div id="warehouse-scanner-region" className="h-full w-full" />

            <div
              className={`pointer-events-none absolute inset-0 border-[30px] transition-colors duration-300 ${
                scanStatus === 'success'
                  ? 'border-green-500/40'
                  : scanStatus === 'error'
                    ? 'border-red-500/40'
                    : 'border-black/20'
              }`}
            >
              <div
                className={`relative h-full w-full rounded-sm border-2 transition-colors ${
                  scanStatus === 'success'
                    ? 'border-green-500'
                    : scanStatus === 'error'
                      ? 'border-red-500'
                      : 'border-brand-primary/40'
                }`}
              >
                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                    <div className="flex flex-col items-center gap-2 text-white">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="text-sm font-bold">جاري التعرف...</span>
                    </div>
                  </div>
                )}
                <div className="animate-scanner-line absolute start-4 end-4 top-1/2 h-0.5 bg-brand-primary shadow-[0_0_10px_rgba(242,101,34,1)]" />
              </div>
            </div>
          </div>

          <div className="space-y-2 bg-white p-6 text-center">
            <div className="flex items-center justify-center gap-3 font-bold text-brand-primary">
              <Camera className="h-5 w-5" />
              <h3 className="text-lg leading-none">تتبع الباركود الذكي</h3>
              <div
                className={`rounded px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                  mode === 'CHECKOUT'
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-green-100 text-green-600'
                }`}
              >
                {mode === 'CHECKOUT' ? 'تسليم' : 'استلام'}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              وجه الكاميرا نحو الـ SKU أو الرقم التسلسلي للمعدة للتوثيق الفوري.
            </p>
          </div>
        </CardContent>
      </Card>

      <style jsx global>{`
        @keyframes scanner-line {
          0% {
            top: 20%;
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            top: 80%;
            opacity: 0;
          }
        }
        .animate-scanner-line {
          animation: scanner-line 2s ease-in-out infinite;
        }
        #warehouse-scanner-region video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 0 !important;
        }
        #warehouse-scanner-region__dashboard,
        #warehouse-scanner-region__header_message {
          display: none !important;
        }
      `}</style>
    </div>
  )
}
