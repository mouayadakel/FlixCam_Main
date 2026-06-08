'use client'

/**
 * Phase 10c — Compliance ops: WhatsApp opt-in, PDPL, credential rotation reminders.
 */

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ComplianceDashboard {
  whatsappOptIn: { optedIn: number; total: number; rate: number }
  pdplArchiveDir: string
  credentialRotation: { dueForReview: boolean; lastReminder: string | null }
  openSecurityTickets: number
}

export default function AdminCompliancePage() {
  const [data, setData] = useState<ComplianceDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/compliance', { cache: 'no-store' })
      if (!res.ok) throw new Error(await res.text())
      setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-6 p-6" dir="ltr">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compliance & Trust</h1>
          <p className="text-sm text-muted-foreground">WhatsApp opt-in, PDPL archives, security tickets</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {data && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">WhatsApp opt-in</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {data.whatsappOptIn.optedIn} / {data.whatsappOptIn.total}
              </p>
              <p className="text-sm text-muted-foreground">
                {data.whatsappOptIn.rate.toFixed(1)}% of customers with phone
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">PDPL archive</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-sm">{data.pdplArchiveDir}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Credential rotation</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{data.credentialRotation.dueForReview ? 'Review due' : 'Up to date'}</p>
              {data.credentialRotation.lastReminder && (
                <p className="text-xs text-muted-foreground">
                  Last reminder: {new Date(data.credentialRotation.lastReminder).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Open security tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{data.openSecurityTickets}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
