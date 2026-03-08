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
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تحميل أعلام الميزات',
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
        title: 'تم',
        description: `${getFlagLabelAr(flag)} ${data.flag.enabled ? 'مفعّل' : 'معطّل'}`,
      })
    } catch (error: unknown) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل تغيير حالة الميزة',
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
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold">التحكم في الميزات</h1>
        <p className="mt-1 text-muted-foreground">
          تفعيل أو تعطيل الميزات على الموقع العام ولوحة التحكم.
        </p>
      </div>

      <Tabs defaultValue="flags" className="space-y-4" dir="rtl">
        <TabsList>
          <TabsTrigger value="flags">أعلام الميزات</TabsTrigger>
          <TabsTrigger value="audit">
            <History className="ms-2 h-4 w-4" />
            سجل التغييرات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flags" className="space-y-6">
          <div className="sticky top-0 z-10 -mx-1 bg-background/95 px-1 py-2 backdrop-blur">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="البحث بالاسم أو التسمية أو الوصف..."
                className="ps-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="البحث في الميزات"
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
                  <h2 className="border-b pb-2 text-lg font-semibold">
                    {labels.en} / {labels.ar}
                    <span className="ms-2 font-normal text-muted-foreground">
                      ({scopeFlags.length})
                    </span>
                  </h2>
                  <div className="space-y-3">
                    {scopeFlags.map((flag) => (
                      <Card key={flag.id}>
                        <CardHeader className="py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <CardTitle className="flex items-center gap-2 text-base">
                                {getFlagLabel(flag)}
                                {flag.requiresApproval && (
                                  <Badge variant="secondary" className="text-xs">
                                    يتطلب موافقة
                                  </Badge>
                                )}
                              </CardTitle>
                              <CardDescription>{flag.description || 'لا يوجد وصف'}</CardDescription>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
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
                                className={`w-14 text-sm font-medium ${flag.enabled ? 'text-green-600' : 'text-muted-foreground'}`}
                              >
                                {flag.enabled ? 'مفعّل' : 'معطّل'}
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
                    ? 'لا توجد ميزات تطابق بحثك.'
                    : 'لا توجد أعلام ميزات. شغّل البذر لإنشاء الأعلام الافتراضية.'}
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
