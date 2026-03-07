/**
 * AI Translation Integration Dashboard
 * Bulk translation management with AI assistance
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Loader2,
  Brain,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  RefreshCw,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface TranslationJob {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  sourceLocale: string
  targetLocales: string[]
  keysProcessed: number
  totalKeys: number
  createdAt: Date
  completedAt?: Date
  error?: string
}

interface TranslationKey {
  key: string
  sourceValue: string
  translations: Record<string, string>
  status: 'pending' | 'translated' | 'reviewed' | 'approved'
  confidence?: number
}

const LOCALES = [
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'ur', name: 'اردو', flag: '🇵🇰' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
]

export default function AITranslationsPage() {
  const { toast } = useToast()
  const [jobs, setJobs] = useState<TranslationJob[]>([])
  const [activeJob, setActiveJob] = useState<TranslationJob | null>(null)
  const [translationKeys, setTranslationKeys] = useState<TranslationKey[]>([])
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [sourceLocale, setSourceLocale] = useState('en')
  const [targetLocales, setTargetLocales] = useState<string[]>(['ar', 'zh', 'fr'])
  const [apiKey, setApiKey] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isReviewing, setIsReviewing] = useState(false)

  useEffect(() => {
    loadJobs()
    loadTranslationKeys()
  }, [])

  const loadJobs = async () => {
    try {
      const response = await fetch('/api/admin/ai-translations/jobs')
      if (response.ok) {
        const data = await response.json()
        setJobs(data.jobs || [])
      }
    } catch (error) {
      console.error('Failed to load jobs:', error)
    }
  }

  const loadTranslationKeys = async () => {
    try {
      const response = await fetch('/api/admin/ai-translations/keys')
      if (response.ok) {
        const data = await response.json()
        setTranslationKeys(data.keys || [])
      }
    } catch (error) {
      console.error('Failed to load translation keys:', error)
    }
  }

  const startTranslationJob = async () => {
    if (!apiKey) {
      toast({
        title: 'API Key Required',
        description: 'Please enter your OpenAI API key to start translation.',
        variant: 'destructive',
      })
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/admin/ai-translations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceLocale,
          targetLocales,
          apiKey,
          selectedKeys: selectedKeys.length > 0 ? selectedKeys : undefined,
        }),
      })

      if (response.ok) {
        const job = await response.json()
        setJobs((prev) => [job, ...prev])
        setActiveJob(job)
        toast({
          title: 'Translation Started',
          description: `Translating ${job.totalKeys} keys to ${targetLocales.length} languages.`,
        })
      } else {
        throw new Error('Failed to start translation')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start translation job.',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const pauseJob = async (jobId: string) => {
    try {
      await fetch(`/api/admin/ai-translations/jobs/${jobId}/pause`, { method: 'POST' })
      loadJobs()
    } catch (error) {
      console.error('Failed to pause job:', error)
    }
  }

  const resumeJob = async (jobId: string) => {
    try {
      await fetch(`/api/admin/ai-translations/jobs/${jobId}/resume`, { method: 'POST' })
      loadJobs()
    } catch (error) {
      console.error('Failed to resume job:', error)
    }
  }

  const approveTranslation = async (key: string, locale: string, translation: string) => {
    try {
      await fetch('/api/admin/ai-translations/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, locale, translation }),
      })

      setTranslationKeys((prev) =>
        prev.map((k) =>
          k.key === key
            ? {
                ...k,
                translations: { ...k.translations, [locale]: translation },
                status: 'approved',
              }
            : k
        )
      )
    } catch (error) {
      console.error('Failed to approve translation:', error)
    }
  }

  const exportTranslations = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/admin/ai-translations/export?format=${format}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `translations.${format}`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to export:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500'
      case 'running':
        return 'bg-blue-500'
      case 'failed':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Brain className="h-8 w-8" />
            AI Translation Dashboard
          </h1>
          <p className="text-muted-foreground">Bulk translate content using AI assistance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportTranslations('json')}>
            <Download className="me-2 h-4 w-4" />
            Export JSON
          </Button>
          <Button variant="outline" onClick={() => exportTranslations('csv')}>
            <Download className="me-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Tabs defaultValue="jobs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="jobs">Translation Jobs</TabsTrigger>
          <TabsTrigger value="review">Review & Approve</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>New Translation Job</CardTitle>
              <CardDescription>Configure and start a new AI translation job</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="source-locale">Source Locale</Label>
                  <Select value={sourceLocale} onValueChange={setSourceLocale}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCALES.map((locale) => (
                        <SelectItem key={locale.code} value={locale.code}>
                          {locale.flag} {locale.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="target-locales">Target Locales</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {LOCALES.filter((l) => l.code !== sourceLocale).map((locale) => (
                      <Badge
                        key={locale.code}
                        variant={targetLocales.includes(locale.code) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                          setTargetLocales((prev) =>
                            prev.includes(locale.code)
                              ? prev.filter((l) => l !== locale.code)
                              : [...prev, locale.code]
                          )
                        }}
                      >
                        {locale.flag} {locale.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="api-key">OpenAI API Key</Label>
                <PasswordInput
                  id="api-key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Keys to Translate</Label>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedKeys.length > 0
                      ? `${selectedKeys.length} keys selected`
                      : 'All keys will be translated'}
                  </span>
                  {selectedKeys.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => setSelectedKeys([])}>
                      Clear Selection
                    </Button>
                  )}
                </div>
              </div>

              <Button
                onClick={startTranslationJob}
                disabled={isGenerating || targetLocales.length === 0}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    Starting Translation...
                  </>
                ) : (
                  <>
                    <Play className="me-2 h-4 w-4" />
                    Start Translation Job
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Recent Jobs</h3>
            {jobs.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No translation jobs yet</p>
                </CardContent>
              </Card>
            ) : (
              jobs.map((job) => (
                <Card key={job.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-3 w-3 rounded-full ${getStatusColor(job.status)}`} />
                        <div>
                          <h4 className="font-medium">
                            {job.sourceLocale} → {job.targetLocales.join(', ')}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {job.keysProcessed} / {job.totalKeys} keys processed
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {job.status === 'running' && (
                          <Button size="sm" variant="outline" onClick={() => pauseJob(job.id)}>
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                        {job.status === 'pending' && (
                          <Button size="sm" variant="outline" onClick={() => resumeJob(job.id)}>
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => setActiveJob(job)}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {job.status === 'running' && (
                      <div className="mt-4">
                        <Progress value={job.progress} className="w-full" />
                      </div>
                    )}
                    {job.error && (
                      <Alert className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{job.error}</AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="review" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Review & Approve Translations</CardTitle>
              <CardDescription>Review AI-generated translations before publishing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {translationKeys
                  .filter((key) => key.status !== 'approved')
                  .slice(0, 10)
                  .map((key) => (
                    <Card key={key.key} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{key.key}</h4>
                          <Badge variant={key.status === 'reviewed' ? 'default' : 'secondary'}>
                            {key.status}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">
                            Source ({sourceLocale})
                          </Label>
                          <p className="rounded bg-muted p-2 font-mono text-sm">
                            {key.sourceValue}
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {targetLocales.map((locale) => {
                            const translation = key.translations[locale]
                            return (
                              <div key={locale}>
                                <Label className="text-sm text-muted-foreground">
                                  {LOCALES.find((l) => l.code === locale)?.name}
                                </Label>
                                <Textarea
                                  value={translation || ''}
                                  onChange={(e) => {
                                    setTranslationKeys((prev) =>
                                      prev.map((k) =>
                                        k.key === key.key
                                          ? {
                                              ...k,
                                              translations: {
                                                ...k.translations,
                                                [locale]: e.target.value,
                                              },
                                            }
                                          : k
                                      )
                                    )
                                  }}
                                  className="mt-1"
                                  rows={2}
                                />
                                <div className="mt-1 flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      approveTranslation(key.key, locale, translation || '')
                                    }
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Translation Settings</CardTitle>
              <CardDescription>Configure AI translation parameters and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="model">AI Model</Label>
                <Select defaultValue="gpt-4">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4">GPT-4 (Recommended)</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="temperature">Translation Creativity</Label>
                <Select defaultValue="0.3">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.1">Very Literal</SelectItem>
                    <SelectItem value="0.3">Balanced (Recommended)</SelectItem>
                    <SelectItem value="0.7">Creative</SelectItem>
                    <SelectItem value="1.0">Very Creative</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="batch-size">Batch Size</Label>
                <Select defaultValue="10">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 keys per request</SelectItem>
                    <SelectItem value="10">10 keys per request</SelectItem>
                    <SelectItem value="20">20 keys per request</SelectItem>
                    <SelectItem value="50">50 keys per request</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Alert>
                <Brain className="h-4 w-4" />
                <AlertDescription>
                  AI translations require human review before publishing to ensure accuracy and
                  cultural appropriateness.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
