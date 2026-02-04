/**
 * @file risk-assessment-tab.tsx
 * @description Risk assessment AI feature component
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
import { AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react'
import type { RiskAssessment } from '@/lib/types/ai.types'

export function RiskAssessmentTab() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null)
  const [formData, setFormData] = useState({
    customerId: '',
    equipmentIds: '',
    rentalDuration: '',
    totalValue: '',
  })

  const handleAssess = async () => {
    if (!formData.equipmentIds || !formData.rentalDuration || !formData.totalValue) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/ai/risk-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: formData.customerId || undefined,
          equipmentIds: formData.equipmentIds.split(',').map((id) => id.trim()),
          rentalDuration: parseInt(formData.rentalDuration),
          totalValue: parseFloat(formData.totalValue),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to assess risk')
      }

      const data = await response.json()
      setAssessment(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to assess risk',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-green-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'high':
        return 'bg-orange-500'
      case 'critical':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Risk Assessment</CardTitle>
          <CardDescription>Assess booking risk using AI-powered analysis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerId">Customer ID (Optional)</Label>
              <Input
                id="customerId"
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                placeholder="Enter customer ID"
              />
            </div>
            <div>
              <Label htmlFor="equipmentIds">Equipment IDs (Comma-separated) *</Label>
              <Input
                id="equipmentIds"
                value={formData.equipmentIds}
                onChange={(e) => setFormData({ ...formData, equipmentIds: e.target.value })}
                placeholder="id1, id2, id3"
                required
              />
            </div>
            <div>
              <Label htmlFor="rentalDuration">Rental Duration (Days) *</Label>
              <Input
                id="rentalDuration"
                type="number"
                value={formData.rentalDuration}
                onChange={(e) => setFormData({ ...formData, rentalDuration: e.target.value })}
                placeholder="7"
                required
              />
            </div>
            <div>
              <Label htmlFor="totalValue">Total Value (SAR) *</Label>
              <Input
                id="totalValue"
                type="number"
                value={formData.totalValue}
                onChange={(e) => setFormData({ ...formData, totalValue: e.target.value })}
                placeholder="50000"
                required
              />
            </div>
          </div>
          <Button onClick={handleAssess} disabled={loading}>
            {loading ? 'Assessing...' : 'Assess Risk'}
          </Button>
        </CardContent>
      </Card>

      {assessment && (
        <Card>
          <CardHeader>
            <CardTitle>Risk Assessment Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">Risk Score:</span>
                  <Badge className={getRiskColor(assessment.level)}>{assessment.score}/100</Badge>
                  <Badge variant="outline">{assessment.level.toUpperCase()}</Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getRiskColor(assessment.level)}`}
                    style={{ width: `${assessment.score}%` }}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Recommendation:</Label>
              <div className="mt-1 flex items-center gap-2">
                {assessment.recommendation === 'approve' && <CheckCircle className="h-4 w-4 text-green-500" />}
                {assessment.recommendation === 'review' && <Info className="h-4 w-4 text-yellow-500" />}
                {assessment.recommendation === 'reject' && <XCircle className="h-4 w-4 text-red-500" />}
                {assessment.recommendation === 'require_deposit' && <AlertCircle className="h-4 w-4 text-orange-500" />}
                <span className="font-medium capitalize">{assessment.recommendation.replace('_', ' ')}</span>
              </div>
            </div>

            {assessment.suggestedDeposit && (
              <div>
                <Label>Suggested Deposit:</Label>
                <p className="text-lg font-semibold mt-1">{assessment.suggestedDeposit.toLocaleString()} SAR</p>
              </div>
            )}

            <div>
              <Label>Reasoning:</Label>
              <p className="text-sm text-muted-foreground mt-1">{assessment.reasoning}</p>
            </div>

            <div>
              <Label>Risk Factors:</Label>
              <div className="mt-2 space-y-2">
                {assessment.factors.map((factor, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-muted rounded">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{factor.name}</span>
                        <Badge variant="outline" className="text-xs">
                          Weight: {factor.weight}%
                        </Badge>
                        <Badge
                          variant={factor.impact === 'positive' ? 'default' : factor.impact === 'negative' ? 'destructive' : 'secondary'}
                        >
                          {factor.impact}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{factor.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
