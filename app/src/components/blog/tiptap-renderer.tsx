/**
 * Renders Tiptap JSON content to HTML with custom blocks.
 */

'use client'

import type { ReactNode } from 'react'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import { CalloutBlock } from './custom-blocks/callout'
import { GalleryBlock } from './custom-blocks/gallery'
import { VideoEmbedBlock } from './custom-blocks/video-embed'
import { TableBlock } from './custom-blocks/table-block'
import { FAQBlock } from './custom-blocks/faq-block'
import { EquipmentEmbedBlock } from './custom-blocks/equipment-embed'

interface TiptapRendererProps {
  content: unknown
  locale: string
}

function renderNode(node: Record<string, unknown>, locale: string): ReactNode {
  const type = node.type as string
  const content = node.content as Record<string, unknown>[] | undefined
  const attrs = (node.attrs ?? {}) as Record<string, unknown>

  if (!type) return null

  switch (type) {
    case 'doc':
      return content?.map((child, i) => (
        <div key={i}>{renderNode(child as Record<string, unknown>, locale)}</div>
      ))

    case 'paragraph':
      return (
        <p className="mb-4">
          {content?.map((child, i) => renderInline(child as Record<string, unknown>, i))}
        </p>
      )

    case 'heading': {
      const level = Math.min(6, Math.max(1, (attrs.level as number) ?? 2))
      const HeadingTag = (`h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6')
      return (
        <HeadingTag
          id={slugify(getTextContent(content))}
          className="mb-4 mt-8 font-bold text-gray-900 first:mt-0 scroll-mt-24"
        >
          {content?.map((child, i) => renderInline(child as Record<string, unknown>, i))}
        </HeadingTag>
      )
    }

    case 'blockquote':
      return (
        <blockquote className="my-4 border-e-4 border-brand-primary bg-gray-50 py-2 pe-4 ps-4 italic text-gray-700">
          {content?.map((child, i) => renderNode(child as Record<string, unknown>, locale))}
        </blockquote>
      )

    case 'bulletList':
      return (
        <ul className="my-4 list-disc space-y-2 ps-6">
          {content?.map((child, i) => renderNode(child as Record<string, unknown>, locale))}
        </ul>
      )

    case 'orderedList':
      return (
        <ol className="my-4 list-decimal space-y-2 ps-6">
          {content?.map((child, i) => renderNode(child as Record<string, unknown>, locale))}
        </ol>
      )

    case 'listItem':
      return (
        <li>
          {content?.map((child, i) => renderNode(child as Record<string, unknown>, locale))}
        </li>
      )

    case 'codeBlock': {
      const code = content?.[0] as Record<string, unknown> | undefined
      const text = (code?.text as string) ?? ''
      const lang = (attrs.language as string) ?? 'plaintext'
      let highlighted: string
      try {
        if (lang && hljs.getLanguage(lang)) {
          highlighted = hljs.highlight(text, { language: lang }).value
        } else {
          highlighted = hljs.highlightAuto(text).value
        }
      } catch {
        highlighted = escapeHtml(text)
      }
      return (
        <pre className="my-4 overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm">
          <code
            className="hljs"
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </pre>
      )
    }

    case 'image':
      return (
        <figure className="my-6">
          <img
            src={attrs.src as string}
            alt={(attrs.alt as string) ?? ''}
            className="rounded-lg"
          />
          {attrs.caption != null && String(attrs.caption) !== '' && (
            <figcaption className="mt-2 text-center text-sm text-gray-500">
              {String(attrs.caption)}
            </figcaption>
          )}
        </figure>
      )

    case 'horizontalRule':
      return <hr className="my-8 border-gray-200" />

    case 'callout':
      return (
        <CalloutBlock
          variant={(attrs.variant as 'info' | 'warning' | 'success' | 'error') ?? 'info'}
          title={attrs.title as string | undefined}
          content={(attrs.content as string) ?? ''}
        />
      )

    case 'gallery':
      return (
        <GalleryBlock
          images={(attrs.images as { src: string; alt?: string; caption?: string }[]) ?? []}
          columns={(attrs.columns as 2 | 3 | 4) ?? 3}
        />
      )

    case 'videoEmbed':
      return (
        <VideoEmbedBlock
          url={(attrs.url as string) ?? ''}
          caption={attrs.caption as string | undefined}
        />
      )

    case 'table':
      return <TableBlock rows={(attrs.rows as string[][]) ?? []} />

    case 'faq':
      return <FAQBlock items={(attrs.items as { question: string; answer: string }[]) ?? []} />

    case 'equipmentEmbed':
      return (
        <EquipmentEmbedBlock
          equipmentId={(attrs.equipmentId as string) ?? ''}
          name={attrs.name as string | undefined}
          imageUrl={attrs.imageUrl as string | undefined}
          pricePerDay={attrs.pricePerDay as number | undefined}
          slug={attrs.slug as string | undefined}
          note={attrs.note as string | undefined}
        />
      )

    default:
      if (content) {
        return content.map((child, i) => renderNode(child as Record<string, unknown>, locale))
      }
      return null
  }
}

function getTextContent(content: Record<string, unknown>[] | undefined): string {
  if (!content) return ''
  return content
    .map((c) => {
      if ((c as Record<string, unknown>).text) return (c as Record<string, unknown>).text as string
      const inner = (c as Record<string, unknown>).content as Record<string, unknown>[] | undefined
      return inner ? getTextContent(inner) : ''
    })
    .join('')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

function renderInline(node: Record<string, unknown>, key: number): React.ReactNode {
  const type = node.type as string
  const content = node.content as Record<string, unknown>[] | undefined
  const text = node.text as string | undefined

  if (type === 'text') {
    const marks = (node.marks ?? []) as Array<{ type: string; attrs?: Record<string, unknown> }>
    let el: React.ReactNode = text ?? ''
    for (const mark of marks.reverse()) {
      if (mark.type === 'bold') el = <strong key={key}>{el}</strong>
      else if (mark.type === 'italic') el = <em key={key}>{el}</em>
      else if (mark.type === 'link')
        el = (
          <a
            href={mark.attrs?.href as string}
            className="text-brand-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
            key={key}
          >
            {el}
          </a>
        )
      else if (mark.type === 'code')
        el = (
          <code
            className="rounded bg-gray-100 px-1.5 py-0.5 text-sm"
            key={key}
          >
            {el}
          </code>
        )
    }
    return el
  }

  if (content) {
    return content.map((c, i) => renderInline(c as Record<string, unknown>, i))
  }
  return null
}

export function TiptapRenderer({ content, locale }: TiptapRendererProps) {
  if (!content || typeof content !== 'object') return null
  const doc = content as Record<string, unknown>
  const node = doc.type === 'doc' ? doc : { type: 'doc', content: [content] }
  return <div className="blog-content">{renderNode(node, locale)}</div>
}
