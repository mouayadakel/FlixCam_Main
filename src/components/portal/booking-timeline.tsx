'use client'

import { cn } from '@/lib/utils'
import { Check, Clock, Package, Camera, Heart, Home } from 'lucide-react'
import { BookingStatus } from '@prisma/client'

interface TimelineStep {
  id: string
  label: string
  description: string
  icon: any
  status: 'upcoming' | 'current' | 'completed'
}

interface BookingTimelineProps {
  status: BookingStatus
  startDate: Date
  endDate: Date
  className?: string
}

export function BookingTimeline({ status, startDate, endDate, className }: BookingTimelineProps) {
  const isPast = (date: Date) => new Date() > date
  const isFuture = (date: Date) => new Date() < date
  const isWithin24h = (date: Date) => {
    const day = 24 * 60 * 60 * 1000
    return Math.abs(new Date().getTime() - date.getTime()) < day
  }

  const getSteps = (): TimelineStep[] => {
    const steps: TimelineStep[] = [
      {
        id: 'confirmed',
        label: 'تم التأكيد',
        description: 'تم حجز المعدات وتأكيد الطلب',
        icon: Check,
        status: status !== 'DRAFT' && status !== 'CANCELLED' ? 'completed' : 'upcoming'
      },
      {
        id: 'preparing',
        label: 'جاري التجهيز',
        description: 'يقوم الفريق بتجهيز معداتك في المستودع',
        icon: Package,
        status: status === 'CONFIRMED' && isWithin24h(startDate) ? 'current' 
               : ['ACTIVE', 'RETURNED', 'CLOSED'].includes(status) ? 'completed' : 'upcoming'
      },
      {
        id: 'active',
        label: 'قيد الاستخدام',
        description: 'المعدات بحوزتك الآن. استمتع بالتصوير!',
        icon: Camera,
        status: status === 'ACTIVE' ? 'current' 
               : ['RETURNED', 'CLOSED'].includes(status) ? 'completed' : 'upcoming'
      },
      {
        id: 'returned',
        label: 'تم الإرجاع',
        description: 'تم استلام المعدات وفحصها',
        icon: Home,
        status: status === 'RETURNED' ? 'current' 
               : status === 'CLOSED' ? 'completed' : 'upcoming'
      }
    ]

    // Set current based on status if not already set by logic
    const currentStatusIdx = steps.findIndex(s => s.status === 'current')
    if (currentStatusIdx === -1) {
       // fallback matching
       if (status === 'CONFIRMED' && !isWithin24h(startDate)) steps[0].status = 'current'
    }

    return steps
  }

  const steps = getSteps()

  return (
    <div className={cn("relative pb-8", className)} dir="rtl">
      <div className="absolute left-[unset] right-5 top-4 -bottom-4 w-0.5 bg-slate-200" />
      <div className="space-y-8 relative">
        {steps.map((step, idx) => (
          <div key={step.id} className="relative flex items-start group">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full z-10 transition-all duration-500 ring-4 ring-white shadow-sm
              ${step.status === 'completed' ? 'bg-green-600 text-white' : 
                step.status === 'current' ? 'bg-brand-primary text-white scale-110 shadow-brand-primary/20' : 
                'bg-slate-100 text-slate-400'}">
              {step.status === 'completed' ? <Check className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
            </div>
            <div className="ms-4 min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2">
                <h4 className={cn(
                  "text-sm font-bold transition-colors",
                  step.status === 'completed' ? "text-green-700" : 
                  step.status === 'current' ? "text-brand-primary" : "text-slate-500"
                )}>
                  {step.label}
                </h4>
                {step.status === 'current' && (
                  <span className="flex h-2 w-2 rounded-full bg-brand-primary animate-ping" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
