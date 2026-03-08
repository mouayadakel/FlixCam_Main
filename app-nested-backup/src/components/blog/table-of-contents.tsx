/**
 * Table of contents - extracted from headings in content.
 */

'use client'

import { useEffect, useState } from 'react'

interface TocItem {
  id: string
  text: string
  level: number
}

interface TableOfContentsProps {
  content: unknown
  locale: string
}

function extractHeadings(doc: Record<string, unknown>): TocItem[] {
  const items: TocItem[] = []
  const content = doc.content as Record<string, unknown>[] | undefined
  if (!content) return items

  function walk(nodes: Record<string, unknown>[]) {
    for (const node of nodes) {
      const type = node.type as string
      if (type === 'heading') {
        const level = (node.attrs as Record<string, unknown>)?.level as number ?? 2
        const text = getTextFromNode(node)
        const id = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim()
        if (id) items.push({ id, text, level })
      }
      const inner = node.content as Record<string, unknown>[] | undefined
      if (inner) walk(inner)
    }
  }

  function getTextFromNode(n: Record<string, unknown>): string {
    const t = (n as Record<string, unknown>).text
    if (typeof t === 'string') return t
    const c = n.content as Record<string, unknown>[] | undefined
    if (!c) return ''
    return c.map((x) => getTextFromNode(x as Record<string, unknown>)).join('')
  }

  walk(content)
  return items
}

export function TableOfContents({ content, locale }: TableOfContentsProps) {
  const [items, setItems] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (!content || typeof content !== 'object') return
    const doc = (content as Record<string, unknown>).type === 'doc'
      ? (content as Record<string, unknown>)
      : { type: 'doc', content: [content] }
    setItems(extractHeadings(doc))
  }, [content])

  useEffect(() => {
    if (items.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActiveId(e.target.id)
            break
          }
        }
      },
      { rootMargin: '-80px 0px -80% 0px' }
    )
    items.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [items])

  if (items.length === 0) return null

  const label = locale === 'ar' ? 'محتويات المقال' : 'Table of contents'

  return (
    <nav className="sticky top-24 hidden lg:block" aria-label={label}>
      <h3 className="mb-3 text-sm font-semibold text-gray-900">{label}</h3>
      <ul className="space-y-2 border-s-2 border-gray-200 ps-4">
        {items.map((item) => (
          <li
            key={item.id}
            className="text-sm"
            style={{ marginLeft: `${(item.level - 2) * 8}px` }}
          >
            <a
              href={`#${item.id}`}
              className={`block py-1 transition-colors hover:text-brand-primary ${
                activeId === item.id ? 'font-medium text-brand-primary' : 'text-gray-600'
              }`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
