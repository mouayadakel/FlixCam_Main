/**
 * Heart button to save/unsave equipment (logged-in users only).
 * Animated scale bounce on toggle with filled/outline states.
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SaveEquipmentButtonProps {
  equipmentId: string
  initialSaved?: boolean
  className?: string
}

export function SaveEquipmentButton({ equipmentId, initialSaved = false, className }: SaveEquipmentButtonProps) {
  const { data: session, status } = useSession()
  const [saved, setSaved] = useState(initialSaved)
  const [loading, setLoading] = useState(false)
  const [animating, setAnimating] = useState(false)
  const prevSaved = useRef(saved)

  useEffect(() => {
    if (saved !== prevSaved.current) {
      setAnimating(true)
      const timer = setTimeout(() => setAnimating(false), 400)
      prevSaved.current = saved
      return () => clearTimeout(timer)
    }
  }, [saved])

  if (status !== 'authenticated' || !session) return null

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    try {
      if (saved) {
        const res = await fetch(`/api/user/saved-gear?equipmentId=${encodeURIComponent(equipmentId)}`, {
          method: 'DELETE',
        })
        if (res.ok) setSaved(false)
      } else {
        const res = await fetch('/api/user/saved-gear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ equipmentId }),
        })
        if (res.ok) setSaved(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      aria-label={saved ? 'Remove from saved' : 'Save to list'}
      onClick={handleClick}
      disabled={loading}
      className={cn(
        'group/heart flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-all duration-200',
        'hover:bg-white hover:shadow-md active:scale-90',
        saved && 'bg-red-50 hover:bg-red-50',
        loading && 'opacity-60 cursor-not-allowed',
        className
      )}
    >
      <Heart
        className={cn(
          'h-[18px] w-[18px] transition-all duration-200',
          saved
            ? 'fill-red-500 text-red-500'
            : 'text-neutral-400 group-hover/heart:text-red-400',
          animating && 'animate-badge-bounce'
        )}
      />
    </button>
  )
}
