/**
 * Category badge for blog posts.
 */

import Link from 'next/link'

interface CategoryBadgeProps {
  nameAr: string
  nameEn: string
  slug: string
  locale: string
  variant?: 'default' | 'outline'
  clickable?: boolean
  className?: string
}

export function CategoryBadge({
  nameAr,
  nameEn,
  slug,
  locale,
  variant = 'default',
  clickable = true,
  className = '',
}: CategoryBadgeProps) {
  const name = locale === 'ar' ? nameAr : nameEn
  const baseClass = 'inline-block rounded-full px-4 py-1.5 text-sm font-medium transition-colors'
  const variantClass =
    variant === 'outline'
      ? 'border border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white'
      : 'bg-brand-primary/90 text-white hover:bg-brand-primary'
  const classNames = `${baseClass} ${variantClass} ${className}`

  if (!clickable) {
    return <span className={classNames}>{name}</span>
  }

  return (
    <Link
      href={`/blog/category/${slug}`}
      className={classNames}
      aria-label={name}
    >
      {name}
    </Link>
  )
}
