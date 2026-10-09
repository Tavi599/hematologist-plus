import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '../../test/render'
import { ThemeToggle } from './ThemeToggle'

describe('ThemeToggle', () => {
  it('walks from the system theme to light, dark and back, and applies each one', () => {
    renderWithProviders(<ThemeToggle />)
    const button = () => screen.getByRole('button', { name: /тема/i })

    expect(button()).toHaveAccessibleName(/як у системі/)
    fireEvent.click(button())
    expect(document.documentElement).toHaveAttribute('data-mantine-color-scheme', 'light')
    fireEvent.click(button())
    expect(document.documentElement).toHaveAttribute('data-mantine-color-scheme', 'dark')
    expect(window.localStorage.getItem('mantine-color-scheme-value')).toBe('dark')
    fireEvent.click(button())
    expect(button()).toHaveAccessibleName(/як у системі/)
  })
})
