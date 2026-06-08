'use client'

import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks/use-locale'

type SectionErrorBoundaryProps = {
  children: ReactNode
  /** Optional label for logging */
  section?: string
}

type SectionErrorBoundaryState = {
  error: Error | null
  retryKey: number
}

type SectionErrorBoundaryInnerProps = SectionErrorBoundaryProps & {
  title: string
  message: string
  retryLabel: string
}

class SectionErrorBoundaryInner extends Component<
  SectionErrorBoundaryInnerProps,
  SectionErrorBoundaryState
> {
  state: SectionErrorBoundaryState = { error: null, retryKey: 0 }

  static getDerivedStateFromError(error: Error): Partial<SectionErrorBoundaryState> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[SectionErrorBoundary]', this.props.section ?? 'unknown', error, info)
  }

  handleRetry = () => {
    this.setState((prev) => ({ error: null, retryKey: prev.retryKey + 1 }))
  }

  render() {
    if (this.state.error) {
      return (
        <section className="border-t border-border-light/50 bg-surface-light py-10">
          <div className="mx-auto flex max-w-lg flex-col items-center px-4 text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-destructive" aria-hidden />
            <h2 className="text-lg font-semibold text-text-heading">{this.props.title}</h2>
            <p className="mt-2 text-sm text-text-muted">{this.props.message}</p>
            <Button className="mt-4" variant="outline" onClick={this.handleRetry}>
              <RefreshCw className="ms-2 h-4 w-4" />
              {this.props.retryLabel}
            </Button>
          </div>
        </section>
      )
    }

    return <Fragment key={this.state.retryKey}>{this.props.children}</Fragment>
  }
}

export function SectionErrorBoundary({ children, section }: SectionErrorBoundaryProps) {
  const { t } = useLocale()

  return (
    <SectionErrorBoundaryInner
      section={section}
      title={t('common.error')}
      message={t('home.sectionLoadError')}
      retryLabel={t('common.retry')}
    >
      {children}
    </SectionErrorBoundaryInner>
  )
}
