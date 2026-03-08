/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../accordion'

describe('Accordion', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Trigger</AccordionTrigger>
          <AccordionContent>Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    expect(container).toBeTruthy()
  })

  it('renders with minimal required props', () => {
    render(
      <Accordion type="single" collapsible defaultValue="item-1">
        <AccordionItem value="item-1">
          <AccordionTrigger>Section 1</AccordionTrigger>
          <AccordionContent>Section 1 content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )
    expect(screen.getByText('Section 1')).toBeTruthy()
    expect(screen.getByText('Section 1 content')).toBeTruthy()
  })
})
