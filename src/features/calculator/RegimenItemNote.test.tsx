import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '../../test/render'
import { RegimenItemNote } from './RegimenItemNote'

describe('RegimenItemNote', () => {
  it('shows the regimen note in full, under its label', () => {
    renderWithProviders(
      <RegimenItemNote
        notes={{
          uk: '100 мл 0,9% NaCl за 1 годину. Перед 1-м уведенням — тест-доза за протоколом',
          en: '100 mL 0.9% NaCl over 1 hour; test dose before the first administration',
        }}
      />,
    )
    expect(screen.getByText('Примітка схеми:')).toBeInTheDocument()
    expect(screen.getByText(/тест-доза за протоколом/)).toBeInTheDocument()
  })

  it('falls back to the other language when the current one is missing', () => {
    renderWithProviders(<RegimenItemNote notes={{ en: 'Protect from light' }} />)
    expect(screen.getByText(/Protect from light/)).toBeInTheDocument()
  })

  it('shows nothing without a note or with an empty one', () => {
    const { unmount } = renderWithProviders(<RegimenItemNote notes={null} />)
    expect(screen.queryByText('Примітка схеми:')).not.toBeInTheDocument()
    unmount()
    renderWithProviders(<RegimenItemNote notes={{ uk: '', en: null }} />)
    expect(screen.queryByText('Примітка схеми:')).not.toBeInTheDocument()
  })
})
