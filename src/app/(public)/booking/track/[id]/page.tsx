'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Truck, Package, CheckCircle, Phone, Info, Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export default function TrackingPage() {
  const params = useParams()
  const [tracking, setTracking] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTracking = async () => {
      try {
        const res = await fetch(`/api/delivery/${params?.id}`)
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        setTracking(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchTracking()
    const interval = setInterval(fetchTracking, 10000) // Poll every 10s
    return () => clearInterval(interval)
  }, [params?.id])

  if (loading) {
    return (
      <div className="container max-w-2xl py-12 space-y-6">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  if (!tracking) {
    return (
      <div className="container flex flex-col items-center justify-center py-20 text-center">
        <div className="bg-red-50 text-red-600 p-4 rounded-full mb-4">
          <Info className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-bold">عذراً، الرابط غير صالح</h1>
        <p className="text-muted-foreground mt-2">يرجى التحقق من الرابط أو التواصل مع الدعم الفني</p>
      </div>
    )
  }

  const steps = [
    { key: 'scheduled', label: 'تمت الجدولة', icon: Package, status: ['scheduled', 'pending'] },
    { key: 'dispatched', label: 'جاري التوصيل', icon: Truck, status: ['dispatched', 'in_transit'] },
    { key: 'delivered', label: 'تم التسليم', icon: CheckCircle, status: ['delivered'] },
  ]

  const currentStepIndex = steps.findIndex(s => s.status.includes(tracking.status))

  // Render a live Mapbox static tile only when a token AND coordinates are available;
  // otherwise fall back to a clean local gradient (no external/broken requests).
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const lng = tracking.currentLocation?.lng ?? tracking.destination?.lng
  const lat = tracking.currentLocation?.lat ?? tracking.destination?.lat
  const mapTileUrl =
    mapboxToken && typeof lng === 'number' && typeof lat === 'number'
      ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${lng},${lat},12,0/800x450?access_token=${mapboxToken}`
      : null

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold font-heading">تتبع معداتك 🎥</h1>
          <Badge variant="outline" className="bg-brand-primary/10 text-brand-primary border-brand-primary/20">
            {tracking.deliveryNumber}
          </Badge>
        </div>
        <p className="text-muted-foreground">رقم الحجز: {tracking.bookingNumber}</p>
      </div>

      {/* Map Simulation */}
      <Card className="overflow-hidden border-0 shadow-xl rounded-2xl bg-slate-900 aspect-video relative">
        {mapTileUrl ? (
          <div
            className="absolute inset-0 opacity-40 bg-cover bg-center"
            style={{ backgroundImage: `url('${mapTileUrl}')` }}
          />
        ) : (
          <div className="absolute inset-0 opacity-60 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:20px_20px]" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
           {tracking.currentLocation ? (
             <div className="relative animate-bounce">
               <div className="absolute -inset-4 bg-orange-500/20 rounded-full animate-ping" />
               <Truck className="h-10 w-10 text-brand-primary fill-brand-primary" />
             </div>
           ) : (
             <div className="text-white text-center">
               <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 opacity-50" />
               <p className="text-sm opacity-70">في انتظار انطلاق السائق...</p>
             </div>
           )}
        </div>
        <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur p-3 rounded-xl flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-brand-primary/10 p-2 rounded-full">
              <MapPin className="h-5 w-5 text-brand-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">الوجهة</p>
              <p className="text-sm font-medium truncate max-w-[200px]">{tracking.destination?.address}</p>
            </div>
          </div>
          {tracking.driver && (
            <Button size="sm" variant="outline" className="rounded-full gap-2">
              <Phone className="h-4 w-4" />
              اتصال
            </Button>
          )}
        </div>
      </Card>

      {/* Status Timeline */}
      <Card className="border-0 shadow-lg rounded-2xl">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between relative px-2">
            <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
            <div 
              className="absolute top-1/2 left-8 h-0.5 bg-brand-primary -translate-y-1/2 z-0 transition-all duration-1000" 
              style={{ width: `${Math.max(0, currentStepIndex) * 50}%` }} 
            />
            
            {steps.map((step, idx) => {
              const Icon = step.icon
              const isActive = currentStepIndex >= idx
              return (
                <div key={step.key} className="flex flex-col items-center gap-2 relative z-10">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
                    isActive ? 'bg-brand-primary text-white shadow-lg scale-110' : 'bg-slate-50 text-slate-300 border-2'
                  }`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className={`text-[11px] font-bold ${isActive ? 'text-brand-primary' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          سيتم تحديث الصفحة تلقائياً مع تحرك المعدات نحو موقعك.
        </p>
      </div>
    </div>
  )
}
