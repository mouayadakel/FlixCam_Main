/**
 * @file reports.service.ts
 * @description Reports service for generating analytics and reports
 * @module lib/services
 * @author Engineering Team
 * @created 2026-01-28
 */

import { prisma } from '@/lib/db/prisma'
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '@/lib/errors'
import { hasPermission } from '@/lib/auth/permissions'
import type {
  ReportType,
  ReportFilter,
  RevenueReport,
  BookingReport,
  EquipmentReport,
  CustomerReport,
  FinancialReport,
  InventoryReport,
  DashboardStats,
} from '@/lib/types/reports.types'
import { BookingStatus, EquipmentCondition } from '@prisma/client'

export class ReportsService {
  /**
   * Generate revenue report
   */
  static async generateRevenueReport(
    filter: ReportFilter,
    userId: string
  ): Promise<RevenueReport> {
    // Check permission
    const canView = await hasPermission(userId, 'reports.read' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view reports')
    }

    const where: any = {
      deletedAt: null,
      createdAt: {
        gte: filter.dateFrom,
        lte: filter.dateTo,
      },
    }

    if (filter.bookingStatuses && filter.bookingStatuses.length > 0) {
      where.status = { in: filter.bookingStatuses }
    } else if (!filter.includeCancelled) {
      where.status = { not: 'CANCELLED' }
    }

    // Get all bookings in period
    const bookings = await prisma.booking.findMany({
      where,
      include: {
        equipment: {
          include: {
            equipment: {
              select: {
                id: true,
                sku: true,
                model: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Calculate totals
    const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0)
    const totalBookings = bookings.length
    const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0

    // Revenue by status
    const revenueByStatus = {
      confirmed: bookings.filter((b) => b.status === 'CONFIRMED').reduce((sum, b) => sum + Number(b.totalAmount || 0), 0),
      active: bookings.filter((b) => b.status === 'ACTIVE').reduce((sum, b) => sum + Number(b.totalAmount || 0), 0),
      completed: bookings.filter((b) => b.status === 'CLOSED').reduce((sum, b) => sum + Number(b.totalAmount || 0), 0),
      cancelled: bookings.filter((b) => b.status === 'CANCELLED').reduce((sum, b) => sum + Number(b.totalAmount || 0), 0),
    }

    // Revenue by equipment
    const equipmentRevenueMap = new Map<string, { name: string; revenue: number; bookings: number }>()
    bookings.forEach((booking) => {
      booking.equipment.forEach((be) => {
        const equipmentId = be.equipmentId
        const equipmentName = be.equipment.sku || be.equipment.model || equipmentId
        const existing = equipmentRevenueMap.get(equipmentId) || { name: equipmentName, revenue: 0, bookings: 0 }
        existing.revenue += Number(booking.totalAmount || 0) / booking.equipment.length
        existing.bookings += 1
        equipmentRevenueMap.set(equipmentId, existing)
      })
    })

    const revenueByEquipment = Array.from(equipmentRevenueMap.entries()).map(([id, data]) => ({
      equipmentId: id,
      equipmentName: data.name,
      revenue: data.revenue,
      bookings: data.bookings,
    }))

    // Revenue by customer
    const customerRevenueMap = new Map<string, { name: string; revenue: number; bookings: number }>()
    bookings.forEach((booking) => {
      const customerId = booking.customerId
      const customerName = booking.customer.name || booking.customer.email
      const existing = customerRevenueMap.get(customerId) || { name: customerName, revenue: 0, bookings: 0 }
      existing.revenue += Number(booking.totalAmount || 0)
      existing.bookings += 1
      customerRevenueMap.set(customerId, existing)
    })

    const revenueByCustomer = Array.from(customerRevenueMap.entries()).map(([id, data]) => ({
      customerId: id,
      customerName: data.name,
      revenue: data.revenue,
      bookings: data.bookings,
    }))

    // Revenue by period (monthly)
    const periodMap = new Map<string, { revenue: number; bookings: number }>()
    bookings.forEach((booking) => {
      const month = booking.createdAt.toISOString().substring(0, 7) // YYYY-MM
      const existing = periodMap.get(month) || { revenue: 0, bookings: 0 }
      existing.revenue += Number(booking.totalAmount || 0)
      existing.bookings += 1
      periodMap.set(month, existing)
    })

    const revenueByPeriod = Array.from(periodMap.entries())
      .sort()
      .map(([period, data]) => ({
        period,
        revenue: data.revenue,
        bookings: data.bookings,
      }))

    // Calculate VAT (15%)
    const vatAmount = totalRevenue * 0.15
    const netRevenue = totalRevenue - vatAmount

    return {
      period: `${filter.dateFrom.toISOString().split('T')[0]} to ${filter.dateTo.toISOString().split('T')[0]}`,
      totalRevenue,
      totalBookings,
      averageBookingValue,
      revenueByStatus,
      revenueByEquipment: revenueByEquipment.sort((a, b) => b.revenue - a.revenue).slice(0, 10),
      revenueByCustomer: revenueByCustomer.sort((a, b) => b.revenue - a.revenue).slice(0, 10),
      revenueByPeriod,
      vatAmount,
      netRevenue,
    }
  }

  /**
   * Generate booking report
   */
  static async generateBookingReport(
    filter: ReportFilter,
    userId: string
  ): Promise<BookingReport> {
    // Check permission
    const canView = await hasPermission(userId, 'reports.read' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view reports')
    }

    const where: any = {
      deletedAt: null,
      createdAt: {
        gte: filter.dateFrom,
        lte: filter.dateTo,
      },
    }

    if (!filter.includeCancelled) {
      where.status = { not: 'CANCELLED' }
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        equipment: {
          include: {
            equipment: {
              select: {
                id: true,
                sku: true,
                model: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    const totalBookings = bookings.length

    // Bookings by status
    const bookingsByStatus = {
      draft: bookings.filter((b) => b.status === 'DRAFT').length,
      confirmed: bookings.filter((b) => b.status === 'CONFIRMED').length,
      active: bookings.filter((b) => b.status === 'ACTIVE').length,
      returned: bookings.filter((b) => b.status === 'RETURNED').length,
      closed: bookings.filter((b) => b.status === 'CLOSED').length,
      cancelled: bookings.filter((b) => b.status === 'CANCELLED').length,
    }

    // Bookings by period
    const periodMap = new Map<string, { count: number; revenue: number }>()
    bookings.forEach((booking) => {
      const month = booking.createdAt.toISOString().substring(0, 7)
      const existing = periodMap.get(month) || { count: 0, revenue: 0 }
      existing.count += 1
      existing.revenue += Number(booking.totalAmount || 0)
      periodMap.set(month, existing)
    })

    const bookingsByPeriod = Array.from(periodMap.entries())
      .sort()
      .map(([period, data]) => ({
        period,
        count: data.count,
        revenue: data.revenue,
      }))

    // Average booking duration
    const durations = bookings
      .filter((b) => b.startDate && b.endDate)
      .map((b) => {
        const start = new Date(b.startDate)
        const end = new Date(b.endDate)
        return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      })
    const averageBookingDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0

    // Cancellation rate
    const cancelledCount = bookings.filter((b) => b.status === 'CANCELLED').length
    const cancellationRate = totalBookings > 0 ? (cancelledCount / totalBookings) * 100 : 0

    // Top customers
    const customerMap = new Map<string, { name: string; bookings: number; revenue: number }>()
    bookings.forEach((booking) => {
      const customerId = booking.customerId
      const customerName = booking.customer.name || booking.customer.email
      const existing = customerMap.get(customerId) || { name: customerName, bookings: 0, revenue: 0 }
      existing.bookings += 1
      existing.revenue += Number(booking.totalAmount || 0)
      customerMap.set(customerId, existing)
    })

    const topCustomers = Array.from(customerMap.entries())
      .map(([id, data]) => ({
        customerId: id,
        customerName: data.name,
        bookings: data.bookings,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 10)

    // Top equipment
    const equipmentMap = new Map<string, { name: string; bookings: number }>()
    bookings.forEach((booking) => {
      booking.equipment.forEach((be) => {
        const equipmentId = be.equipmentId
        const equipmentName = be.equipment.sku || be.equipment.model || equipmentId
        const existing = equipmentMap.get(equipmentId) || { name: equipmentName, bookings: 0 }
        existing.bookings += 1
        equipmentMap.set(equipmentId, existing)
      })
    })

    const topEquipment = Array.from(equipmentMap.entries())
      .map(([id, data]) => ({
        equipmentId: id,
        equipmentName: data.name,
        bookings: data.bookings,
        utilization: 0, // Would need more complex calculation
      }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 10)

    return {
      period: `${filter.dateFrom.toISOString().split('T')[0]} to ${filter.dateTo.toISOString().split('T')[0]}`,
      totalBookings,
      bookingsByStatus,
      bookingsByPeriod,
      averageBookingDuration,
      cancellationRate,
      topCustomers,
      topEquipment,
    }
  }

  /**
   * Generate equipment report
   */
  static async generateEquipmentReport(
    filter: ReportFilter,
    userId: string
  ): Promise<EquipmentReport> {
    // Check permission
    const canView = await hasPermission(userId, 'reports.read' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view reports')
    }

    const equipment = await prisma.equipment.findMany({
      where: {
        deletedAt: null,
      },
    })

    // Get bookings for each equipment
    const equipmentBookingsMap = new Map<string, any[]>()
    const bookings = await prisma.booking.findMany({
      where: {
        deletedAt: null,
        startDate: { lte: filter.dateTo },
        endDate: { gte: filter.dateFrom },
      },
      include: {
        equipment: {
          include: {
            equipment: true,
          },
        },
      },
    })

    bookings.forEach((booking) => {
      booking.equipment.forEach((be) => {
        const equipmentId = be.equipmentId
        const existing = equipmentBookingsMap.get(equipmentId) || []
        existing.push(booking)
        equipmentBookingsMap.set(equipmentId, existing)
      })
    })

    const totalEquipment = equipment.length
    const availableEquipment = equipment.filter((e) => 
      e.condition !== 'MAINTENANCE' && 
      e.quantityAvailable > 0
    ).length
    const rentedEquipment = equipment.filter((e) => e.quantityAvailable < e.quantityTotal).length
    const maintenanceEquipment = equipment.filter((e) => e.condition === 'MAINTENANCE').length
    const damagedItems = 0 // EquipmentCondition enum doesn't have DAMAGED (it's in InventoryItemStatus)

    // Calculate utilization
    const totalDays = Math.ceil((filter.dateTo.getTime() - filter.dateFrom.getTime()) / (1000 * 60 * 60 * 24))
    const totalAvailableDays = totalEquipment * totalDays
    const totalRentedDays = equipment.reduce((sum, e) => {
      const equipmentBookings = equipmentBookingsMap.get(e.id) || []
      const rentedDays = equipmentBookings.reduce((bookingSum: number, b: any) => {
        const bookingStart = new Date(b.startDate)
        const bookingEnd = new Date(b.endDate)
        const bookingDays = Math.ceil((bookingEnd.getTime() - bookingStart.getTime()) / (1000 * 60 * 60 * 24))
        return bookingSum + bookingDays
      }, 0)
      return sum + rentedDays
    }, 0)

    const utilizationRate = totalAvailableDays > 0 ? (totalRentedDays / totalAvailableDays) * 100 : 0

    // Equipment utilization details
    const equipmentUtilization = equipment.map((e) => {
      const equipmentBookings = equipmentBookingsMap.get(e.id) || []
      const rentedDays = equipmentBookings.reduce((sum: number, b: any) => {
        const bookingStart = new Date(b.startDate)
        const bookingEnd = new Date(b.endDate)
        const bookingDays = Math.ceil((bookingEnd.getTime() - bookingStart.getTime()) / (1000 * 60 * 60 * 24))
        return sum + bookingDays
      }, 0)
      const utilizationRate = totalDays > 0 ? (rentedDays / totalDays) * 100 : 0
      const revenue = equipmentBookings.reduce((sum: number, b: any) => sum + Number(b.totalAmount || 0), 0)

      return {
        equipmentId: e.id,
        equipmentName: e.sku || e.model || e.id,
        totalDays,
        rentedDays,
        utilizationRate,
        revenue,
      }
    })

    // Top performing equipment
    const topPerformingEquipment = equipmentUtilization
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((e) => ({
        equipmentId: e.equipmentId,
        equipmentName: e.equipmentName,
        bookings: equipmentBookingsMap.get(e.equipmentId)?.length || 0,
        revenue: e.revenue,
        utilizationRate: e.utilizationRate,
      }))

    // Maintenance stats (would need maintenance service integration)
    const maintenanceStats = {
      totalMaintenance: 0,
      scheduled: 0,
      inProgress: 0,
      completed: 0,
      averageCost: 0,
    }

    return {
      period: `${filter.dateFrom.toISOString().split('T')[0]} to ${filter.dateTo.toISOString().split('T')[0]}`,
      totalEquipment,
      availableEquipment,
      rentedEquipment,
      maintenanceEquipment,
      utilizationRate,
      equipmentUtilization,
      topPerformingEquipment,
      maintenanceStats,
    }
  }

  /**
   * Generate customer report
   */
  static async generateCustomerReport(
    filter: ReportFilter,
    userId: string
  ): Promise<CustomerReport> {
    // Check permission
    const canView = await hasPermission(userId, 'reports.read' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view reports')
    }

    const customers = await prisma.user.findMany({
      where: {
        role: 'DATA_ENTRY', // Placeholder - adjust based on actual client role
        deletedAt: null,
      },
    })

    // Get bookings for each customer
    const customerBookingsMap = new Map<string, any[]>()
    const customerBookings = await prisma.booking.findMany({
      where: {
        deletedAt: null,
        createdAt: {
          gte: filter.dateFrom,
          lte: filter.dateTo,
        },
      },
    })

    customerBookings.forEach((booking) => {
      const customerId = booking.customerId
      const existing = customerBookingsMap.get(customerId) || []
      existing.push(booking)
      customerBookingsMap.set(customerId, existing)
    })

    const totalCustomers = customers.length
    const activeCustomers = customers.filter((c) => (customerBookingsMap.get(c.id) || []).length > 0).length
    const newCustomers = customers.filter((c) => new Date(c.createdAt) >= filter.dateFrom).length

    // Customers by period
    const periodMap = new Map<string, { newCustomers: number; activeCustomers: number }>()
    customers.forEach((customer) => {
      const month = customer.createdAt.toISOString().substring(0, 7)
      const existing = periodMap.get(month) || { newCustomers: 0, activeCustomers: 0 }
      if (new Date(customer.createdAt) >= filter.dateFrom) {
        existing.newCustomers += 1
      }
      const customerBookings = customerBookingsMap.get(customer.id) || []
      if (customerBookings.length > 0) {
        existing.activeCustomers += 1
      }
      periodMap.set(month, existing)
    })

    const customersByPeriod = Array.from(periodMap.entries())
      .sort()
      .map(([period, data]) => ({
        period,
        newCustomers: data.newCustomers,
        activeCustomers: data.activeCustomers,
      }))

    // Top customers
    const topCustomers = customers
      .map((c) => {
        const bookings = customerBookingsMap.get(c.id) || []
        const revenue = bookings.reduce((sum: number, b: any) => sum + Number(b.totalAmount || 0), 0)
        const averageBookingValue = bookings.length > 0 ? revenue / bookings.length : 0
        const lastBooking = bookings.length > 0
          ? bookings.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
          : null

        return {
          customerId: c.id,
          customerName: c.name || c.email,
          email: c.email,
          bookings: bookings.length,
          revenue,
          averageBookingValue,
          lastBookingDate: lastBooking ? new Date(lastBooking.createdAt) : new Date(0),
        }
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Customer retention
    const returningCustomers = customers.filter((c) => (customerBookingsMap.get(c.id) || []).length > 1).length
    const retentionRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0

    return {
      period: `${filter.dateFrom.toISOString().split('T')[0]} to ${filter.dateTo.toISOString().split('T')[0]}`,
      totalCustomers,
      activeCustomers,
      newCustomers,
      customersByPeriod,
      topCustomers,
      customerRetention: {
        returningCustomers,
        retentionRate,
      },
    }
  }

  /**
   * Generate financial report
   */
  static async generateFinancialReport(
    filter: ReportFilter,
    userId: string
  ): Promise<FinancialReport> {
    // Check permission
    const canView = await hasPermission(userId, 'reports.read' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view reports')
    }

    // Get bookings for revenue
    const bookings = await prisma.booking.findMany({
      where: {
        deletedAt: null,
        createdAt: {
          gte: filter.dateFrom,
          lte: filter.dateTo,
        },
        status: { not: 'CANCELLED' },
      },
    })

    const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0)

    // Revenue by period
    const revenuePeriodMap = new Map<string, number>()
    bookings.forEach((booking) => {
      const month = booking.createdAt.toISOString().substring(0, 7)
      const existing = revenuePeriodMap.get(month) || 0
      revenuePeriodMap.set(month, existing + Number(booking.totalAmount || 0))
    })

    const revenueByPeriod = Array.from(revenuePeriodMap.entries())
      .sort()
      .map(([period, revenue]) => ({
        period,
        revenue,
      }))

    // Expenses (placeholder - would need expenses tracking)
    const expenses = {
      total: 0,
      byCategory: [] as Array<{ category: string; amount: number }>,
    }

    // Profit
    const totalProfit = totalRevenue - expenses.total
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    const profitByPeriod = revenueByPeriod.map((r) => ({
      period: r.period,
      profit: r.revenue, // Would subtract expenses
      margin: r.revenue > 0 ? ((r.revenue - 0) / r.revenue) * 100 : 0,
    }))

    // Payments (placeholder - would need payment service integration)
    const payments = {
      totalReceived: totalRevenue,
      totalPending: 0,
      totalRefunded: 0,
      byMethod: [] as Array<{ method: string; amount: number; count: number }>,
    }

    // Invoices (placeholder - would need invoice service integration)
    const invoices = {
      total: bookings.length,
      paid: bookings.filter((b) => b.status === 'CLOSED' || b.status === 'ACTIVE').length,
      pending: bookings.filter((b) => b.status === 'PAYMENT_PENDING' || b.status === 'CONFIRMED').length,
      overdue: 0,
      totalAmount: totalRevenue,
    }

    // VAT
    const totalVAT = totalRevenue * 0.15
    const vatByPeriod = revenueByPeriod.map((r) => ({
      period: r.period,
      vat: r.revenue * 0.15,
    }))

    return {
      period: `${filter.dateFrom.toISOString().split('T')[0]} to ${filter.dateTo.toISOString().split('T')[0]}`,
      revenue: {
        total: totalRevenue,
        byPeriod: revenueByPeriod,
      },
      expenses,
      profit: {
        total: totalProfit,
        margin: profitMargin,
        byPeriod: profitByPeriod,
      },
      payments,
      invoices,
      vat: {
        total: totalVAT,
        collected: totalVAT,
        byPeriod: vatByPeriod,
      },
    }
  }

  /**
   * Generate inventory report
   */
  static async generateInventoryReport(
    filter: ReportFilter,
    userId: string
  ): Promise<InventoryReport> {
    // Check permission
    const canView = await hasPermission(userId, 'reports.read' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view reports')
    }

    const equipment = await prisma.equipment.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    const totalItems = equipment.reduce((sum, e) => sum + e.quantityTotal, 0)
    const availableItems = equipment.reduce((sum, e) => sum + e.quantityAvailable, 0)
    const rentedItems = totalItems - availableItems
    const maintenanceItems = equipment.filter((e) => e.condition === 'MAINTENANCE').reduce((sum, e) => sum + e.quantityTotal, 0)
    const damagedItems = 0 // EquipmentCondition enum doesn't have DAMAGED

    // Inventory value (placeholder - would need purchase price)
    const inventoryValue = 0

    // By category
    const categoryMap = new Map<string, { name: string; items: number; available: number }>()
    equipment.forEach((e) => {
      const categoryId = e.categoryId
      const categoryName = e.category.name || categoryId
      const existing = categoryMap.get(categoryId) || { name: categoryName, items: 0, available: 0 }
      existing.items += e.quantityTotal
      existing.available += e.quantityAvailable
      categoryMap.set(categoryId, existing)
    })

    const byCategory = Array.from(categoryMap.entries()).map(([id, data]) => ({
      categoryId: id,
      categoryName: data.name,
      items: data.items,
      available: data.available,
      utilization: data.items > 0 ? ((data.items - data.available) / data.items) * 100 : 0,
    }))

    // By condition
    const byCondition = {
      excellent: equipment.filter((e) => e.condition === 'EXCELLENT').reduce((sum, e) => sum + e.quantityTotal, 0),
      good: equipment.filter((e) => e.condition === 'GOOD').reduce((sum, e) => sum + e.quantityTotal, 0),
      fair: equipment.filter((e) => e.condition === 'FAIR').reduce((sum, e) => sum + e.quantityTotal, 0),
      poor: equipment.filter((e) => e.condition === 'POOR').reduce((sum, e) => sum + e.quantityTotal, 0),
      maintenance: equipment.filter((e) => e.condition === 'MAINTENANCE').reduce((sum, e) => sum + e.quantityTotal, 0),
      damaged: damagedItems, // EquipmentCondition enum doesn't have DAMAGED (it's in InventoryItemStatus)
    }

    // Low stock items
    const lowStockItems = equipment
      .filter((e) => e.quantityAvailable < e.quantityTotal * 0.2) // Less than 20% available
      .map((e) => ({
        equipmentId: e.id,
        equipmentName: e.sku || e.model || e.id,
        available: e.quantityAvailable,
        total: e.quantityTotal,
      }))

    return {
      period: `${filter.dateFrom.toISOString().split('T')[0]} to ${filter.dateTo.toISOString().split('T')[0]}`,
      totalItems,
      availableItems,
      rentedItems,
      maintenanceItems,
      damagedItems,
      inventoryValue,
      byCategory,
      byCondition,
      lowStockItems,
    }
  }

  /**
   * Get dashboard statistics
   */
  static async getDashboardStats(userId: string): Promise<DashboardStats> {
    // Check permission
    const canView = await hasPermission(userId, 'reports.read' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view reports')
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisWeek = new Date(today)
    thisWeek.setDate(thisWeek.getDate() - 7)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisYear = new Date(now.getFullYear(), 0, 1)
    const lastYear = new Date(now.getFullYear() - 1, 0, 1)

    // Revenue stats
    const [todayBookings, thisWeekBookings, thisMonthBookings, thisYearBookings, lastMonthBookings] = await Promise.all([
      prisma.booking.findMany({ where: { deletedAt: null, createdAt: { gte: today }, status: { not: 'CANCELLED' } } }),
      prisma.booking.findMany({ where: { deletedAt: null, createdAt: { gte: thisWeek }, status: { not: 'CANCELLED' } } }),
      prisma.booking.findMany({ where: { deletedAt: null, createdAt: { gte: thisMonth }, status: { not: 'CANCELLED' } } }),
      prisma.booking.findMany({ where: { deletedAt: null, createdAt: { gte: thisYear }, status: { not: 'CANCELLED' } } }),
      prisma.booking.findMany({ where: { deletedAt: null, createdAt: { gte: lastMonth, lt: thisMonth }, status: { not: 'CANCELLED' } } }),
    ])

    const revenueToday = todayBookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0)
    const revenueThisWeek = thisWeekBookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0)
    const revenueThisMonth = thisMonthBookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0)
    const revenueThisYear = thisYearBookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0)
    const revenueLastMonth = lastMonthBookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0)
    const revenueGrowth = revenueLastMonth > 0 ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 : 0

    // Booking stats
    const [pendingBookings, activeBookings] = await Promise.all([
      prisma.booking.count({ where: { deletedAt: null, status: { in: ['DRAFT', 'RISK_CHECK', 'PAYMENT_PENDING'] } } }),
      prisma.booking.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
    ])

    const bookingsLastMonth = lastMonthBookings.length
    const bookingsGrowth = bookingsLastMonth > 0 ? ((thisMonthBookings.length - bookingsLastMonth) / bookingsLastMonth) * 100 : 0

    // Equipment stats (rented = rows where quantityAvailable < quantityTotal; Prisma cannot compare two columns in one count)
    const [equipmentList, totalEquipment, availableEquipment, maintenanceEquipment] = await Promise.all([
      prisma.equipment.findMany({ where: { deletedAt: null }, select: { quantityAvailable: true, quantityTotal: true, condition: true } }),
      prisma.equipment.count({ where: { deletedAt: null } }),
      prisma.equipment.count({ where: { deletedAt: null, quantityAvailable: { gt: 0 }, condition: { not: 'MAINTENANCE' } } }),
      prisma.equipment.count({ where: { deletedAt: null, condition: 'MAINTENANCE' } }),
    ])
    const rentedEquipment = equipmentList.filter((e) => e.quantityAvailable < e.quantityTotal).length

    const utilization = totalEquipment > 0 ? ((totalEquipment - availableEquipment) / totalEquipment) * 100 : 0

    // Customer stats
    // Get customer stats (using DATA_ENTRY as placeholder for client role)
    const [totalCustomers, newCustomersThisMonth, newCustomersLastMonth] = await Promise.all([
      prisma.user.count({ where: { role: 'DATA_ENTRY', deletedAt: null } }),
      prisma.user.count({ where: { role: 'DATA_ENTRY', deletedAt: null, createdAt: { gte: thisMonth } } }),
      prisma.user.count({ where: { role: 'DATA_ENTRY', deletedAt: null, createdAt: { gte: lastMonth, lt: thisMonth } } }),
    ])

    // Get active customers (customers with bookings this month)
    const activeCustomersBookings = await prisma.booking.findMany({
      where: {
        deletedAt: null,
        createdAt: { gte: thisMonth },
      },
      select: {
        customerId: true,
      },
      distinct: ['customerId'],
    })
    const activeCustomers = activeCustomersBookings.length

    const customersGrowth = newCustomersLastMonth > 0 ? ((newCustomersThisMonth - newCustomersLastMonth) / newCustomersLastMonth) * 100 : 0

    // Recent activity (placeholder)
    const recentActivity: Array<{ id: string; type: string; description: string; timestamp: Date }> = []

    return {
      revenue: {
        today: revenueToday,
        thisWeek: revenueThisWeek,
        thisMonth: revenueThisMonth,
        thisYear: revenueThisYear,
        growth: revenueGrowth,
      },
      bookings: {
        today: todayBookings.length,
        thisWeek: thisWeekBookings.length,
        thisMonth: thisMonthBookings.length,
        pending: pendingBookings,
        active: activeBookings,
        growth: bookingsGrowth,
      },
      equipment: {
        total: totalEquipment,
        available: availableEquipment,
        rented: rentedEquipment,
        maintenance: maintenanceEquipment,
        utilization,
      },
      customers: {
        total: totalCustomers,
        active: activeCustomers,
        newThisMonth: newCustomersThisMonth,
        growth: customersGrowth,
      },
      recentActivity,
    }
  }
}
