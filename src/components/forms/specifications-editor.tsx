/**
 * @file specifications-editor.tsx
 * @description Multi-mode specifications editor (JSON, Key-Value, Structured, HTML)
 * @module components/forms
 */

'use client'

import { useState, useEffect } from 'react'
import { Code, List, FileText, Type, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

type SpecMode = 'json' | 'keyvalue' | 'structured' | 'html'

interface SpecificationsEditorProps {
  value?: Record<string, unknown>
  onChange: (value: Record<string, unknown>) => void
  label?: string
  className?: string
}

interface KeyValuePair {
  key: string
  value: string
}

const structuredFields = [
  { id: 'resolution', label: 'Resolution', placeholder: 'e.g., 4K, 1080p' },
  { id: 'weight', label: 'Weight', placeholder: 'e.g., 700g, 1.2kg' },
  { id: 'dimensions', label: 'Dimensions', placeholder: 'e.g., 120x80x50mm' },
  { id: 'sensor', label: 'Sensor', placeholder: 'e.g., Full Frame, APS-C' },
  { id: 'iso', label: 'ISO Range', placeholder: 'e.g., 100-51200' },
  { id: 'lensMount', label: 'Lens Mount', placeholder: 'e.g., E-Mount, EF' },
  { id: 'battery', label: 'Battery', placeholder: 'e.g., NP-FZ100' },
  { id: 'connectivity', label: 'Connectivity', placeholder: 'e.g., WiFi, Bluetooth' },
]

export function SpecificationsEditor({
  value = {},
  onChange,
  label = 'Specifications',
  className,
}: SpecificationsEditorProps) {
  const [mode, setMode] = useState<SpecMode>('keyvalue')
  const [jsonText, setJsonText] = useState('')
  const [keyValuePairs, setKeyValuePairs] = useState<KeyValuePair[]>([])
  const [structuredData, setStructuredData] = useState<Record<string, string>>({})
  const [htmlContent, setHtmlContent] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const htmlEditor = useEditor({
    extensions: [StarterKit],
    content: mounted ? htmlContent : '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML()
      setHtmlContent(newContent)
      onChange({ html: newContent, mode: 'html' })
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[200px] p-4 focus:outline-none',
      },
    },
  })

  // Initialize from value
  useEffect(() => {
    if (!mounted) return

    if (!value || Object.keys(value).length === 0) {
      setKeyValuePairs([{ key: '', value: '' }])
      setJsonText('{}')
      setStructuredData({})
      setHtmlContent('')
      if (htmlEditor) {
        const timeoutId = setTimeout(() => {
          htmlEditor.commands.setContent('')
        }, 0)
        return () => clearTimeout(timeoutId)
      }
      return
    }

    // Detect mode from value
    if (value.mode === 'html' || value.html) {
      setMode('html')
      const html = (value.html as string) || ''
      setHtmlContent(html)
      if (htmlEditor && html !== htmlEditor.getHTML()) {
        const timeoutId = setTimeout(() => {
          htmlEditor.commands.setContent(html)
        }, 0)
        return () => clearTimeout(timeoutId)
      }
    } else if (value.mode === 'structured') {
      setMode('structured')
      setStructuredData(value as Record<string, string>)
    } else {
      // Try to parse as key-value or JSON
      try {
        const pairs: KeyValuePair[] = []
        Object.entries(value).forEach(([key, val]) => {
          if (key !== 'mode' && key !== 'html') {
            pairs.push({ key, value: String(val) })
          }
        })
        if (pairs.length > 0) {
          setMode('keyvalue')
          setKeyValuePairs(pairs.length > 0 ? pairs : [{ key: '', value: '' }])
        } else {
          setMode('json')
          setJsonText(JSON.stringify(value, null, 2))
        }
      } catch {
        setMode('json')
        setJsonText(JSON.stringify(value, null, 2))
      }
    }
  }, [value, htmlEditor, mounted])

  const handleJsonChange = (text: string) => {
    setJsonText(text)
    try {
      const parsed = JSON.parse(text)
      onChange(parsed)
    } catch {
      // Invalid JSON, don't update
    }
  }

  const handleKeyValueChange = (index: number, field: 'key' | 'value', newValue: string) => {
    const newPairs = [...keyValuePairs]
    newPairs[index] = { ...newPairs[index], [field]: newValue }
    setKeyValuePairs(newPairs)

    // Convert to object
    const obj: Record<string, unknown> = { mode: 'keyvalue' }
    newPairs.forEach((pair) => {
      if (pair.key.trim()) {
        obj[pair.key] = pair.value
      }
    })
    onChange(obj)
  }

  const handleAddKeyValue = () => {
    setKeyValuePairs([...keyValuePairs, { key: '', value: '' }])
  }

  const handleRemoveKeyValue = (index: number) => {
    if (keyValuePairs.length > 1) {
      const newPairs = keyValuePairs.filter((_, i) => i !== index)
      setKeyValuePairs(newPairs)

      // Update onChange
      const obj: Record<string, unknown> = { mode: 'keyvalue' }
      newPairs.forEach((pair) => {
        if (pair.key.trim()) {
          obj[pair.key] = pair.value
        }
      })
      onChange(obj)
    }
  }

  const handleStructuredChange = (field: string, newValue: string) => {
    const newData = { ...structuredData, [field]: newValue, mode: 'structured' }
    setStructuredData(newData)
    onChange(newData)
  }

  return (
    <div className={cn('space-y-4', className)} dir="rtl">
      <Label>{label}</Label>

      <Tabs value={mode} onValueChange={(v) => setMode(v as SpecMode)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="keyvalue">
            <List className="ml-2 h-4 w-4" />
            Key-Value
          </TabsTrigger>
          <TabsTrigger value="structured">
            <FileText className="ml-2 h-4 w-4" />
            Structured
          </TabsTrigger>
          <TabsTrigger value="json">
            <Code className="ml-2 h-4 w-4" />
            JSON
          </TabsTrigger>
          <TabsTrigger value="html">
            <Type className="ml-2 h-4 w-4" />
            HTML
          </TabsTrigger>
        </TabsList>

        <TabsContent value="keyvalue" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {keyValuePairs.map((pair, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Key"
                      value={pair.key}
                      onChange={(e) => handleKeyValueChange(index, 'key', e.target.value)}
                      className="flex-1"
                      dir="ltr"
                    />
                    <Input
                      placeholder="Value"
                      value={pair.value}
                      onChange={(e) => handleKeyValueChange(index, 'value', e.target.value)}
                      className="flex-1"
                      dir="ltr"
                    />
                    {keyValuePairs.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveKeyValue(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={handleAddKeyValue}>
                  <Plus className="ml-2 h-4 w-4" />
                  إضافة حقل
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="structured" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {structuredFields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={`spec-${field.id}`}>{field.label}</Label>
                    <Input
                      id={`spec-${field.id}`}
                      value={structuredData[field.id] || ''}
                      onChange={(e) => handleStructuredChange(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      dir="ltr"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="json" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <Textarea
                value={jsonText}
                onChange={(e) => handleJsonChange(e.target.value)}
                placeholder='{"resolution": "4K", "weight": "700g"}'
                rows={15}
                className="font-mono text-sm"
                dir="ltr"
              />
              <p className="mt-2 text-xs text-neutral-500">
                أدخل JSON صالح. مثال: {`{"resolution": "4K", "weight": "700g"}`}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="html" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="border border-neutral-200 rounded-md overflow-hidden">
                <div className="border-b border-neutral-200 p-2 bg-neutral-50 flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => htmlEditor?.chain().focus().toggleBold().run()}
                    className={htmlEditor?.isActive('bold') ? 'bg-neutral-200' : ''}
                  >
                    <strong>B</strong>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => htmlEditor?.chain().focus().toggleItalic().run()}
                    className={htmlEditor?.isActive('italic') ? 'bg-neutral-200' : ''}
                  >
                    <em>I</em>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => htmlEditor?.chain().focus().toggleBulletList().run()}
                    className={htmlEditor?.isActive('bulletList') ? 'bg-neutral-200' : ''}
                  >
                    •
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => htmlEditor?.chain().focus().toggleOrderedList().run()}
                    className={htmlEditor?.isActive('orderedList') ? 'bg-neutral-200' : ''}
                  >
                    1.
                  </Button>
                </div>
                {mounted && htmlEditor ? (
                  <EditorContent editor={htmlEditor} />
                ) : (
                  <div className="min-h-[200px] p-4 bg-neutral-50 flex items-center justify-center">
                    <p className="text-sm text-neutral-500">جاري التحميل...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
