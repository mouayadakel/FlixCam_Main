/**
 * Warehouse dashboard — today's dispatch and return queue.
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ScanLine, Package, ArrowRight } from 'lucide-react'

export default async function WarehouseDashboardPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/warehouse')
  }

  const userRole = (session.user as { role?: string }).role
  if (!userRole || !['ADMIN', 'WAREHOUSE_MANAGER'].includes(userRole)) {
    redirect('/portal')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 2)

  const toDispatch = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      startDate: { gte: today, lte: tomorrow },
      deletedAt: null,
    },
    include: {
      customer: { select: { name: true, phone: true } },
      equipment: {
        where: { deletedAt: null, itemStatus: 'PENDING' },
        include: { equipment: { select: { model: true, sku: true } } },
      },
    },
    orderBy: { startDate: 'asc' },
    take: 50,
  })

  const toReceive = await prisma.booking.findMany({
    where: {
      status: { in: ['ACTIVE'] },
      endDate: { gte: today, lte: tomorrow },
      deletedAt: null,
    },
    include: {
      customer: { select: { name: true, phone: true } },
      equipment: {
        where: { deletedAt: null, itemStatus: 'DISPATCHED' },
        include: { equipment: { select: { model: true, sku: true } } },
      },
    },
    orderBy: { endDate: 'asc' },
    take: 50,
  })

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Warehouse Dashboard</h1>
        <Link href="/warehouse/scan">
          <Button>
            <ScanLine className="me-2 h-4 w-4" />
            Scan Equipment
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* To Dispatch */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              To Dispatch Today ({toDispatch.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {toDispatch.length === 0 && (
              <p className="text-sm text-muted-foreground">No dispatches pending.</p>
            )}
            {toDispatch.map((booking) => (
              <div key={booking.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">#{booking.bookingNumber}</p>
                    <p className="text-sm text-gray-600">{booking.customer.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(booking.startDate).toLocaleDateString()} — {new Date(booking.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary">{booking.equipment.length} items</Badge>
                </div>
                <div className="mt-2 space-y-1">
                  {booking.equipment.map((be) => (
                    <p key={be.id} className="text-xs text-gray-500">
                      {be.equipment.model || be.equipment.sku} x{be.quantity}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* To Receive */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5 text-green-500" />
              To Receive Today ({toReceive.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {toReceive.length === 0 && (
              <p className="text-sm text-muted-foreground">No returns expected.</p>
            )}
            {toReceive.map((booking) => (
              <div key={booking.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">#{booking.bookingNumber}</p>
                    <p className="text-sm text-gray-600">{booking.customer.name}</p>
                    <p className="text-xs text-gray-400">
                      Due: {new Date(booking.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline">{booking.equipment.length} items</Badge>
                </div>
                <div className="mt-2 space-y-1">
                  {booking.equipment.map((be) => (
                    <p key={be.id} className="text-xs text-gray-500">
                      {be.equipment.model || be.equipment.sku} x{be.quantity}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
