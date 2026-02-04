/**
 * @file quick-actions.tsx
 * @description Quick actions component
 * @module components/admin
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Calendar, Package } from 'lucide-react'
import Link from 'next/link'

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          <Button asChild>
            <Link href="/admin/inventory/equipment/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Equipment
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/bookings">
              <Calendar className="mr-2 h-4 w-4" />
              View Bookings
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/inventory">
              <Package className="mr-2 h-4 w-4" />
              Manage Inventory
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
