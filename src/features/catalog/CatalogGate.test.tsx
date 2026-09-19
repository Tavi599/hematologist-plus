import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import i18n from '../../lib/i18n'
import { renderWithProviders } from '../../test/render'
import { CatalogGate } from './CatalogGate'

const state = vi.hoisted(() => ({
  query: {} as Record<string, unknown>,
  reinstalled: 0,
}))

vi.mock('../../lib/use-catalog', () => ({
  isCatalogConfigured: true,
  useCatalog: () => state.query,
}))

vi.mock('../../lib/app-refresh', () => ({
  reinstallApp: () => {
    state.reinstalled += 1
    return Promise.resolve()
  },
}))

describe('CatalogGate', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('uk')
    state.reinstalled = 0
  })

  it('offers to reinstall the app when the catalog cannot be read', () => {
    // What an installed copy sees after a migration it is too old to understand.
    state.query = {
      isError: true,
      error: new Error('drug_infusion_params: invalid data at 0: Unrecognized key: "rate_ramp"'),
    }
    renderWithProviders(<CatalogGate>{() => <div>catalog</div>}</CatalogGate>)

    expect(screen.getByText(/Unrecognized key/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Оновити програму' }))
    expect(state.reinstalled).toBe(1)
  })

  it('shows the catalog when it loads', () => {
    state.query = { data: { rows: {} } }
    renderWithProviders(<CatalogGate>{() => <div>catalog</div>}</CatalogGate>)
    expect(screen.getByText('catalog')).toBeInTheDocument()
  })
})
