import { act, fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import i18n from '../lib/i18n'
import { renderWithProviders } from '../test/render'
import { AppErrorBoundary } from './AppErrorBoundary'

function Boom(): never {
  throw new Error('boom')
}

describe('AppErrorBoundary', () => {
  it('shows a recoverable message instead of a blank page', async () => {
    await act(() => i18n.changeLanguage('uk'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    renderWithProviders(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>,
    )

    expect(screen.getByText('Щось пішло не так')).toBeInTheDocument()
    expect(screen.getByText('boom')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Очистити збережену копію й перезавантажити' }),
    ).toBeInTheDocument()
    consoleError.mockRestore()
  })

  it('renders its children when nothing throws', () => {
    renderWithProviders(
      <AppErrorBoundary>
        <p>усе гаразд</p>
      </AppErrorBoundary>,
    )
    expect(screen.getByText('усе гаразд')).toBeInTheDocument()
    expect(fireEvent).toBeDefined()
  })
})
