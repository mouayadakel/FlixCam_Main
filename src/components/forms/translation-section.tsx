/**
 * @file translation-section.tsx
 * @description Translation section component for a single language
 * @module components/forms
 */

'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

interface TranslationSectionProps {
  locale: 'ar' | 'en' | 'zh'
  value: {
    name?: string
    description?: string
    shortDescription?: string
  }
  onChange: (value: { name?: string; description?: string; shortDescription?: string }) => void
  defaultExpanded?: boolean
  className?: string
}

const localeLabels: Record<'ar' | 'en' | 'zh', string> = {
  ar: 'العربية',
  en: 'English',
  zh: '中文',
}

export function TranslationSection({
  locale,
  value,
  onChange,
  defaultExpanded = false,
  className,
}: TranslationSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const editor = useEditor({
    extensions: [StarterKit],
    content: mounted ? (value.description || '') : '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange({
        ...value,
        description: editor.getHTML(),
      })
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[200px] p-4 focus:outline-none',
      },
    },
  })

  // Update editor when value changes externally (only after mount)
  useEffect(() => {
    if (!mounted || !editor) return
    
    if (value.description && value.description !== editor.getHTML()) {
      // Use setTimeout to avoid setState during render
      const timeoutId = setTimeout(() => {
        editor.commands.setContent(value.description || '')
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [editor, value.description, mounted])

  return (
    <Card className={cn('overflow-hidden', className)} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Languages className="h-5 w-5 text-neutral-400" />
            <h3 className="font-semibold">{localeLabels[locale]}</h3>
          </div>
          <Button type="button" variant="ghost" size="sm">
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`name-${locale}`}>الاسم *</Label>
            <Input
              id={`name-${locale}`}
              value={value.name || ''}
              onChange={(e) => onChange({ ...value, name: e.target.value })}
              placeholder={`Enter name in ${localeLabels[locale]}`}
              dir={locale === 'ar' ? 'rtl' : 'ltr'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`shortDescription-${locale}`}>وصف مختصر</Label>
            <Textarea
              id={`shortDescription-${locale}`}
              value={value.shortDescription || ''}
              onChange={(e) => onChange({ ...value, shortDescription: e.target.value })}
              placeholder={`Short description in ${localeLabels[locale]}`}
              rows={3}
              dir={locale === 'ar' ? 'rtl' : 'ltr'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`description-${locale}`}>الوصف الكامل (HTML)</Label>
            <div className="border border-neutral-200 rounded-md overflow-hidden">
              <div className="border-b border-neutral-200 p-2 bg-neutral-50 flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={editor?.isActive('bold') ? 'bg-neutral-200' : ''}
                  disabled={!editor}
                >
                  <strong>B</strong>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={editor?.isActive('italic') ? 'bg-neutral-200' : ''}
                  disabled={!editor}
                >
                  <em>I</em>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={editor?.isActive('bulletList') ? 'bg-neutral-200' : ''}
                  disabled={!editor}
                >
                  •
                </Button>
              </div>
              {mounted && editor ? (
                <EditorContent editor={editor} />
              ) : (
                <div className="min-h-[200px] p-4 bg-neutral-50 flex items-center justify-center">
                  <p className="text-sm text-neutral-500">جاري التحميل...</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
