'use client'

/**
 * Admin chat conversation viewer (FIX-039).
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageSquare, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDateTime } from '@/lib/utils/format.utils'

type ConversationRow = {
  id: string
  sessionId: string
  channel: string
  handoverAt: string | null
  updatedAt: string
  lastMessage: { role: string; content: string; createdAt: string } | null
}

export default function SupportConversationsPage() {
  const [rows, setRows] = useState<ConversationRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/support/conversations?take=100')
      .then((r) => r.json())
      .then((json) => setRows(json.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <MessageSquare className="h-7 w-7" />
            سجل محادثات الدعم
          </h1>
          <p className="text-sm text-muted-foreground">محادثات المساعد الذكي العامة والتحويل للبشر</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/settings/chatbot">إعدادات المساعد</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>آخر المحادثات</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>القناة</TableHead>
                  <TableHead>آخر رسالة</TableHead>
                  <TableHead>تحويل بشري</TableHead>
                  <TableHead>التحديث</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Badge variant="outline">{row.channel}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate text-sm">
                      {row.lastMessage
                        ? `${row.lastMessage.role}: ${row.lastMessage.content}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {row.handoverAt ? (
                        <Badge variant="destructive">نعم</Badge>
                      ) : (
                        <Badge variant="secondary">لا</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{formatDateTime(row.updatedAt)}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      لا توجد محادثات مسجلة بعد
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
