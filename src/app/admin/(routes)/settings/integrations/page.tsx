/**
 * @file page.tsx
 * @description Integrations settings page - functional
 * @module app/admin/(routes)/settings/integrations
 */

'use client'

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface IntegrationConfig {
  type: 'payments' | 'email' | 'whatsapp' | 'analytics' | 'webhooks'
  enabled: boolean
  configured: boolean
  config: Record<string, any>
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({})
  const [configValues, setConfigValues] = useState<Record<string, Record<string, string>>>({})
  const { toast } = useToast()

  useEffect(() => {
    fetchIntegrations()
  }, [])

  const fetchIntegrations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/integrations')
      if (!response.ok) {
        throw new Error('Failed to fetch integrations')
      }
      const data = await response.json()
      setIntegrations(data.integrations || [])
      
      // Initialize config values from fetched integrations
      const initialConfig: Record<string, Record<string, string>> = {}
      data.integrations?.forEach((integration: IntegrationConfig) => {
        initialConfig[integration.type] = { ...integration.config }
      })
      setConfigValues(initialConfig)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load integrations',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveConfig = async (type: string) => {
    try {
      setSaving((prev) => ({ ...prev, [type]: true }))
      const config = configValues[type] || {}
      const integration = getIntegration(type)
      
      const response = await fetch(`/api/integrations/${type}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config,
          enabled: integration?.enabled ?? true,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save configuration')
      }

      toast({
        title: 'Success',
        description: 'Configuration saved successfully',
      })

      // Refresh integrations
      await fetchIntegrations()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save configuration',
        variant: 'destructive',
      })
    } finally {
      setSaving((prev) => ({ ...prev, [type]: false }))
    }
  }

  const updateConfigValue = (type: string, key: string, value: string) => {
    setConfigValues((prev) => ({
      ...prev,
      [type]: {
        ...(prev[type] || {}),
        [key]: value,
      },
    }))
  }

  const handleTestConnection = async (type: string) => {
    try {
      setTesting((prev) => ({ ...prev, [type]: true }))
      const response = await fetch(`/api/integrations/${type}/test`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to test connection')
      }

      const result = await response.json()
      setTestResults((prev) => ({ ...prev, [type]: result }))

      toast({
        title: result.success ? 'Success' : 'Failed',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to test connection',
        variant: 'destructive',
      })
    } finally {
      setTesting((prev) => ({ ...prev, [type]: false }))
    }
  }

  const getIntegration = (type: string) => {
    return integrations.find((i) => i.type === type)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
      </div>

      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="webhooks">API/Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tap Payments</CardTitle>
                  <CardDescription>Configure Tap Payments integration</CardDescription>
                </div>
                {getIntegration('payments')?.configured ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Connected
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    <XCircle className="mr-1 h-3 w-3" />
                    Not Configured
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!getIntegration('payments')?.configured && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> Tap Payments is not configured. Configure via environment variables or save configuration below.
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="tap-secret">Secret Key</Label>
                <Input
                  id="tap-secret"
                  type="password"
                  placeholder="sk_test_..."
                  value={configValues.payments?.secretKey || getIntegration('payments')?.config.secretKey || ''}
                  onChange={(e) => updateConfigValue('payments', 'secretKey', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Enter your Tap Payments secret key (will be encrypted)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tap-public">Public Key</Label>
                <Input
                  id="tap-public"
                  placeholder="pk_test_..."
                  value={configValues.payments?.publicKey || getIntegration('payments')?.config.publicKey || ''}
                  onChange={(e) => updateConfigValue('payments', 'publicKey', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Enter your Tap Payments public key
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleTestConnection('payments')}
                  disabled={testing.payments || !getIntegration('payments')?.configured}
                >
                  {testing.payments && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Test Connection
                </Button>
                <Button
                  onClick={() => handleSaveConfig('payments')}
                  disabled={saving.payments}
                >
                  {saving.payments && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Configuration
                </Button>
              </div>
              {testResults.payments && (
                <div className={`p-3 rounded-md ${testResults.payments.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  {testResults.payments.message}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email Configuration</CardTitle>
                  <CardDescription>Configure SMTP settings</CardDescription>
                </div>
                {getIntegration('email')?.configured ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Configured
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    <XCircle className="mr-1 h-3 w-3" />
                    Not Configured
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!getIntegration('email')?.configured && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> Email is not configured. Configure SMTP settings below.
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="smtp-host">SMTP Host</Label>
                <Input
                  id="smtp-host"
                  placeholder="smtp.gmail.com"
                  value={configValues.email?.host || getIntegration('email')?.config.host || ''}
                  onChange={(e) => updateConfigValue('email', 'host', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  SMTP server hostname
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-user">SMTP User</Label>
                <Input
                  id="smtp-user"
                  placeholder="your-email@gmail.com"
                  value={configValues.email?.user || getIntegration('email')?.config.user || ''}
                  onChange={(e) => updateConfigValue('email', 'user', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  SMTP username/email
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-password">SMTP Password</Label>
                <Input
                  id="smtp-password"
                  type="password"
                  placeholder="Your SMTP password"
                  value={configValues.email?.password || ''}
                  onChange={(e) => updateConfigValue('email', 'password', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  SMTP password (will be encrypted)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-port">SMTP Port</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  placeholder="587"
                  value={configValues.email?.port || getIntegration('email')?.config.port || '587'}
                  onChange={(e) => updateConfigValue('email', 'port', e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleTestConnection('email')}
                  disabled={testing.email || !getIntegration('email')?.configured}
                >
                  {testing.email && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Test Connection
                </Button>
                <Button
                  onClick={() => handleSaveConfig('email')}
                  disabled={saving.email}
                >
                  {saving.email && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Configuration
                </Button>
              </div>
              {testResults.email && (
                <div className={`p-3 rounded-md ${testResults.email.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  {testResults.email.message}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>WhatsApp Integration</CardTitle>
                  <CardDescription>Configure WhatsApp Cloud API</CardDescription>
                </div>
                {getIntegration('whatsapp')?.configured ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Configured
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    <XCircle className="mr-1 h-3 w-3" />
                    Not Configured
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!getIntegration('whatsapp')?.configured && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> WhatsApp is not configured. Enter your API key below.
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="whatsapp-api-key">API Key</Label>
                <Input
                  id="whatsapp-api-key"
                  type="password"
                  placeholder="Your WhatsApp API key"
                  value={configValues.whatsapp?.apiKey || getIntegration('whatsapp')?.config.apiKey || ''}
                  onChange={(e) => updateConfigValue('whatsapp', 'apiKey', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Enter your WhatsApp Cloud API key (will be encrypted)
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleTestConnection('whatsapp')}
                  disabled={testing.whatsapp || !getIntegration('whatsapp')?.configured}
                >
                  {testing.whatsapp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Test Connection
                </Button>
                <Button
                  onClick={() => handleSaveConfig('whatsapp')}
                  disabled={saving.whatsapp}
                >
                  {saving.whatsapp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Configuration
                </Button>
              </div>
              {testResults.whatsapp && (
                <div className={`p-3 rounded-md ${testResults.whatsapp.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  {testResults.whatsapp.message}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Analytics</CardTitle>
                  <CardDescription>Configure analytics tracking</CardDescription>
                </div>
                {getIntegration('analytics')?.configured ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Configured
                  </Badge>
                ) : (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    <XCircle className="mr-1 h-3 w-3" />
                    Not Configured
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!getIntegration('analytics')?.configured && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> Analytics is not configured. Configure at least one tracking service below.
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Google Tag Manager Container ID</Label>
                <Input
                  placeholder="GTM-XXXXXXX"
                  value={configValues.analytics?.gtmContainerId || getIntegration('analytics')?.config.gtmContainerId || ''}
                  onChange={(e) => updateConfigValue('analytics', 'gtmContainerId', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Enter your GTM container ID
                </p>
              </div>
              <div className="space-y-2">
                <Label>Google Analytics 4 Measurement ID</Label>
                <Input
                  placeholder="G-XXXXXXXXXX"
                  value={configValues.analytics?.ga4MeasurementId || getIntegration('analytics')?.config.ga4MeasurementId || ''}
                  onChange={(e) => updateConfigValue('analytics', 'ga4MeasurementId', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Enter your GA4 measurement ID
                </p>
              </div>
              <div className="space-y-2">
                <Label>Meta Pixel ID</Label>
                <Input
                  placeholder="123456789012345"
                  value={configValues.analytics?.metaPixelId || getIntegration('analytics')?.config.metaPixelId || ''}
                  onChange={(e) => updateConfigValue('analytics', 'metaPixelId', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Enter your Meta Pixel ID
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleTestConnection('analytics')}
                  disabled={testing.analytics}
                >
                  {testing.analytics && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Test Configuration
                </Button>
                <Button
                  onClick={() => handleSaveConfig('analytics')}
                  disabled={saving.analytics}
                >
                  {saving.analytics && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Configuration
                </Button>
              </div>
              {testResults.analytics && (
                <div className={`p-3 rounded-md ${testResults.analytics.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  {testResults.analytics.message}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>API & Webhooks</CardTitle>
                  <CardDescription>Webhook endpoints and API configuration</CardDescription>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook Endpoints</Label>
                <div className="p-3 bg-muted rounded-md">
                  <code className="text-sm">
                    POST /api/webhooks/tap
                  </code>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleTestConnection('webhooks')}
                  disabled={testing.webhooks}
                >
                  {testing.webhooks && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Test Endpoint
                </Button>
              </div>
              {testResults.webhooks && (
                <div className={`p-3 rounded-md ${testResults.webhooks.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  {testResults.webhooks.message}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
