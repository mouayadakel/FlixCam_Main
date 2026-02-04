/**
 * @file demand-forecast-tab.tsx
 * @description Demand forecast AI feature component
 * @module app/admin/(routes)/ai/_components
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { TrendingUp, TrendingDown, Package } from 'lucide-react'
import type { DemandForecast } from '@/lib/types/ai.types'

export function DemandForecastTab() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [forecasts, setForecasts] = useState<DemandForecast[]>([])
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [equipmentId, setEquipmentId] = useState('')

  const handleForecast = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai/demand-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId: equipmentId || undefined,
          period,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate forecast')
      }

      const data = await response.json()
      setForecasts(data.forecasts || [])
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate forecast',
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
          <CardTitle>Demand Forecast</CardTitle>
          <CardDescription>AI-powered demand forecasting for equipment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="equipmentId">Equipment ID (Optional - leave empty for all)</Label>
              <Input
                id="equipmentId"
                value={equipmentId}
                onChange={(e) => setEquipmentId(e.target.value)}
                placeholder="Enter equipment ID"
              />
            </div>
            <div>
              <Label htmlFor="period">Forecast Period</Label>
              <Select value={period} onValueChange={(value) => setPeriod(value as typeof period)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="quarter">Quarter</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleForecast} disabled={loading}>
            {loading ? 'Forecasting...' : 'Generate Forecast'}
          </Button>
        </CardContent>
      </Card>

      {forecasts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Forecast Results</h3>
          <div className="grid grid-cols-1 gap-4">
            {forecasts.map((forecast) => (
              <Card key={forecast.equipmentId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{forecast.equipmentName}</CardTitle>
                      <CardDescription>SKU: {forecast.sku}</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{forecast.predictedDemand}</div>
                      <Badge variant="outline" className="mt-1">
                        {forecast.period}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Confidence</Label>
                      <Badge variant="outline" className="mt-1">
                        {forecast.confidence}%
                      </Badge>
                    </div>
                    <div>
                      <Label>Trend</Label>
                      <div className="flex items-center gap-2 mt-1">
                        {forecast.factors.historicalTrend === 'increasing' ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : forecast.factors.historicalTrend === 'decreasing' ? (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        ) : null}
                        <Badge variant="outline">{forecast.factors.historicalTrend}</Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Recommendations</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between p-2 bg-muted rounded">
                        <span>Inventory Level</span>
                        <Badge variant="outline">{forecast.recommendations.inventoryLevel}</Badge>
                      </div>
                      {forecast.recommendations.purchaseSuggestion && (
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                          <Package className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Consider purchasing more inventory</span>
                        </div>
                      )}
                      {forecast.recommendations.pricingSuggestion && (
                        <div className="flex items-center justify-between p-2 bg-muted rounded">
                          <span>Pricing Suggestion</span>
                          <Badge variant="outline">{forecast.recommendations.pricingSuggestion}</Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {forecast.revenueForecast && (
                    <div>
                      <Label>Revenue Forecast</Label>
                      <p className="text-lg font-semibold mt-1">{forecast.revenueForecast.toLocaleString()} SAR</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
