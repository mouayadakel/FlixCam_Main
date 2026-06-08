'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { FileSpreadsheet, Loader2 } from 'lucide-react'

export function GenerateFullInventoryButton() {
  const [isGenerating, setIsGenerating] = useState(false)

  const onGenerate = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/admin/inventory/full-export', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to generate inventory file')
      }

      toast({
        title: 'Full inventory file created',
        description: `Generated ${data.fileName}. Download will start now.`,
      })

      window.location.href = '/api/admin/inventory/full-export?download=1'
    } catch (err: any) {
      toast({
        title: 'Generation failed',
        description: err?.message || 'Unable to generate full inventory file',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={onGenerate}
      disabled={isGenerating}
      aria-label="Generate full inventory excel"
    >
      {isGenerating ? (
        <Loader2 className="me-2 h-4 w-4 animate-spin" />
      ) : (
        <FileSpreadsheet className="me-2 h-4 w-4" />
      )}
      {isGenerating ? 'Generating Full Excel...' : 'Generate Full Inventory Excel'}
    </Button>
  )
}
