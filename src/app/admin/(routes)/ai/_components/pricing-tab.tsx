/**
 * @file pricing-tab.tsx
 * @description Pricing assistant AI feature component
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
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import type { PricingSuggestion } from '@/lib/types/ai.types'

export function PricingTab() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState<PricingSuggestion | null>(null)
  const [formData, setFormData] = useState({
    equipmentId: '',
    currentPrice: '',
  })

  const handleSuggest = async () => {
    if (!formData.equipmentId || !formData.currentPrice) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/ai/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId: formData.equipmentId,
          currentPrice: parseFloat(formData.currentPrice),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get pricing suggestion')
      }

      const data = await response.json()
      setSuggestion(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get pricing suggestion',
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
          <CardTitle>AI Pricing Assistant</CardTitle>
          <CardDescription>Get AI-powered pricing suggestions based on demand and market data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="equipmentId">Equipment ID *</Label>
              <Input
                id="equipmentId"
                value={formData.equipmentId}
                onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
                placeholder="Enter equipment ID"
                required
              />
            </div>
            <div>
              <Label htmlFor="currentPrice">Current Price (SAR) *</Label>
              <Input
                id="currentPrice"
                type="number"
                value={formData.currentPrice}
                onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
                placeholder="500"
                required
              />
            </div>
          </div>
          <Button onClick={handleSuggest} disabled={loading}>
            {loading ? 'Analyzing...' : 'Get Pricing Suggestion'}
          </Button>
        </CardContent>
      </Card>

      {suggestion && (
        <Card>
          <CardHeader>
            <CardTitle>Pricing Suggestion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Current Price</Label>
                <p className="text-2xl font-bold mt-1">{suggestion.currentPrice.toLocaleString()} SAR</p>
              </div>
              <div>
                <Label>Suggested Price</Label>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-2xl font-bold">{suggestion.suggestedPrice.toLocaleString()} SAR</p>
                  {suggestion.change > 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : suggestion.change < 0 ? (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  ) : null}
                  {suggestion.change !== 0 && (
                    <Badge variant={suggestion.change > 0 ? 'default' : 'destructive'}>
                      {suggestion.change > 0 ? '+' : ''}
                      {suggestion.change.toFixed(1)}%
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label>Reasoning:</Label>
              <p className="text-sm text-muted-foreground mt-1">{suggestion.reasoning}</p>
            </div>

            <div>
              <Label>Factors:</Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between p-2 bg-muted rounded">
                  <span>Demand Level</span>
                  <Badge variant="outline">{suggestion.factors.demandLevel}</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted rounded">
                  <span>Utilization Rate</span>
                  <Badge variant="outline">{suggestion.factors.utilizationRate.toFixed(1)}%</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted rounded">
                  <span>Confidence</span>
                  <Badge variant="outline">{suggestion.confidence}%</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
