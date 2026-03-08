/**
 * Full shoot type editor: General, Category Flow, Recommendations, Questionnaire.
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { ShootTypeGeneralTab } from '../_components/shoot-type-general-tab'
import { ShootTypeCategoryFlowTab } from '../_components/shoot-type-category-flow-tab'
import { ShootTypeRecommendationsTab } from '../_components/shoot-type-recommendations-tab'
import { ShootTypeQuestionnaireTab } from '../_components/shoot-type-questionnaire-tab'

interface ShootTypeFullConfig {
  id: string
  name: string
  slug: string
  description: string | null
  nameAr: string | null
  nameZh: string | null
  descriptionAr: string | null
  descriptionZh: string | null
  icon: string | null
  coverImageUrl: string | null
  sortOrder: number
  isActive: boolean
  questionnaire: unknown
  categorySteps: {
    id: string
    categoryId: string
    categoryName: string
    categorySlug: string
    sortOrder: number
    isRequired: boolean
    minRecommended: number | null
    maxRecommended: number | null
    stepTitle: string | null
    stepTitleAr: string | null
    stepDescription: string | null
    stepDescriptionAr: string | null
  }[]
  recommendations: {
    id: string
    equipmentId: string
    budgetTier: string
    reason: string | null
    reasonAr: string | null
    defaultQuantity: number
    isAutoSelect: boolean
    sortOrder: number
    equipment: {
      id: string
      sku: string
      model: string | null
      categoryId: string
      category: { name: string; slug: string }
    }
  }[]
}

export default function ShootTypeEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = (params?.id as string) ?? ''
  const { toast } = useToast()
  const [data, setData] = useState<ShootTypeFullConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('general')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/shoot-types/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load')
        return res.json()
      })
      .then(setData)
      .catch(() =>
        toast({ title: 'Error', description: 'Failed to load shoot type', variant: 'destructive' })
      )
      .finally(() => setLoading(false))
  }, [id, toast])

  const refresh = () => {
    fetch(`/api/admin/shoot-types/${id}`)
      .then((res) => res.json())
      .then(setData)
      .catch((err) => console.error('[shoot-types] refresh failed', err))
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/shoot-types">← Shoot Types</Link>
        </Button>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Shoot type not found.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/shoot-types" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Shoot Types
          </Link>
        </Button>
        {data && <h1 className="text-xl font-semibold">{data.name}</h1>}
      </div>

      {data && (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="category-flow">Category Flow</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="questionnaire">Questionnaire</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="mt-6">
            <ShootTypeGeneralTab shootType={data} onSaved={refresh} />
          </TabsContent>
          <TabsContent value="category-flow" className="mt-6">
            <ShootTypeCategoryFlowTab
              shootTypeId={data.id}
              categorySteps={data.categorySteps}
              onSaved={refresh}
            />
          </TabsContent>
          <TabsContent value="recommendations" className="mt-6">
            <ShootTypeRecommendationsTab
              shootTypeId={data.id}
              categorySteps={data.categorySteps}
              recommendations={data.recommendations}
              onSaved={refresh}
            />
          </TabsContent>
          <TabsContent value="questionnaire" className="mt-6">
            <ShootTypeQuestionnaireTab
              shootTypeId={data.id}
              questionnaire={data.questionnaire}
              onSaved={refresh}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
