/**
 * Questionnaire tab: dynamic form builder (questions with options). Stored as JSON.
 */

'use client'

import { useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface QuestionnaireOption {
  id: string
  label: string
  labelAr?: string
  icon?: string
}

interface QuestionnaireQuestion {
  id: string
  question: string
  questionAr?: string
  type: 'single_choice' | 'multi_choice'
  options: QuestionnaireOption[]
}

export function ShootTypeQuestionnaireTab({
  shootTypeId,
  questionnaire,
  onSaved,
}: {
  shootTypeId: string
  questionnaire: unknown
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [questions, setQuestions] = useState<QuestionnaireQuestion[]>(() => {
    const q = questionnaire as QuestionnaireQuestion[] | null | undefined
    return Array.isArray(q) ? q : []
  })

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q-${Date.now()}`,
        question: '',
        questionAr: '',
        type: 'single_choice',
        options: [{ id: 'opt-1', label: '', labelAr: '' }],
      },
    ])
  }

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  const updateQuestion = (index: number, field: keyof QuestionnaireQuestion, value: unknown) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, [field]: value } : q)))
  }

  const addOption = (qIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? { ...q, options: [...q.options, { id: `opt-${Date.now()}`, label: '', labelAr: '' }] }
          : q
      )
    )
  }

  const removeOption = (qIndex: number, optIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.filter((_, j) => j !== optIndex) } : q
      )
    )
  }

  const updateOption = (
    qIndex: number,
    optIndex: number,
    field: keyof QuestionnaireOption,
    value: string
  ) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              options: q.options.map((o, j) => (j === optIndex ? { ...o, [field]: value } : o)),
            }
          : q
      )
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/shoot-types/${shootTypeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionnaire: questions }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast({ title: 'Saved' })
      onSaved()
    } catch {
      toast({ title: 'Error', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Questionnaire</CardTitle>
        <CardDescription>
          Optional follow-up questions (e.g. Indoor/Outdoor, crew size) to refine recommendations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {questions.map((q, qIndex) => (
          <div key={q.id} className="space-y-4 rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <Label>Question {qIndex + 1}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeQuestion(qIndex)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Question (EN)</Label>
                <Input
                  value={q.question}
                  onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                  placeholder="e.g. Indoor or Outdoor?"
                />
              </div>
              <div>
                <Label className="text-xs">Question (AR)</Label>
                <Input
                  value={q.questionAr ?? ''}
                  onChange={(e) => updateQuestion(qIndex, 'questionAr', e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={q.type}
                onChange={(e) =>
                  updateQuestion(qIndex, 'type', e.target.value as 'single_choice' | 'multi_choice')
                }
              >
                <option value="single_choice">Single choice</option>
                <option value="multi_choice">Multi choice</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Options</Label>
              {q.options.map((opt, optIndex) => (
                <div key={opt.id} className="mt-2 flex gap-2">
                  <Input
                    value={opt.label}
                    onChange={(e) => updateOption(qIndex, optIndex, 'label', e.target.value)}
                    placeholder="Label (EN)"
                  />
                  <Input
                    value={opt.labelAr ?? ''}
                    onChange={(e) => updateOption(qIndex, optIndex, 'labelAr', e.target.value)}
                    placeholder="Label (AR)"
                  />
                  <Input
                    value={opt.icon ?? ''}
                    onChange={(e) => updateOption(qIndex, optIndex, 'icon', e.target.value)}
                    placeholder="Icon"
                    className="w-24"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(qIndex, optIndex)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => addOption(qIndex)}
              >
                <Plus className="h-4 w-4" />
                Add option
              </Button>
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={addQuestion}>
            <Plus className="h-4 w-4" />
            Add question
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
