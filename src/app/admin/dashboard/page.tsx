/**
 * @file page.tsx
 * @description Admin dashboard overview page with KPIs, charts, and recent bookings
 * @module app/admin/dashboard
 */

import { Suspense } from 'react'
import { prisma } from '@/lib/db/prisma'
import { KPICard } from '@/components/dashboard/kpi-card'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { BookingStateChart } from '@/components/dashboard/booking-state-chart'
import { RecentBookingsTable } from '@/components/dashboard/recent-bookings-table'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Calendar, FileText, DollarSign, Users, TrendingUp } from 'lucide-react'
import { format, subDays, startOfMonth } from 'date-fns'
import { arSA } from 'date-fns/locale'

async function getKPIs() {
  try {
    const now = new Date()
    const startOfCurrentMonth = startOfMonth(now)

    // Revenue this month (from payments)
    const revenueData = await prisma.payment.findMany({
      where: {
        status: 'SUCCESS',
        createdAt: {
          gte: startOfCurrentMonth,
        },
        deletedAt: null,
      },
      select: {
        amount: true,
      },
    })

    const revenue = revenueData.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)

    // Bookings this month
    const bookingCount = await prisma.booking.count({
      where: {
        createdAt: {
          gte: startOfCurrentMonth,
        },
        deletedAt: null,
      },
    })

    // Utilization rate - count equipment items in active bookings
    const totalEquipment = await prisma.equipment.count({
      where: {
        isActive: true,
        deletedAt: null,
      },
    })

    // Count equipment in active bookings via BookingEquipment
    // Use direct query with nested where for better performance
    const activeBookingEquipment = await prisma.bookingEquipment.findMany({
      where: {
        booking: {
          status: {
            in: ['CONFIRMED', 'ACTIVE'],
          },
          deletedAt: null,
        },
        deletedAt: null,
      },
      select: {
        quantity: true,
      },
    })

    const rentedEquipmentCount = activeBookingEquipment.reduce((sum, be) => sum + be.quantity, 0)

    const utilization = totalEquipment > 0 ? (rentedEquipmentCount / totalEquipment) * 100 : 0

    // New clients this month - check if there's a client role or use a different approach
    // For now, we'll count users that made bookings (they are clients)
    const newClientBookings = await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: startOfCurrentMonth,
        },
        deletedAt: null,
      },
      select: {
        customerId: true,
      },
      distinct: ['customerId'],
    })

    const clientCount = newClientBookings.length

    return {
      revenue,
      bookingCount,
      utilization,
      clientCount,
    }
  } catch (error) {
    console.error('Error fetching KPIs:', error)
    return {
      revenue: 0,
      bookingCount: 0,
      utilization: 0,
      clientCount: 0,
    }
  }
}

async function getRevenueData() {
  try {
    const days = 30
    const revenueData = []
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i)
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)

      const dayRevenue = await prisma.payment.findMany({
        where: {
          status: 'SUCCESS',
          createdAt: {
            gte: dayStart,
            lte: dayEnd,
          },
          deletedAt: null,
        },
        select: {
          amount: true,
        },
      })

      const total = dayRevenue.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)

      revenueData.push({
        date: dayStart.toISOString(),
        revenue: total,
      })
    }

    return revenueData
  } catch (error) {
    console.error('Error fetching revenue data:', error)
    return []
  }
}

async function getBookingStateData() {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        status: true,
      },
    })

    const stateCounts: Record<string, number> = {}
    bookings.forEach((booking) => {
      const status = booking.status
      stateCounts[status] = (stateCounts[status] || 0) + 1
    })

    const STATE_COLORS: Record<string, string> = {
      DRAFT: '#9CA3AF',
      RISK_CHECK: '#F59E0B',
      PAYMENT_PENDING: '#F59E0B',
      CONFIRMED: '#10B981',
      ACTIVE: '#1F87E8',
      RETURNED: '#6366F1',
      CLOSED: '#6B7280',
      CANCELLED: '#EF4444',
    }

    return Object.entries(stateCounts).map(([status, count]) => ({
      state: status.toLowerCase(),
      count,
      color: STATE_COLORS[status] || '#6B7280',
    }))
  } catch (error) {
    console.error('Error fetching booking state data:', error)
    return []
  }
}

async function getRecentBookings() {
  try {
    const bookings = await prisma.booking.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        bookingNumber: true,
        customerId: true,
        status: true,
        startDate: true,
        endDate: true,
        totalAmount: true,
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    return bookings.map((booking) => ({
      id: booking.id,
      booking_number: booking.bookingNumber,
      client_id: booking.customerId,
      client_name: booking.customer?.name || booking.customer?.email || 'عميل',
      state: booking.status.toLowerCase(),
      start_date: booking.startDate,
      end_date: booking.endDate,
      total: Number(booking.totalAmount || 0),
    }))
  } catch (error) {
    console.error('Error fetching recent bookings:', error)
    return []
  }
}

export default async function DashboardPage() {
  // Fetch all data in parallel for better performance
  const [kpis, revenueData, bookingStateData, recentBookings] = await Promise.all([
    getKPIs().catch((error) => {
      console.error('Error fetching KPIs:', error)
      return { revenue: 0, bookingCount: 0, utilization: 0, clientCount: 0 }
    }),
    getRevenueData().catch((error) => {
      console.error('Error fetching revenue data:', error)
      return []
    }),
    getBookingStateData().catch((error) => {
      console.error('Error fetching booking state data:', error)
      return []
    }),
    getRecentBookings().catch((error) => {
      console.error('Error fetching recent bookings:', error)
      return []
    }),
  ])

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">لوحة التحكم</h1>
          <p className="mt-1 text-sm text-neutral-600">نظرة عامة على الأداء والأنشطة</p>
        </div>
        
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/admin/bookings/new">
              <Calendar className="ml-2 h-4 w-4" />
              حجز جديد
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/quotes/new">
              <FileText className="ml-2 h-4 w-4" />
              عرض سعر جديد
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="الإيرادات (هذا الشهر)"
          value={`${kpis.revenue.toLocaleString('ar-SA')} ر.س`}
          trend="+12%"
          trendDirection="up"
          icon={DollarSign}
          description="مقارنة بالشهر الماضي"
        />
        <KPICard
          title="الحجوزات (هذا الشهر)"
          value={kpis.bookingCount.toString()}
          trend="+5%"
          trendDirection="up"
          icon={Calendar}
          description="مقارنة بالشهر الماضي"
        />
        <KPICard
          title="نسبة الإشغال"
          value={`${kpis.utilization.toFixed(1)}%`}
          trend="-2%"
          trendDirection="down"
          icon={TrendingUp}
          description="نسبة المعدات المستأجرة"
        />
        <KPICard
          title="عملاء جدد (هذا الشهر)"
          value={kpis.clientCount.toString()}
          trend="+8%"
          trendDirection="up"
          icon={Users}
          description="مقارنة بالشهر الماضي"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-96" />}>
          <RevenueChart data={revenueData} />
        </Suspense>
        
        <Suspense fallback={<Skeleton className="h-96" />}>
          <BookingStateChart data={bookingStateData} />
        </Suspense>
      </div>

      {/* Recent Bookings */}
      <Suspense fallback={<Skeleton className="h-96" />}>
        <RecentBookingsTable bookings={recentBookings} />
      </Suspense>
    </div>
  )
}
