import { prisma } from '@/lib/db/prisma'

export interface EquipmentUtilization {
  id: string
  name: string
  sku: string
  dailyPrice: number
  quantityTotal: number
  quantityAvailable: number
  category: string
  activeBookings: number
  upcomingBookings: number
  totalBookings30d: number
  utilizationRate: number
  status: 'Hot' | 'Warm' | 'Cold' | 'Idle'
  revenue30d: number
  suggestion: string
}

export class InventoryMarketingService {
  static async getUtilizationReport(): Promise<EquipmentUtilization[]> {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const equipment = await (prisma.equipment as any).findMany({
      where: { isActive: true, deletedAt: null },
      include: {
        category: { select: { name: true } },
        product: { select: { name: true } },
        bookings: {
          where: { deletedAt: null },
          include: {
            booking: {
              select: {
                startDate: true,
                endDate: true,
                status: true,
                totalAmount: true
              }
            }
          }
        }
      }
    })

    return (equipment as any[]).map((item: any) => {
      const name = item.product?.name || item.sku
      const dailyPrice = Number(item.dailyPrice)
      
      const activeBookings = item.bookings.filter((be: any) => 
        be.booking.startDate <= now && be.booking.endDate >= now &&
        !['CANCELLED', 'DRAFT'].includes(be.booking.status)
      ).length

      const upcomingBookings = item.bookings.filter((be: any) => 
        be.booking.startDate > now && be.booking.startDate <= thirtyDaysAhead &&
        !['CANCELLED', 'DRAFT'].includes(be.booking.status)
      ).length

      const recent = item.bookings.filter((be: any) => 
        be.booking.endDate >= thirtyDaysAgo && be.booking.startDate <= now &&
        !['CANCELLED', 'DRAFT'].includes(be.booking.status)
      )
      const totalBookings30d = recent.length
      
      const revenue30d = recent.reduce((sum: number, be: any) => {
        const bookingDays = Math.max(1, Math.ceil((be.booking.endDate.getTime() - be.booking.startDate.getTime()) / (1000 * 60 * 60 * 24)))
        return sum + (dailyPrice * bookingDays * be.quantity)
      }, 0)

      const bookedDays = recent.reduce((sum: number, be: any) => {
        const start = new Date(Math.max(be.booking.startDate.getTime(), thirtyDaysAgo.getTime()))
        const end = new Date(Math.min(be.booking.endDate.getTime(), now.getTime()))
        return sum + Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
      }, 0)
      const utilizationRate = Math.min(100, Math.round((bookedDays / 30) * 100))

      let status: EquipmentUtilization['status'] = 'Idle'
      if (utilizationRate >= 80) status = 'Hot'
      else if (utilizationRate >= 50) status = 'Warm'
      else if (utilizationRate >= 15) status = 'Cold'

      let suggestion = ''
      if (status === 'Hot') suggestion = 'إيقاف الإعلانات — هذه المعدة محجوزة بالكامل تقريباً. وفّر ميزانية الإعلانات.'
      else if (status === 'Warm') suggestion = 'حافظ على الزخم — أضف عرض "حجز مبكر" لتعزيز الحجوزات المستقبلية.'
      else if (status === 'Cold') suggestion = 'أطلق حملة "عرض خاص" — خصم 15% لمدة أسبوع لتحفيز الطلب.'
      else suggestion = 'أطلق حملة "تصفية" أو "Featured Item" — هذه المعدة لم تُحجز منذ فترة طويلة.'

      return {
        id: item.id,
        name,
        sku: item.sku,
        dailyPrice,
        quantityTotal: item.quantityTotal,
        quantityAvailable: item.quantityAvailable,
        category: item.category?.name || 'غير مصنف',
        activeBookings,
        upcomingBookings,
        totalBookings30d,
        utilizationRate,
        status,
        revenue30d: Math.round(revenue30d),
        suggestion
      }
    }).sort((a: any, b: any) => a.utilizationRate - b.utilizationRate)
  }
}
