/**
 * Visual grid of shoot type cards. Click opens slide-over editor.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Edit, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ShootTypeEditorSheet } from './shoot-type-editor-sheet'

interface ShootTypeListItem {
  id: string
  name: string
  slug: string
  description: string | null
  nameAr: string | null
  nameZh: string | null
  icon: string | null
  coverImageUrl: string | null
  sortOrder: number
  isActive: boolean
  categoryCount: number
  recommendationCount: number
}

interface ShootTypeCardGridProps {
  items: ShootTypeListItem[]
  onUpdated: () => void
}

export function ShootTypeCardGrid({ items, onUpdated }: ShootTypeCardGridProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((st) => (
          <div
            key={st.id}
            className="group relative overflow-hidden rounded-2xl border border-border-light/60 bg-white shadow-card transition-all hover:shadow-card-hover"
          >
            <div className="relative aspect-[4/3] bg-muted">
              {st.coverImageUrl ? (
                <Image
                  src={st.coverImageUrl}
                  alt={st.name}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-muted to-muted/80 text-4xl text-muted-foreground">
                  {st.icon || '🎬'}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-0 start-0 end-0 p-3 text-white">
                <h3 className="font-semibold">{st.name}</h3>
                <p className="text-xs text-white/80">
                  {st.categoryCount} categories · {st.recommendationCount} recommendations
                </p>
              </div>
              {!st.isActive && (
                <Badge variant="secondary" className="absolute end-2 top-2">
                  Inactive
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between p-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                onClick={() => setEditingId(st.id)}
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/admin/shoot-types/${st.id}`}>Full editor</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      {editingId && (
        <ShootTypeEditorSheet
          shootTypeId={editingId}
          open={!!editingId}
          onOpenChange={(open) => !open && setEditingId(null)}
          onSaved={() => {
            setEditingId(null)
            onUpdated()
          }}
        />
      )}
    </>
  )
}
