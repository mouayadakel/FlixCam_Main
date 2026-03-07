/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '../collapsible'

describe('Collapsible', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>
    )
    expect(container).toBeTruthy()
  })

  it('renders with minimal required props', () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Show more</CollapsibleTrigger>
        <CollapsibleContent>Hidden content</CollapsibleContent>
      </Collapsible>
    )
    expect(screen.getByText('Show more')).toBeTruthy()
    expect(screen.getByText('Hidden content')).toBeTruthy()
  })
})
