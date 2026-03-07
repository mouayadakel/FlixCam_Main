/**
 * FAQ block - expandable accordion.
 */

'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

interface FAQItem {
  question: string
  answer: string
}

interface FAQBlockProps {
  items: FAQItem[]
}

export function FAQBlock({ items }: FAQBlockProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  return (
    <div className="my-8 space-y-2">
      {items.map((item, i) => (
        <Collapsible
          key={i}
          open={openIndex === i}
          onOpenChange={(open) => setOpenIndex(open ? i : null)}
        >
          <div className="rounded-lg border border-gray-200 bg-white">
            <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-start font-medium text-gray-900 hover:bg-gray-50">
              {item.question}
              <ChevronDown
                className={cn('h-4 w-4 transition-transform', openIndex === i && 'rotate-180')}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t border-gray-200 px-4 py-3 text-gray-600">
                {item.answer}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}
    </div>
  )
}
