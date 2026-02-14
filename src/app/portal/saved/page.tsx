/**
 * Saved gear / wishlist – list and remove saved equipment.
 */

'use client'

import { useState, useEffect } from 'react'
import { SavedGearList } from '@/components/features/saved/saved-gear-list'

interface SavedItem {
  id: string
  savedAt: string
  equipment: {
    id: string
    sku: string
    model: string | null
    dailyPrice: number
    quantityAvailable: number
    category?: { id: string; name: string; slug: string }
    brand?: { id: string; name: string; slug: string } | null
    media: Array<{ id: string; url: string; type: string }>
  }
}

export default function PortalSavedPage() {
  const [items, setItems] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/user/saved-gear')
      const data = await res.json()
      setItems(res.ok ? (data.data ?? []) : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleRemove = async (equipmentId: string) => {
    setRemovingId(equipmentId)
    try {
      const res = await fetch(`/api/user/saved-gear?equipmentId=${encodeURIComponent(equipmentId)}`, {
        method: 'DELETE',
      })
      if (res.ok) setItems((prev) => prev.filter((i) => i.equipment.id !== equipmentId))
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Saved Gear</h1>
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <SavedGearList items={items} onRemove={handleRemove} removingId={removingId} />
      )}
    </div>
  )
}
