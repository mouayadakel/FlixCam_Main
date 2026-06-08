'use client'

import { useState, useEffect } from 'react'
import {
  convertFlatToStructured,
  repairSpecifications,
  flattenStructuredSpecs,
  hasCorruptedValues,
} from '@/lib/utils/specifications.utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

export default function TestSpecsPage() {
  const [results, setResults] = useState<any[]>([])

  useEffect(() => {
    const suite = []

    // Test Case 1: Camera AI Keys to Template Grouping
    const cameraFlat = {
      sensor_size: 'Full Frame (35mm)',
      max_video_resolution: '8K 30fps',
      weight_kg: '1.2 kg',
      custom_item: 'Awesome Feature'
    }
    const cameraStructured = convertFlatToStructured(cameraFlat, 'Cameras')
    const sensorSpec = cameraStructured.groups.find(g => g.label === 'Key Specs')?.specs.find(s => s.key === 'sensor')
    suite.push({
      name: 'Camera AI Key Mapping',
      condition: sensorSpec?.value === 'Full Frame (35mm)',
      actual: sensorSpec?.value,
      expected: 'Full Frame (35mm)'
    })

    // Test Case 2: Corruption Detection
    const corrupted = {
      groups: [{
        label: 'Test',
        icon: 'star',
        specs: [{ key: 'c', label: 'C', value: '[object Object]', type: 'text' }]
      }]
    } as any
    suite.push({
      name: 'Corruption Detection',
      condition: hasCorruptedValues(corrupted) === true,
      actual: hasCorruptedValues(corrupted),
      expected: true
    })

    // Test Case 3: Repair Logic
    const repaired = repairSpecifications(corrupted)
    suite.push({
      name: 'Repair Logic',
      condition: repaired.groups[0].specs[0].value === '',
      actual: repaired.groups[0].specs[0].value,
      expected: '"" (empty string)'
    })

    // Test Case 4: Flattening
    const flat = flattenStructuredSpecs(cameraStructured)
    suite.push({
      name: 'Flattening Logic',
      condition: flat.sensor === 'Full Frame (35mm)',
      actual: flat.sensor,
      expected: 'Full Frame (35mm)'
    })

    // Test Case 5: Quick Spec Generation
    suite.push({
      name: 'Quick Spec Tier Generation',
      condition: cameraStructured.quickSpecs?.length === 4, // 3 from keys + 1 from limit?
      actual: cameraStructured.quickSpecs?.length,
      expected: '4 (sensor, video, weight, custom)'
    })

    setResults(suite)
  }, [])

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">FlixCam Specifications System - Logic Audit</h1>
      <div className="grid gap-4">
        {results.map((r, i) => (
          <Card key={i} className={r.condition ? 'border-emerald-200' : 'border-red-200'}>
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold">{r.name}</CardTitle>
              {r.condition ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </CardHeader>
            <CardContent className="py-2 px-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-text-muted mb-1">Actual:</p>
                  <pre className="bg-surface-light p-2 rounded">{JSON.stringify(r.actual, null, 2)}</pre>
                </div>
                <div>
                  <p className="text-text-muted mb-1">Expected:</p>
                  <pre className="bg-surface-light p-2 rounded">{JSON.stringify(r.expected, null, 2)}</pre>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
