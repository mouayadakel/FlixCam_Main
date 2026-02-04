/**
 * @file provider-settings-card.tsx
 * @description Provider settings card component for AI control dashboard
 * @module components/features/import
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Sparkles } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface AISettings {
  id: string
  provider: 'openai' | 'gemini'
  apiKey: string
  batchSize: number
  timeout: number
  fallbackStrategy: string
  enabled: boolean
}

interface ProviderSettingsCardProps {
  provider: 'openai' | 'gemini'
  setting: AISettings
  onSave: (provider: 'openai' | 'gemini', updates: Partial<AISettings>) => Promise<void>
  saving: boolean
}

export function ProviderSettingsCard({ provider, setting, onSave, saving }: ProviderSettingsCardProps) {
  const [localSetting, setLocalSetting] = useState(setting)

  const handleSave = async () => {
    await onSave(provider, {
      apiKey: localSetting.apiKey,
      batchSize: localSetting.batchSize,
      timeout: localSetting.timeout,
      fallbackStrategy: localSetting.fallbackStrategy,
      enabled: localSetting.enabled,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          {provider === 'openai' ? 'OpenAI' : 'Google Gemini'} Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor={`${provider}-enabled`}>Enable {provider === 'openai' ? 'OpenAI' : 'Gemini'}</Label>
          <Switch
            id={`${provider}-enabled`}
            checked={localSetting.enabled}
            onCheckedChange={(checked) => {
              setLocalSetting({ ...localSetting, enabled: checked })
              onSave(provider, { enabled: checked })
            }}
          />
        </div>

        <div>
          <Label htmlFor={`${provider}-api-key`}>API Key</Label>
          <Input
            id={`${provider}-api-key`}
            type="password"
            value={localSetting.apiKey}
            onChange={(e) => setLocalSetting({ ...localSetting, apiKey: e.target.value })}
            placeholder={`Enter ${provider === 'openai' ? 'OpenAI' : 'Gemini'} API key`}
          />
          <Button className="mt-2" size="sm" onClick={handleSave} disabled={saving}>
            Save API Key
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`${provider}-batch-size`}>Batch Size</Label>
            <Input
              id={`${provider}-batch-size`}
              type="number"
              value={localSetting.batchSize}
              onChange={(e) =>
                setLocalSetting({ ...localSetting, batchSize: parseInt(e.target.value) || 50 })
              }
              onBlur={() => onSave(provider, { batchSize: localSetting.batchSize })}
            />
          </div>
          <div>
            <Label htmlFor={`${provider}-timeout`}>Timeout (ms)</Label>
            <Input
              id={`${provider}-timeout`}
              type="number"
              value={localSetting.timeout}
              onChange={(e) =>
                setLocalSetting({ ...localSetting, timeout: parseInt(e.target.value) || 30000 })
              }
              onBlur={() => onSave(provider, { timeout: localSetting.timeout })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor={`${provider}-fallback`}>Fallback Strategy</Label>
          <Select
            value={localSetting.fallbackStrategy}
            onValueChange={(value) => {
              setLocalSetting({ ...localSetting, fallbackStrategy: value })
              onSave(provider, { fallbackStrategy: value })
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mark_for_review">Mark for Review</SelectItem>
              <SelectItem value="use_original">Use Original Text</SelectItem>
              <SelectItem value="skip">Skip Field</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
