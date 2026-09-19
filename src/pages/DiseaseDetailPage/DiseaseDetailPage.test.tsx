import { act, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { demoCatalog } from '../../lib/catalog.fixture'
import i18n from '../../lib/i18n'
import { renderWithProviders } from '../../test/render'
import { DiseaseDetailPage } from './DiseaseDetailPage'

const source = vi.hoisted(() => ({ fetchTable: vi.fn() }))
vi.mock('../../lib/catalog-source', () => ({ catalogFetcher: source.fetchTable }))

// No Supabase session in tests: the article stays locked, which is what these tests check.
vi.mock('../../lib/auth', () => ({
  isAuthConfigured: true,
  useSessionUser: () => ({ user: null, loading: false }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

describe('DiseaseDetailPage', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('uk'))
    const catalog = demoCatalog()
    source.fetchTable.mockReset()
    source.fetchTable.mockImplementation(async (table: keyof typeof catalog) => catalog[table])
  })

  it('shows the codes and the treatment tree with a link into the calculator', async () => {
    renderWithProviders(<DiseaseDetailPage />, {
      route: '/diseases/dlbcl',
      path: '/diseases/:slug',
    })

    expect(
      await screen.findByRole('heading', { name: 'ДЕМО Дифузна В-великоклітинна лімфома' }),
    ).toBeInTheDocument()
    expect(screen.getByText('C83.3')).toBeInTheDocument()

    const tree = screen.getByText('Лікування').closest('section')!
    expect(within(tree).getByText('Перша лінія')).toBeInTheDocument()
    expect(within(tree).getByRole('link', { name: 'R-CHOP-21' })).toHaveAttribute(
      'href',
      '/calculator?regimen=r-chop-21',
    )
    expect(within(tree).getByRole('link', { name: 'Розрахувати' })).toBeInTheDocument()
  })

  it('keeps the article behind a sign-in', async () => {
    renderWithProviders(<DiseaseDetailPage />, {
      route: '/diseases/dlbcl',
      path: '/diseases/:slug',
    })
    expect(await screen.findByText('Текст статті доступний лише після входу.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Увійти' })).toBeInTheDocument()
  })

  it('reports an unknown disease', async () => {
    renderWithProviders(<DiseaseDetailPage />, { route: '/diseases/nope', path: '/diseases/:slug' })
    expect(await screen.findByText(/«nope»/)).toBeInTheDocument()
  })
})
