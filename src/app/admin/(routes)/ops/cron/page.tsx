'use client'

/**
 * Admin — Cron & scheduled jobs observability (Phase 5c).
 */

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Play, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface CronJobRow {
  slug: string
  label: string
  tier: number
  intervalMinutes: number
  lastRunAt: string | null
  lastStatus: string
  lastDurationMs: number | null
  lastError: string | null
}

interface HistoryDay {
  date: string
  ok: number
  failed: number
}

interface CronDashboard {
  jobs: CronJobRow[]
  summary: { total: number; ok: number; failed: number; stale: number; never: number }
  reconciliationMismatches: Array<{ id: string; resourceId: string | null; timestamp: string }>
  payoutsReady: Array<{ id: string; resourceId: string | null; timestamp: string }>
  notificationQueue: { mode: string; pending: number }
  history?: HistoryDay[]
}

function statusBadge(status: string) {
  if (status === 'ok') return <Badge className="bg-green-600">OK</Badge>
  if (status === 'failed') return <Badge variant="destructive">Failed</Badge>
  if (status === 'stale') return <Badge variant="secondary">Stale</Badge>
  return <Badge variant="outline">Never</Badge>
}

export default function AdminCronPage() {
  const [data, setData] = useState<CronDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/cron', { cache: 'no-store' })
      if (!res.ok) throw new Error(await res.text())
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function triggerJob(slug: string) {
    setTriggering(slug)
    try {
      const res = await fetch(`/api/admin/cron/trigger/${slug}`, { method: 'POST' })
      if (!res.ok) throw new Error(await res.text())
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Trigger failed')
    } finally {
      setTriggering(null)
    }
  }

  return (
    <div className="space-y-6 p-6" dir="ltr">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cron & Scheduled Jobs</h1>
          <p className="text-sm text-muted-foreground">
            Job health, payment reconciliation, and manual triggers
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">OK</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-2xl font-bold text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                {data.summary.ok}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Failed</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold text-destructive">
                {data.summary.failed}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Stale</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{data.summary.stale}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Queue</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <span className="font-mono">{data.notificationQueue.mode}</span>
                <span className="ml-2 text-muted-foreground">
                  pending: {data.notificationQueue.pending}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Recon mismatches</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">
                {data.reconciliationMismatches.length}
              </CardContent>
            </Card>
          </div>

          {data.history && data.history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>7-day cron runs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-32 items-end gap-2">
                  {data.history.map((day) => {
                    const max = Math.max(1, ...data.history!.map((d) => d.ok + d.failed))
                    const okH = (day.ok / max) * 100
                    const failH = (day.failed / max) * 100
                    return (
                      <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                        <div className="flex w-full flex-1 items-end gap-0.5">
                          <div
                            className="flex-1 rounded-t bg-green-500"
                            style={{ height: `${okH}%`, minHeight: day.ok ? 4 : 0 }}
                            title={`${day.ok} ok`}
                          />
                          <div
                            className="flex-1 rounded-t bg-red-500"
                            style={{ height: `${failH}%`, minHeight: day.failed ? 4 : 0 }}
                            title={`${day.failed} failed`}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {day.date.slice(5)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Jobs</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-2">Job</th>
                    <th className="p-2">Tier</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Last run</th>
                    <th className="p-2">Duration</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {data.jobs.map((job) => (
                    <tr key={job.slug} className="border-b">
                      <td className="p-2">
                        <div className="font-medium">{job.label}</div>
                        <div className="font-mono text-xs text-muted-foreground">{job.slug}</div>
                      </td>
                      <td className="p-2">T{job.tier}</td>
                      <td className="p-2">{statusBadge(job.lastStatus)}</td>
                      <td className="p-2">
                        {job.lastRunAt ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(job.lastRunAt).toLocaleString()}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-2">
                        {job.lastDurationMs != null ? `${job.lastDurationMs}ms` : '—'}
                      </td>
                      <td className="p-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={triggering === job.slug}
                          onClick={() => void triggerJob(job.slug)}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
