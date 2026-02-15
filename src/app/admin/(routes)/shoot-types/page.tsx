/**
 * @file shoot-types/page.tsx
 * @description Shoot Types manager - Visual cards, Form link, Bulk editor (Smart Kit Builder)
 * @module app/admin/(routes)/shoot-types
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LayoutGrid, FileEdit, Table2, Plus, Loader2, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { ShootTypeCardGrid } from './_components/shoot-type-card-grid'
import { ShootTypeBulkEditor } from './_components/shoot-type-bulk-editor'

interface ShootTypeListItem {
  id: string
  name: string
  slug: string
  description: string | null
  nameAr: string | null
  nameZh: string | null
  icon: string | null
  coverImageUrl: string | null
  sortOrder: number
  isActive: boolean
  categoryCount: number
  recommendationCount: number
}

export default function ShootTypesPage() {
  const { toast } = useToast()
  const [list, setList] = useState<ShootTypeListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'visual' | 'form' | 'bulk'>('visual')

  const fetchList = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/shoot-types?includeInactive=true')
      if (!res.ok) throw new Error(res.status === 401 ? 'Unauthorized' : 'Failed to load')
      const json = await res.json()
      setList(Array.isArray(json?.data) ? json.data : [])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load shoot types'
      setError(msg)
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shoot Types</h1>
          <p className="text-muted-foreground">
            Manage shoot types for the Smart Kit Builder. Configure categories, recommendations, and questionnaires.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchList} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild size="sm" className="bg-brand-primary hover:bg-brand-primary-hover">
            <Link href="/admin/shoot-types/new">
              <Plus className="h-4 w-4" />
              New Shoot Type
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as 'visual' | 'form' | 'bulk')}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="visual" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Visual
          </TabsTrigger>
          <TabsTrigger value="form" className="gap-2">
            <FileEdit className="h-4 w-4" />
            Form
          </TabsTrigger>
          <TabsTrigger value="bulk" className="gap-2">
            <Table2 className="h-4 w-4" />
            Bulk
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visual" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Card>
              <CardContent className="py-8 text-center text-destructive">
                {error}
              </CardContent>
            </Card>
          ) : (
            <ShootTypeCardGrid items={list} onUpdated={fetchList} />
          )}
        </TabsContent>

        <TabsContent value="form" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Form editor</CardTitle>
              <CardDescription>
                Edit a single shoot type with full control: general info, category flow, recommendations, and questionnaire.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select a shoot type from the Visual tab to edit, or create a new one.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link href="/admin/shoot-types/new">New Shoot Type</Link>
                </Button>
                {list.slice(0, 5).map((st) => (
                  <Button key={st.id} asChild variant="outline" size="sm">
                    <Link href={`/admin/shoot-types/${st.id}`}>{st.name}</Link>
                  </Button>
                ))}
                {list.length > 5 && (
                  <span className="text-sm text-muted-foreground">+{list.length - 5} more</span>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="mt-6">
          <ShootTypeBulkEditor shootTypes={list} onUpdated={fetchList} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
