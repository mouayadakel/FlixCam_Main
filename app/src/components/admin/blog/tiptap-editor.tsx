/**
 * Tiptap editor with StarterKit, Image, Link. Toolbar: bold, italic, headings, lists, blockquote, code, image.
 */

'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { useCallback, useEffect, useState } from 'react'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Code,
  ImageIcon,
  Link2,
  Heading1,
  Heading2,
  Heading3,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TiptapEditorProps {
  content: Record<string, unknown> | null
  onChange: (content: Record<string, unknown>) => void
  placeholder?: string
  onImageUpload?: () => Promise<string | null>
  className?: string
}

function Toolbar({ editor }: { editor: Editor | null }) {
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  const addImage = useCallback(async () => {
    if (!editor) return
    const url = imageUrl.trim()
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
      setImageUrl('')
      return
    }
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/admin/blog/upload-image', { method: 'POST', body: formData })
        if (!res.ok) throw new Error('Upload failed')
        const { url: uploadedUrl } = await res.json()
        editor.chain().focus().setImage({ src: uploadedUrl }).run()
      } catch (err) {
        console.error(err)
      } finally {
        setUploading(false)
      }
    }
    input.click()
  }, [editor, imageUrl])

  if (!editor) return null

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/30 px-2 py-1.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        data-active={editor.isActive('bold')}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        data-active={editor.isActive('italic')}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <span className="mx-1 h-4 w-px bg-border" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        data-active={editor.isActive('heading', { level: 1 })}
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        data-active={editor.isActive('heading', { level: 2 })}
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        data-active={editor.isActive('heading', { level: 3 })}
      >
        <Heading3 className="h-4 w-4" />
      </Button>
      <span className="mx-1 h-4 w-px bg-border" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        data-active={editor.isActive('bulletList')}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        data-active={editor.isActive('orderedList')}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        data-active={editor.isActive('blockquote')}
      >
        <Quote className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        data-active={editor.isActive('codeBlock')}
      >
        <Code className="h-4 w-4" />
      </Button>
      <span className="mx-1 h-4 w-px bg-border" />
      <div className="flex items-center gap-1">
        <input
          type="text"
          placeholder="Image URL"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="h-8 w-32 rounded border border-input bg-background px-2 text-xs"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={addImage}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}

export function TiptapEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  className,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { target: '_blank', rel: 'noopener' } }),
    ],
    content: content ?? { type: 'doc', content: [] },
    editorProps: {
      attributes: {
        class: 'min-h-[280px] max-w-none px-4 py-3 prose prose-sm dark:prose-invert focus:outline-none',
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    const handler = () => {
      onChange(editor.getJSON() as Record<string, unknown>)
    }
    editor.on('update', handler)
    return () => {
      editor.off('update', handler)
    }
  }, [editor, onChange])

  return (
    <div className={cn('overflow-hidden rounded-lg border border-input', className)}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}
