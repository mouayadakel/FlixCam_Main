'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShieldBan, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils/format.utils'

interface BlacklistedClient {
  id: string
  email: string
  name: string | null
  phone: string | null
  blacklistReason: string | null
  blacklistedAt: string | null
}

export default function ClientBlacklistPage() {
  const [rows, setRows] = useState<BlacklistedClient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/clients/blacklist')
      .then((res) => res.json())
      .then((data) => setRows(data.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <ShieldBan className="h-8 w-8" />
          قائمة الحظر
        </h1>
        <Button variant="outline" asChild>
          <Link href="/admin/clients">
            <ArrowRight className="ms-2 h-4 w-4" />
            العودة للعملاء
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>العملاء المحظورون</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">لا يوجد عملاء محظورون</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العميل</TableHead>
                  <TableHead>السبب</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{row.name || row.email}</p>
                        <p className="text-sm text-muted-foreground">{row.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">{row.blacklistReason || '—'}</Badge>
                    </TableCell>
                    <TableCell>
                      {row.blacklistedAt ? formatDate(row.blacklistedAt) : '—'}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/clients/${row.id}`}>عرض</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
