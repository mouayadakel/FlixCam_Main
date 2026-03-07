'use client'

import { cn } from '@/lib/utils'
import { Check, AlertCircle, Circle } from 'lucide-react'

export interface SectionStatus {
  id: string
  label: string
  status: 'complete' | 'warning' | 'empty'
  detail?: string
}

interface FormProgressSidebarProps {
  sections: SectionStatus[]
  activeSection: string
  onSectionClick: (id: string) => void
  className?: string
  children?: React.ReactNode
}

export function FormProgressSidebar({
  sections,
  activeSection,
  onSectionClick,
  className,
  children,
}: FormProgressSidebarProps) {
  const completed = sections.filter((s) => s.status === 'complete').length
  const total = sections.length
  const percentage = Math.round((completed / total) * 100)

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium">اكتمال النموذج</span>
          <span className="text-muted-foreground">{percentage}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <nav className="space-y-1">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => onSectionClick(section.id)}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-3 py-2 text-end text-sm transition-colors',
              activeSection === section.id
                ? 'bg-primary/10 font-medium text-primary'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {section.status === 'complete' ? (
              <Check className="h-4 w-4 shrink-0 text-green-600" />
            ) : section.status === 'warning' ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
            )}
            <span className="truncate">{section.label}</span>
            {section.detail && (
              <span className="me-auto text-xs text-muted-foreground">{section.detail}</span>
            )}
          </button>
        ))}
      </nav>

      {children}
    </div>
  )
}
