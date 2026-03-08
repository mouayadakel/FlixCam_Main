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
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

export function ProviderSettingsCard({
  provider,
  setting,
  onSave,
  saving,
}: ProviderSettingsCardProps) {
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
          إعدادات {provider === 'openai' ? 'OpenAI' : 'Google Gemini'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor={`${provider}-enabled`}>
            تفعيل {provider === 'openai' ? 'OpenAI' : 'Gemini'}
          </Label>
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
          <Label htmlFor={`${provider}-api-key`}>مفتاح API</Label>
          <PasswordInput
            id={`${provider}-api-key`}
            value={localSetting.apiKey}
            onChange={(e) => setLocalSetting({ ...localSetting, apiKey: e.target.value })}
            placeholder={`أدخل مفتاح ${provider === 'openai' ? 'OpenAI' : 'Gemini'}`}
          />
          <Button className="mt-2" size="sm" onClick={handleSave} disabled={saving}>
            حفظ المفتاح
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`${provider}-batch-size`}>حجم الدفعة</Label>
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
            <Label htmlFor={`${provider}-timeout`}>المهلة (مللي ثانية)</Label>
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
          <Label htmlFor={`${provider}-fallback`}>استراتيجية الاحتياط</Label>
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
              <SelectItem value="mark_for_review">وضع للمراجعة</SelectItem>
              <SelectItem value="use_original">استخدام النص الأصلي</SelectItem>
              <SelectItem value="skip">تخطي الحقل</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
