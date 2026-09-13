import { act, fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import i18n, { LANGUAGE_STORAGE_KEY } from '../lib/i18n'
import { renderWithProviders } from '../test/render'
import { App } from './App'

describe('App shell', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('uk'))
  })

  it('redirects the root route to the calculator in Ukrainian by default', () => {
    renderWithProviders(<App />)
    expect(screen.getByRole('heading', { name: 'Калькулятор доз' })).toBeInTheDocument()
  })

  it('navigates to the diseases page', () => {
    renderWithProviders(<App />)
    fireEvent.click(screen.getByRole('link', { name: 'Захворювання' }))
    expect(screen.getByRole('heading', { name: 'Захворювання' })).toBeInTheDocument()
  })

  it('shows disease detail for a slug route', () => {
    renderWithProviders(<App />, { route: '/diseases/dlbcl' })
    expect(screen.getByText(/«dlbcl»/)).toBeInTheDocument()
  })

  it('switches the interface language and remembers the choice', async () => {
    renderWithProviders(<App />)
    await act(async () => {
      fireEvent.click(screen.getByText('Eng'))
    })
    expect(screen.getByRole('heading', { name: 'Dose calculator' })).toBeInTheDocument()
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en')
  })

  it('renders the not-found page for unknown routes', () => {
    renderWithProviders(<App />, { route: '/nope' })
    expect(screen.getByRole('heading', { name: 'Сторінку не знайдено' })).toBeInTheDocument()
  })
})
