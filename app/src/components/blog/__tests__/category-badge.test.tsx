/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { CategoryBadge } from '../category-badge'

jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) {
    return <a href={href}>{children}</a>
  }
})

describe('CategoryBadge', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <CategoryBadge
        nameAr="كاميرات"
        nameEn="Cameras"
        slug="cameras"
        locale="en"
      />
    )
    expect(container).toBeTruthy()
  })

  it('displays English name when locale is en', () => {
    render(
      <CategoryBadge
        nameAr="كاميرات"
        nameEn="Cameras"
        slug="cameras"
        locale="en"
      />
    )
    expect(screen.getByText('Cameras')).toBeTruthy()
  })

  it('displays Arabic name when locale is ar', () => {
    render(
      <CategoryBadge
        nameAr="كاميرات"
        nameEn="Cameras"
        slug="cameras"
        locale="ar"
      />
    )
    expect(screen.getByText('كاميرات')).toBeTruthy()
  })

  it('renders as link when clickable', () => {
    render(
      <CategoryBadge
        nameAr="كاميرات"
        nameEn="Cameras"
        slug="cameras"
        locale="en"
        clickable={true}
      />
    )
    const link = screen.getByRole('link', { name: 'Cameras' })
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toBe('/blog/category/cameras')
  })

  it('renders as span when not clickable', () => {
    render(
      <CategoryBadge
        nameAr="كاميرات"
        nameEn="Cameras"
        slug="cameras"
        locale="en"
        clickable={false}
      />
    )
    expect(screen.getByText('Cameras')).toBeTruthy()
    expect(screen.queryByRole('link')).toBeNull()
  })
})
