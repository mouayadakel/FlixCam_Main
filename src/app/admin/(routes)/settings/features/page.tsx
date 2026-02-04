/**
 * @file page.tsx
 * @description Feature flags page - functional with database
 * @module app/admin/(routes)/settings/features
 */

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, Loader2, History } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { FeatureFlagScope } from '@prisma/client'
import { ApprovalRequestDialog } from '@/components/admin/approval-request-dialog'
import { AuditTrailViewer } from '@/components/admin/audit-trail-viewer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface FeatureFlag {
  id: string
  name: string
  description: string | null
  enabled: boolean
  scope: FeatureFlagScope
  requiresApproval: boolean
}

const scopeLabels: Record<FeatureFlagScope, string> = {
  MODULE: 'Module',
  UI: 'UI',
  INTEGRATION: 'Integration',
  JOB: 'Job',
  EMERGENCY: 'Emergency',
}

export default function FeaturesPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [filteredFlags, setFilteredFlags] = useState<FeatureFlag[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<Record<string, boolean>>({})
  const [approvalDialog, setApprovalDialog] = useState<{
    open: boolean
    flagId: string
    flagName: string
    currentState: boolean
  } | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchFlags()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = flags.filter(
        (flag) =>
          flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          flag.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredFlags(filtered)
    } else {
      setFilteredFlags(flags)
    }
  }, [searchQuery, flags])

  const fetchFlags = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/feature-flags')
      if (!response.ok) {
        throw new Error('Failed to fetch feature flags')
      }
      const data = await response.json()
      setFlags(data.flags || [])
      setFilteredFlags(data.flags || [])
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load feature flags',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (flag: FeatureFlag) => {
    if (flag.requiresApproval) {
      // Show approval request dialog
      setApprovalDialog({
        open: true,
        flagId: flag.id,
        flagName: flag.name,
        currentState: flag.enabled,
      })
      return
    }

    try {
      setToggling((prev) => ({ ...prev, [flag.id]: true }))
      const response = await fetch(`/api/feature-flags/${flag.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: !flag.enabled,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update feature flag')
      }

      const data = await response.json()
      setFlags((prev) =>
        prev.map((f) => (f.id === flag.id ? data.flag : f))
      )

      // Invalidate cache (client-side revalidation)
      await fetch('/api/feature-flags', { cache: 'no-store' })

      toast({
        title: 'Success',
        description: `Feature flag "${flag.name}" ${data.flag.enabled ? 'enabled' : 'disabled'}`,
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to toggle feature flag',
        variant: 'destructive',
      })
    } finally {
      setToggling((prev) => ({ ...prev, [flag.id]: false }))
    }
  }

  const groupedFlags = filteredFlags.reduce((acc, flag) => {
    if (!acc[flag.scope]) {
      acc[flag.scope] = []
    }
    acc[flag.scope].push(flag)
    return acc
  }, {} as Record<FeatureFlagScope, FeatureFlag[]>)

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
        <h1 className="text-3xl font-bold">Feature Controls</h1>
        </div>

      <Tabs defaultValue="flags" className="space-y-4">
        <TabsList>
          <TabsTrigger value="flags">Feature Flags</TabsTrigger>
          <TabsTrigger value="audit">
            <History className="mr-2 h-4 w-4" />
            Audit Trail
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flags" className="space-y-6">

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search features..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="space-y-6">
        {Object.entries(groupedFlags).map(([scope, scopeFlags]) => (
          <div key={scope}>
            <h2 className="text-lg font-semibold mb-3">
              {scopeLabels[scope as FeatureFlagScope]} ({scopeFlags.length})
            </h2>
            <div className="space-y-4">
              {scopeFlags.map((flag) => (
                <Card key={flag.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{flag.name}</CardTitle>
                        <CardDescription>
                          {flag.description || 'No description'}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{scopeLabels[flag.scope]}</Badge>
                        {flag.requiresApproval && (
                          <Badge variant="secondary">Requires Approval</Badge>
                        )}
                        <div className="flex items-center gap-2">
                          {toggling[flag.id] && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                          <Switch
                            checked={flag.enabled}
                            onCheckedChange={() => handleToggle(flag)}
                            disabled={toggling[flag.id] || flag.requiresApproval}
                          />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {filteredFlags.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {searchQuery ? 'No feature flags match your search' : 'No feature flags found'}
            </CardContent>
          </Card>
        )}
      </div>
        </TabsContent>

        <TabsContent value="audit">
          <AuditTrailViewer resourceType="feature_flag" />
        </TabsContent>
      </Tabs>

      {approvalDialog && (
        <ApprovalRequestDialog
          open={approvalDialog.open}
          onOpenChange={(open) =>
            setApprovalDialog(open ? approvalDialog : null)
          }
          flagId={approvalDialog.flagId}
          flagName={approvalDialog.flagName}
          currentState={approvalDialog.currentState}
          onSuccess={() => {
            fetchFlags()
          }}
        />
      )}
    </div>
  )
}
