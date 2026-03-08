/**
 * @file page.tsx
 * @description Admin – Payment gateways: toggle (hide/unhide), credentials (.env fallback), order, test.
 * @module app/admin/(routes)/settings/payment-gateways
 */

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { CheckCircle2, XCircle, Loader2, ArrowUp, ArrowDown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface GatewayDef {
  slug: string
  name: string
  credentialKeys: string[]
}

interface GatewayConfig {
  slug: string
  enabled: boolean
  displayName: string | null
  sortOrder: number
  lastCheckedAt: string | null
  lastCheckOk: boolean | null
  credentialSources: Record<string, 'db' | 'env'>
  credentialMask: Record<string, string>
}

interface GatewayRow extends GatewayDef {
  enabled: boolean
  displayName: string | null
  sortOrder: number
  lastCheckedAt: string | null
  lastCheckOk: boolean | null
  credentialSources: Record<string, 'db' | 'env'>
  credentialMask: Record<string, string>
}

const CREDENTIAL_LABELS: Record<string, string> = {
  secretKey: 'Secret key',
  publicKey: 'Public key',
  publishableKey: 'Publishable key',
  webhookSecret: 'Webhook secret',
  apiKey: 'API key',
  apiToken: 'API token',
  notificationToken: 'Notification token',
  profileId: 'Profile ID',
  serverKey: 'Server key',
  entityId: 'Entity ID',
  accessToken: 'Access token',
  apiPassword: 'API password',
}

export default function PaymentGatewaysPage() {
  const [gateways, setGateways] = useState<GatewayRow[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({})
  const [formValues, setFormValues] = useState<Record<string, Record<string, string>>>({})
  const { toast } = useToast()

  const fetchGateways = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/settings/payment-gateways')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setGateways(data.gateways || [])
      const initial: Record<string, Record<string, string>> = {}
      ;(data.gateways || []).forEach((g: GatewayRow) => {
        initial[g.slug] = {}
      })
      setFormValues((prev) => ({ ...initial, ...prev }))
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to load payment gateways',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGateways()
  }, [])

  const updateFormValue = (slug: string, key: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [slug]: { ...(prev[slug] || {}), [key]: value },
    }))
  }

  const handleToggle = async (slug: string, enabled: boolean) => {
    try {
      setSaving((p) => ({ ...p, [slug]: true }))
      const res = await fetch('/api/admin/settings/payment-gateways', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, enabled }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update')
      }
      setGateways((prev) =>
        prev.map((g) => (g.slug === slug ? { ...g, enabled } : g))
      )
      toast({ title: 'Saved', description: enabled ? 'Gateway shown in checkout' : 'Gateway hidden from checkout' })
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to update',
        variant: 'destructive',
      })
    } finally {
      setSaving((p) => ({ ...p, [slug]: false }))
    }
  }

  const handleCheck = async (slug: string) => {
    try {
      setTesting((p) => ({ ...p, [slug]: true }))
      const credentials = formValues[slug]
      const res = await fetch(`/api/admin/settings/payment-gateways/${slug}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials ? { credentials } : {}),
      })
      const data = await res.json()
      setTestResults((p) => ({ ...p, [slug]: { ok: data.ok, message: data.message || '' } }))
      if (data.ok) {
        toast({ title: 'Connection OK', description: data.message })
      } else {
        toast({ title: 'Connection failed', description: data.message, variant: 'destructive' })
      }
      await fetchGateways()
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Check failed',
        variant: 'destructive',
      })
    } finally {
      setTesting((p) => ({ ...p, [slug]: false }))
    }
  }

  const handleSave = async (slug: string) => {
    try {
      setSaving((p) => ({ ...p, [slug]: true }))
      const g = gateways.find((x) => x.slug === slug)
      const credentials = formValues[slug] || {}
      const res = await fetch('/api/admin/settings/payment-gateways', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          credentials: Object.fromEntries(
            Object.entries(credentials).filter(([, v]) => v != null && String(v).trim() !== '')
          ),
          enabled: g?.enabled ?? false,
          displayName: g?.displayName ?? null,
          sortOrder: g?.sortOrder ?? 0,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save')
      }
      toast({ title: 'Saved', description: 'Configuration saved' })
      await fetchGateways()
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to save',
        variant: 'destructive',
      })
    } finally {
      setSaving((p) => ({ ...p, [slug]: false }))
    }
  }

  const moveOrder = async (slug: string, direction: 'up' | 'down') => {
    const idx = gateways.findIndex((g) => g.slug === slug)
    if (idx < 0) return
    const next = direction === 'up' ? idx - 1 : idx + 1
    if (next < 0 || next >= gateways.length) return
    const reordered = [...gateways]
    const [removed] = reordered.splice(idx, 1)
    reordered.splice(next, 0, removed)
    const slugOrder = reordered.map((g) => g.slug)
    try {
      const res = await fetch('/api/admin/settings/payment-gateways', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: slugOrder }),
      })
      if (!res.ok) throw new Error('Failed to reorder')
      setGateways(reordered.map((g, i) => ({ ...g, sortOrder: i })))
      toast({ title: 'Order updated' })
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to reorder', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payment gateways</h1>
        <p className="text-muted-foreground">
          Enable or hide gateways in checkout. Configure credentials (or use .env). Order controls
          display order.
        </p>
      </div>

      <div className="space-y-4">
        {gateways.map((g, index) => (
          <Card key={g.slug}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{g.name}</CardTitle>
                      {g.lastCheckOk != null && (
                        <Badge
                          variant={g.lastCheckOk ? 'default' : 'destructive'}
                          className={g.lastCheckOk ? 'bg-green-600' : ''}
                        >
                          {g.lastCheckOk ? (
                            <CheckCircle2 className="me-1 h-3 w-3" />
                          ) : (
                            <XCircle className="me-1 h-3 w-3" />
                          )}
                          {g.lastCheckOk ? 'OK' : 'Failed'}
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      When disabled, this gateway is hidden from customers at checkout.
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Show in checkout</span>
                  <Switch
                    checked={g.enabled}
                    onCheckedChange={(checked) => handleToggle(g.slug, checked)}
                    disabled={saving[g.slug]}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => moveOrder(g.slug, 'up')}
                  disabled={index === 0}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => moveOrder(g.slug, 'down')}
                  disabled={index === gateways.length - 1}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
              {g.credentialKeys.map((key) => (
                <div key={key} className="space-y-2">
                  <Label>
                    {CREDENTIAL_LABELS[key] || key}
                    {g.credentialMask[key] === '••• from .env' && (
                      <span className="ml-2 text-xs text-muted-foreground">(from .env)</span>
                    )}
                  </Label>
                  {g.credentialMask[key] === '••• from .env' ? (
                    <Input
                      placeholder="••• from .env"
                      disabled
                      className="bg-muted"
                    />
                  ) : (
                    <PasswordInput
                      placeholder={
                        key.toLowerCase().includes('key') || key.toLowerCase().includes('secret')
                          ? 'Leave empty to use value from .env'
                          : ''
                      }
                      value={formValues[g.slug]?.[key] ?? ''}
                      onChange={(e) => updateFormValue(g.slug, key, e.target.value)}
                    />
                  )}
                </div>
              ))}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleCheck(g.slug)}
                  disabled={testing[g.slug]}
                >
                  {testing[g.slug] && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  Test connection
                </Button>
                <Button onClick={() => handleSave(g.slug)} disabled={saving[g.slug]}>
                  {saving[g.slug] && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
              {testResults[g.slug] && (
                <div
                  className={`rounded-md p-3 text-sm ${
                    testResults[g.slug].ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  }`}
                >
                  {testResults[g.slug].message}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
