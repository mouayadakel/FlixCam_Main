/**
 * @file reports.types.ts
 * @description TypeScript types for reports and analytics
 * @module lib/types
 * @author Engineering Team
 * @created 2026-01-28
 */

export type ReportType = 'revenue' | 'bookings' | 'equipment' | 'customers' | 'financial' | 'inventory'
export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'

export interface ReportFilter {
  dateFrom: Date
  dateTo: Date
  period?: ReportPeriod
  equipmentIds?: string[]
  customerIds?: string[]
  bookingStatuses?: string[]
  includeCancelled?: boolean
}

export interface RevenueReport {
  period: string
  totalRevenue: number
  totalBookings: number
  averageBookingValue: number
  revenueByStatus: {
    confirmed: number
    active: number
    completed: number
    cancelled: number
  }
  revenueByEquipment: Array<{
    equipmentId: string
    equipmentName: string
    revenue: number
    bookings: number
  }>
  revenueByCustomer: Array<{
    customerId: string
    customerName: string
    revenue: number
    bookings: number
  }>
  revenueByPeriod: Array<{
    period: string
    revenue: number
    bookings: number
  }>
  vatAmount: number
  netRevenue: number
}

export interface BookingReport {
  period: string
  totalBookings: number
  bookingsByStatus: {
    draft: number
    confirmed: number
    active: number
    returned: number
    closed: number
    cancelled: number
  }
  bookingsByPeriod: Array<{
    period: string
    count: number
    revenue: number
  }>
  averageBookingDuration: number
  cancellationRate: number
  topCustomers: Array<{
    customerId: string
    customerName: string
    bookings: number
    revenue: number
  }>
  topEquipment: Array<{
    equipmentId: string
    equipmentName: string
    bookings: number
    utilization: number
  }>
}

export interface EquipmentReport {
  period: string
  totalEquipment: number
  availableEquipment: number
  rentedEquipment: number
  maintenanceEquipment: number
  utilizationRate: number
  equipmentUtilization: Array<{
    equipmentId: string
    equipmentName: string
    totalDays: number
    rentedDays: number
    utilizationRate: number
    revenue: number
  }>
  topPerformingEquipment: Array<{
    equipmentId: string
    equipmentName: string
    bookings: number
    revenue: number
    utilizationRate: number
  }>
  maintenanceStats: {
    totalMaintenance: number
    scheduled: number
    inProgress: number
    completed: number
    averageCost: number
  }
}

export interface CustomerReport {
  period: string
  totalCustomers: number
  activeCustomers: number
  newCustomers: number
  customersByPeriod: Array<{
    period: string
    newCustomers: number
    activeCustomers: number
  }>
  topCustomers: Array<{
    customerId: string
    customerName: string
    email: string
    bookings: number
    revenue: number
    averageBookingValue: number
    lastBookingDate: Date
  }>
  customerRetention: {
    returningCustomers: number
    retentionRate: number
  }
}

export interface FinancialReport {
  period: string
  revenue: {
    total: number
    byPeriod: Array<{
      period: string
      revenue: number
    }>
  }
  expenses: {
    total: number
    byCategory: Array<{
      category: string
      amount: number
    }>
  }
  profit: {
    total: number
    margin: number
    byPeriod: Array<{
      period: string
      profit: number
      margin: number
    }>
  }
  payments: {
    totalReceived: number
    totalPending: number
    totalRefunded: number
    byMethod: Array<{
      method: string
      amount: number
      count: number
    }>
  }
  invoices: {
    total: number
    paid: number
    pending: number
    overdue: number
    totalAmount: number
  }
  vat: {
    total: number
    collected: number
    byPeriod: Array<{
      period: string
      vat: number
    }>
  }
}

export interface InventoryReport {
  period: string
  totalItems: number
  availableItems: number
  rentedItems: number
  maintenanceItems: number
  damagedItems: number
  inventoryValue: number
  byCategory: Array<{
    categoryId: string
    categoryName: string
    items: number
    available: number
    utilization: number
  }>
  byCondition: {
    excellent: number
    good: number
    fair: number
    poor: number
    maintenance: number
    damaged: number
  }
  lowStockItems: Array<{
    equipmentId: string
    equipmentName: string
    available: number
    total: number
  }>
}

export interface DashboardStats {
  revenue: {
    today: number
    thisWeek: number
    thisMonth: number
    thisYear: number
    growth: number
  }
  bookings: {
    today: number
    thisWeek: number
    thisMonth: number
    pending: number
    active: number
    growth: number
  }
  equipment: {
    total: number
    available: number
    rented: number
    maintenance: number
    utilization: number
  }
  customers: {
    total: number
    active: number
    newThisMonth: number
    growth: number
  }
  recentActivity: Array<{
    id: string
    type: string
    description: string
    timestamp: Date
  }>
}
