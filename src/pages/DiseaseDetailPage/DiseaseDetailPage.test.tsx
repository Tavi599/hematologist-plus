import { act, fireEvent, screen, within } from '@testing-library/react'
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

  it('names the lines and the article in a bar, and folds every line from it', async () => {
    window.localStorage.clear()
    const view = renderWithProviders(<DiseaseDetailPage />, {
      route: '/diseases/dlbcl',
      path: '/diseases/:slug',
    })
    const bar = await screen.findByRole('navigation', { name: 'Розділи сторінки' })
    expect(within(bar).getByRole('button', { name: 'Перша лінія' })).toBeInTheDocument()
    expect(within(bar).getByRole('button', { name: 'Стаття' })).toBeInTheDocument()

    fireEvent.click(within(bar).getByRole('button', { name: 'Згорнути всі' }))
    expect(screen.getByRole('link', { name: 'R-CHOP-21', hidden: true })).not.toBeVisible()
    expect(within(bar).getByRole('button', { name: 'Розгорнути всі' })).toBeInTheDocument()

    // Folded lines are remembered for the next visit to the disease.
    view.unmount()
    renderWithProviders(<DiseaseDetailPage />, {
      route: '/diseases/dlbcl',
      path: '/diseases/:slug',
    })
    await screen.findByRole('navigation', { name: 'Розділи сторінки' })
    expect(screen.getByRole('link', { name: 'R-CHOP-21', hidden: true })).not.toBeVisible()

    // Going to a folded line opens it.
    fireEvent.click(screen.getByRole('button', { name: 'Перша лінія' }))
    expect(screen.getByRole('link', { name: 'R-CHOP-21' })).toBeVisible()
    window.localStorage.clear()
  })

  it('reports an unknown disease', async () => {
    renderWithProviders(<DiseaseDetailPage />, { route: '/diseases/nope', path: '/diseases/:slug' })
    expect(await screen.findByText(/«nope»/)).toBeInTheDocument()
  })
})
