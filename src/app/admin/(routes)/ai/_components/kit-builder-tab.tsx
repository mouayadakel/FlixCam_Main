/**
 * @file kit-builder-tab.tsx
 * @description Kit builder AI feature component
 * @module app/admin/(routes)/ai/_components
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Package, DollarSign } from 'lucide-react'
import type { KitBundle } from '@/lib/types/ai.types'

export function KitBuilderTab() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [kits, setKits] = useState<KitBundle[]>([])
  const [formData, setFormData] = useState({
    projectType: '',
    useCase: '',
    budget: '',
    duration: '',
    requirements: '',
  })

  const handleBuildKit = async () => {
    if (!formData.projectType || !formData.duration) {
      toast({
        title: 'Error',
        description: 'Please fill in project type and duration',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/ai/kit-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType: formData.projectType,
          useCase: formData.useCase || undefined,
          budget: formData.budget ? parseFloat(formData.budget) : undefined,
          duration: parseInt(formData.duration),
          requirements: formData.requirements ? formData.requirements.split(',').map((r) => r.trim()) : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to build kit')
      }

      const data = await response.json()
      setKits(data.kits || [])
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to build kit',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Kit Builder</CardTitle>
          <CardDescription>Build equipment kits using AI recommendations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="projectType">Project Type *</Label>
              <Input
                id="projectType"
                value={formData.projectType}
                onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                placeholder="e.g., Film Production, Photography"
                required
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration (Days) *</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="7"
                required
              />
            </div>
            <div>
              <Label htmlFor="useCase">Use Case (Optional)</Label>
              <Input
                id="useCase"
                value={formData.useCase}
                onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                placeholder="e.g., Outdoor shooting, Studio work"
              />
            </div>
            <div>
              <Label htmlFor="budget">Budget (SAR) (Optional)</Label>
              <Input
                id="budget"
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="50000"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="requirements">Requirements (Comma-separated) (Optional)</Label>
              <Input
                id="requirements"
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="4K video, Low light, Weatherproof"
              />
            </div>
          </div>
          <Button onClick={handleBuildKit} disabled={loading}>
            {loading ? 'Building Kit...' : 'Build Kit'}
          </Button>
        </CardContent>
      </Card>

      {kits.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Recommended Kits</h3>
          {kits.map((kit) => (
            <Card key={kit.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{kit.name}</CardTitle>
                    <CardDescription>{kit.description}</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{kit.totalPrice.toLocaleString()} SAR</div>
                    {kit.savings && (
                      <Badge variant="default" className="mt-1">
                        Save {kit.savings.toLocaleString()} SAR
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Equipment:</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {kit.equipment.map((eq, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                        <Package className="h-4 w-4" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{eq.equipmentName}</span>
                            <Badge variant="outline" className="text-xs">
                              {eq.role}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {eq.quantity}x • {eq.dailyPrice.toLocaleString()} SAR/day
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Label>Reasoning:</Label>
                    <p className="text-sm text-muted-foreground mt-1">{kit.reasoning}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
