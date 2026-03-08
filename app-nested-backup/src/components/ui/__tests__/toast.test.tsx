/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
} from '../toast'

describe('Toast', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ToastProvider>
        <Toast open>
          <ToastTitle>Title</ToastTitle>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    )
    expect(container).toBeTruthy()
  })

  it('renders toast content when open', () => {
    render(
      <ToastProvider>
        <Toast open>
          <ToastTitle>Notification</ToastTitle>
          <ToastDescription>Message</ToastDescription>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    )
    expect(screen.getByText('Notification')).toBeTruthy()
    expect(screen.getByText('Message')).toBeTruthy()
  })
})
