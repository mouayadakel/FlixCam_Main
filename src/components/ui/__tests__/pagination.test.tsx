/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '../pagination'

describe('Pagination', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="#">1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
    expect(container).toBeTruthy()
  })

  it('renders with minimal required props', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href="/page/1">1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
    expect(screen.getByRole('navigation', { name: 'pagination' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '1' })).toBeTruthy()
  })
})
