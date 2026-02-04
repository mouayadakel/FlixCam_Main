/**
 * @file dashboard/stats/route.ts
 * @description Dashboard statistics API endpoint
 * @module api/dashboard/stats
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  try {
    // Get current date info
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Parallel queries for better performance
    const [
      totalBookings,
      activeBookings,
      totalEquipment,
      availableEquipment,
      totalClients,
      newClientsThisMonth,
      successPayments,
      pendingPayments,
    ] = await Promise.all([
      // Total bookings
      prisma.booking.count(),
      
      // Active bookings (CONFIRMED or ACTIVE status)
      prisma.booking.count({
        where: {
          status: {
            in: ['CONFIRMED', 'ACTIVE'],
          },
        },
      }),
      
      // Total products
      prisma.product.count({
        where: { status: 'ACTIVE' },
      }),
      
      // Available products (simplified count)
      prisma.product.count({
        where: { status: 'ACTIVE' },
      }),
      
      // Total clients (all users - adjust based on your needs)
      prisma.user.count(),
      
      // New clients this month
      prisma.user.count({
        where: {
          createdAt: {
            gte: startOfMonth,
          },
        },
      }),
      
      // Successful payments total
      prisma.payment.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amount: true },
      }),
      
      // Pending payments total
      prisma.payment.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
      }),
    ])

    const totalRevenue = Number(successPayments._sum.amount || 0)
    const pendingPaymentsAmount = Number(pendingPayments._sum.amount || 0)

    return NextResponse.json({
      totalBookings,
      activeBookings,
      totalRevenue,
      pendingPayments: pendingPaymentsAmount,
      totalEquipment,
      availableEquipment,
      totalClients,
      newClientsThisMonth,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
