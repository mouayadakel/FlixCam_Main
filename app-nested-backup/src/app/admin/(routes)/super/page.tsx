/**
 * @file page.tsx
 * @description Super admin console page
 * @module app/admin/(routes)/super
 */

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface HealthCheck {
  service: string
  status: 'healthy' | 'unhealthy' | 'unknown'
  message: string
  details?: Record<string, any>
}

export default function SuperAdminPage() {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [readOnlyMode, setReadOnlyMode] = useState(false)
  const [jobId, setJobId] = useState('')
  const [jobType, setJobType] = useState('')
  const [lockId, setLockId] = useState('')
  const [bookingId, setBookingId] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [reason, setReason] = useState('')
  const [processing, setProcessing] = useState<Record<string, boolean>>({})
  const { toast } = useToast()

  useEffect(() => {
    checkHealth()
    fetchReadOnlyStatus()
  }, [])

  const fetchReadOnlyStatus = async () => {
    try {
      const response = await fetch('/api/admin/read-only')
      if (response.ok) {
        const data = await response.json()
        setReadOnlyMode(data.enabled)
      }
    } catch (error) {
      // Silently fail - not critical
    }
  }

  const checkHealth = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/health')
      if (!response.ok) {
        throw new Error('Failed to check health')
      }
      const data = await response.json()
      setHealthChecks(data.checks || [])
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to check system health',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRerunJob = async () => {
    if (!jobId) {
      toast({
        title: 'Error',
        description: 'Please enter a job ID',
        variant: 'destructive',
      })
      return
    }

    try {
      setProcessing((prev) => ({ ...prev, rerunJob: true }))
      const response = await fetch('/api/admin/jobs/rerun', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, jobType: jobType || undefined }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to rerun job')
      }

      toast({
        title: 'Success',
        description: 'Job queued for rerun',
      })
      setJobId('')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to rerun job',
        variant: 'destructive',
      })
    } finally {
      setProcessing((prev) => ({ ...prev, rerunJob: false }))
    }
  }

  const handleReleaseLock = async () => {
    if (!lockId) {
      toast({
        title: 'Error',
        description: 'Please enter a lock ID',
        variant: 'destructive',
      })
      return
    }

    try {
      setProcessing((prev) => ({ ...prev, releaseLock: true }))
      const response = await fetch('/api/admin/locks/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lockId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to release lock')
      }

      toast({
        title: 'Success',
        description: 'Lock released successfully',
      })
      setLockId('')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to release lock',
        variant: 'destructive',
      })
    } finally {
      setProcessing((prev) => ({ ...prev, releaseLock: false }))
    }
  }

  const handleForceStateTransition = async () => {
    if (!bookingId || !newStatus || !reason) {
      toast({
        title: 'Error',
        description: 'Please fill all fields',
        variant: 'destructive',
      })
      return
    }

    try {
      setProcessing((prev) => ({ ...prev, forceTransition: true }))
      const response = await fetch('/api/admin/bookings/force-transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          newStatus,
          reason,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to force state transition')
      }

      toast({
        title: 'Success',
        description: 'State transition forced successfully',
      })
      setBookingId('')
      setNewStatus('')
      setReason('')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to force state transition',
        variant: 'destructive',
      })
    } finally {
      setProcessing((prev) => ({ ...prev, forceTransition: false }))
    }
  }

  const handleToggleReadOnly = async () => {
    try {
      setProcessing((prev) => ({ ...prev, readOnly: true }))
      const response = await fetch('/api/admin/read-only', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !readOnlyMode }),
      })

      if (!response.ok) {
        throw new Error('Failed to toggle read-only mode')
      }

      const data = await response.json()
      setReadOnlyMode(data.enabled)
      toast({
        title: 'Success',
        description: `Read-only mode ${data.enabled ? 'enabled' : 'disabled'}`,
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to toggle read-only mode',
        variant: 'destructive',
      })
    } finally {
      setProcessing((prev) => ({ ...prev, readOnly: false }))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Super Admin Console</h1>
      </div>

      {/* Health Checks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Health</CardTitle>
              <CardDescription>Monitor system components</CardDescription>
            </div>
            <Button onClick={checkHealth} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {healthChecks.map((check) => (
                <div
                  key={check.service}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-3">
                    {check.status === 'healthy' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <div className="font-medium">{check.service}</div>
                      <div className="text-sm text-muted-foreground">{check.message}</div>
                    </div>
                  </div>
                  <Badge variant={check.status === 'healthy' ? 'default' : 'destructive'}>
                    {check.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Read-Only Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Read-Only Mode</CardTitle>
          <CardDescription>Enable read-only mode to prevent all write operations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Status</div>
              <div className="text-sm text-muted-foreground">
                {readOnlyMode ? 'System is in read-only mode' : 'System is in normal mode'}
              </div>
            </div>
            <Button
              onClick={handleToggleReadOnly}
              disabled={processing.readOnly}
              variant={readOnlyMode ? 'destructive' : 'default'}
            >
              {processing.readOnly && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {readOnlyMode ? 'Disable Read-Only' : 'Enable Read-Only'}
            </Button>
          </div>
          {readOnlyMode && (
            <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-600" />
              <div className="text-sm text-yellow-800">
                <strong>Warning:</strong> Read-only mode is enabled. All write operations are
                blocked.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Re-run Job */}
      <Card>
        <CardHeader>
          <CardTitle>Re-run Job</CardTitle>
          <CardDescription>Manually trigger a job to run again</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="job-id">Job ID</Label>
            <Input
              id="job-id"
              placeholder="Enter job ID"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="job-type">Job Type (Optional)</Label>
            <Input
              id="job-type"
              placeholder="e.g., release-expired-locks, process-pending-events"
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">Leave empty for generic job rerun</p>
          </div>
          <Button onClick={handleRerunJob} disabled={processing.rerunJob || !jobId}>
            {processing.rerunJob && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            Re-run Job
          </Button>
        </CardContent>
      </Card>

      {/* Release Soft Lock */}
      <Card>
        <CardHeader>
          <CardTitle>Release Soft Lock</CardTitle>
          <CardDescription>Manually release a soft lock on a resource</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lock-id">Lock ID</Label>
            <Input
              id="lock-id"
              placeholder="Enter lock ID"
              value={lockId}
              onChange={(e) => setLockId(e.target.value)}
            />
          </div>
          <Button onClick={handleReleaseLock} disabled={processing.releaseLock || !lockId}>
            {processing.releaseLock && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            Release Lock
          </Button>
        </CardContent>
      </Card>

      {/* Force State Transition */}
      <Card>
        <CardHeader>
          <CardTitle>Force State Transition</CardTitle>
          <CardDescription>Manually force a booking to transition to a new state</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="booking-id">Booking ID</Label>
            <Input
              id="booking-id"
              placeholder="Enter booking ID"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-status">New Status</Label>
            <Input
              id="new-status"
              placeholder="e.g., CONFIRMED, CANCELLED"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Required)</Label>
            <Textarea
              id="reason"
              placeholder="Explain why this transition is being forced..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <Button
            onClick={handleForceStateTransition}
            disabled={processing.forceTransition || !bookingId || !newStatus || !reason}
            variant="destructive"
          >
            {processing.forceTransition && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            Force Transition
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
