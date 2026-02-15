/**
 * @file page.tsx
 * @description Feature flags page - functional with database, grouped by config
 * @module app/admin/(routes)/settings/features
 */

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Search, Loader2, History } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ApprovalRequestDialog } from '@/components/admin/approval-request-dialog'
import { AuditTrailViewer } from '@/components/admin/audit-trail-viewer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FEATURE_FLAG_GROUP_ORDER,
  FEATURE_FLAG_GROUP_LABELS,
  FEATURE_FLAG_META,
  type FeatureFlagGroup,
} from '@/config/feature-flag-groups'

interface FeatureFlag {
  id: string
  name: string
  description: string | null
  enabled: boolean
  scope: string
  requiresApproval: boolean
}

function getFlagLabel(flag: FeatureFlag): string {
  const meta = FEATURE_FLAG_META[flag.name]
  return meta?.label ?? flag.name
}

function getFlagLabelAr(flag: FeatureFlag): string {
  const meta = FEATURE_FLAG_META[flag.name]
  return meta?.labelAr ?? flag.name
}

function getFlagGroup(flag: FeatureFlag): FeatureFlagGroup {
  const meta = FEATURE_FLAG_META[flag.name]
  return meta?.group ?? 'other'
}

function getFlagSortOrder(flag: FeatureFlag): number {
  const meta = FEATURE_FLAG_META[flag.name]
  return meta?.sortOrder ?? 999
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
    if (!searchQuery.trim()) {
      setFilteredFlags(flags)
      return
    }
    const q = searchQuery.toLowerCase()
    const filtered = flags.filter((flag) => {
      const name = flag.name.toLowerCase()
      const desc = (flag.description ?? '').toLowerCase()
      const label = getFlagLabel(flag).toLowerCase()
      const labelAr = getFlagLabelAr(flag).toLowerCase()
      return name.includes(q) || desc.includes(q) || label.includes(q) || labelAr.includes(q)
    })
    setFilteredFlags(filtered)
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
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load feature flags',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (flag: FeatureFlag) => {
    if (flag.requiresApproval) {
      setApprovalDialog({
        open: true,
        flagId: flag.id,
        flagName: getFlagLabel(flag),
        currentState: flag.enabled,
      })
      return
    }

    try {
      setToggling((prev) => ({ ...prev, [flag.id]: true }))
      const response = await fetch(`/api/feature-flags/${flag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !flag.enabled }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to update feature flag')
      }

      const data = await response.json()
      setFlags((prev) => prev.map((f) => (f.id === flag.id ? data.flag : f)))
      await fetch('/api/feature-flags', { cache: 'no-store' })

      toast({
        title: 'Success',
        description: `${getFlagLabel(flag)} ${data.flag.enabled ? 'enabled' : 'disabled'}`,
      })
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to toggle feature flag',
        variant: 'destructive',
      })
    } finally {
      setToggling((prev) => ({ ...prev, [flag.id]: false }))
    }
  }

  // Group by config groups, sorted by group order then sortOrder
  const grouped = FEATURE_FLAG_GROUP_ORDER.reduce<Record<FeatureFlagGroup, FeatureFlag[]>>(
    (acc, group) => {
      acc[group] = filteredFlags
        .filter((f) => getFlagGroup(f) === group)
        .sort((a, b) => getFlagSortOrder(a) - getFlagSortOrder(b))
      return acc
    },
    {
      public_website: [],
      control_panel: [],
      kit_builder: [],
      integrations: [],
      system: [],
      other: [],
    }
  )

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
        <p className="text-muted-foreground mt-1">
          Enable or disable features on the public website and control panel.
        </p>
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
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-2 -mx-1 px-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, label, or description..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search features"
              />
            </div>
          </div>

          <div className="space-y-8">
            {FEATURE_FLAG_GROUP_ORDER.map((group) => {
              const scopeFlags = grouped[group]
              if (!scopeFlags.length) return null

              const labels = FEATURE_FLAG_GROUP_LABELS[group]
              return (
                <section key={group} className="space-y-4">
                  <h2 className="text-lg font-semibold border-b pb-2">
                    {labels.en} / {labels.ar}
                    <span className="text-muted-foreground font-normal ml-2">
                      ({scopeFlags.length})
                    </span>
                  </h2>
                  <div className="space-y-3">
                    {scopeFlags.map((flag) => (
                      <Card key={flag.id}>
                        <CardHeader className="py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base flex items-center gap-2">
                                {getFlagLabel(flag)}
                                {flag.requiresApproval && (
                                  <Badge variant="secondary" className="text-xs">
                                    Requires Approval
                                  </Badge>
                                )}
                              </CardTitle>
                              <CardDescription>
                                {flag.description || 'No description'}
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {toggling[flag.id] && (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              )}
                              <Switch
                                checked={flag.enabled}
                                onCheckedChange={() => handleToggle(flag)}
                                disabled={!!toggling[flag.id]}
                                aria-label={`Toggle ${getFlagLabel(flag)}`}
                              />
                              <span
                                className={`text-sm font-medium w-14 ${flag.enabled ? 'text-green-600' : 'text-muted-foreground'}`}
                              >
                                {flag.enabled ? 'On' : 'Off'}
                              </span>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </section>
              )
            })}

            {filteredFlags.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  {searchQuery
                    ? 'No feature flags match your search.'
                    : 'No feature flags found. Run the seed to create default flags.'}
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
          onOpenChange={(open) => setApprovalDialog(open ? approvalDialog : null)}
          flagId={approvalDialog.flagId}
          flagName={approvalDialog.flagName}
          currentState={approvalDialog.currentState}
          onSuccess={() => fetchFlags()}
        />
      )}
    </div>
  )
}
