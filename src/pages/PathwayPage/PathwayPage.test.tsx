import { act, fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { demoCatalog } from '../../lib/catalog.fixture'
import i18n from '../../lib/i18n'
import type { SyncRows, TreatmentNode } from '../../schemas/catalog'
import { renderWithProviders } from '../../test/render'
import { PathwayPage } from './PathwayPage'

const source = vi.hoisted(() => ({ fetchTable: vi.fn() }))
vi.mock('../../lib/catalog-source', () => ({ catalogFetcher: source.fetchTable }))

const text = (uk: string) => ({ uk, en: uk })
const node = (
  id: string,
  parent: string | null,
  title: string,
  extra: Partial<TreatmentNode> = {},
) => ({
  id,
  disease_id: 'dlbcl',
  parent_id: parent,
  kind: 'group' as const,
  title: text(title),
  description: null,
  sort_order: 0,
  steps: [],
  ...extra,
})

function withPathway(): SyncRows {
  const rows = demoCatalog()
  const regimen = rows.regimens[0]!.id
  rows.treatment_nodes.push(
    node('dlbcl.nccn', null, 'Шляхи', { kind: 'pathway', description: text('Алгоритм') }),
    node('dlbcl.p1', 'dlbcl.nccn', 'Перша лінія NCCN', { kind: 'line' }),
    node('dlbcl.p1-row', 'dlbcl.p1', 'Стадія III–IV', {
      steps: [
        {
          kind: 'trial',
          column: 'treatment',
          label: text('Клінічне випробування'),
          target_id: null,
          preference: 'preferred',
          category: null,
          notes: null,
        },
        {
          kind: 'page',
          column: 'next',
          label: text('Рецидив'),
          target_id: 'dlbcl.p2-row',
          preference: null,
          category: null,
          notes: null,
        },
      ],
    }),
    node('dlbcl.p2', 'dlbcl.nccn', 'Рецидив NCCN', { kind: 'line', sort_order: 1 }),
    node('dlbcl.p2-row', 'dlbcl.p2', 'Кандидат на ТГСК', {
      steps: [
        {
          kind: 'hct',
          column: 'next',
          label: text('АутоТГСК'),
          target_id: null,
          preference: null,
          category: '2b',
          notes: null,
        },
      ],
    }),
  )
  rows.treatment_node_regimens.push({
    id: `dlbcl.p1-row.${regimen}`,
    node_id: 'dlbcl.p1-row',
    regimen_id: regimen,
    notes: null,
    sort_order: 0,
    preference: 'preferred',
    category: '1',
  })
  return rows
}

describe('PathwayPage', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('uk'))
    source.fetchTable.mockReset()
  })

  function render(rows: SyncRows) {
    source.fetchTable.mockImplementation(async (table: keyof SyncRows) => rows[table])
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
    renderWithProviders(<PathwayPage />, {
      route: '/diseases/dlbcl/pathways',
      path: '/diseases/:slug/pathways',
    })
  }

  it('shows a page as rows: group, ranked treatment with its category, next steps', async () => {
    render(withPathway())
    const row = await screen.findByRole('region', { name: 'Стадія III–IV' })
    expect(within(row).getByText('Бажано')).toBeInTheDocument()
    expect(within(row).getByText('кат. 1')).toBeInTheDocument()
    expect(within(row).getByText('Клінічне випробування')).toBeInTheDocument()
    expect(within(row).getByRole('link', { name: /R-CHOP/ })).toHaveAttribute(
      'href',
      expect.stringContaining('/calculator?regimen='),
    )
    expect(screen.queryByText('Кандидат на ТГСК')).not.toBeInTheDocument()
  })

  it('follows an arrow to the page and the row it leads to', async () => {
    render(withPathway())
    fireEvent.click(await screen.findByRole('button', { name: /Рецидив →/ }))
    const row = await screen.findByRole('region', { name: 'Кандидат на ТГСК' })
    expect(row).toHaveAttribute('data-focused', 'true')
    expect(within(row).getByText('кат. 2B')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Рецидив NCCN' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('says so when the disease has no pathway', async () => {
    render(demoCatalog())
    expect(await screen.findByText('Для цієї хвороби шляхів настанови немає.')).toBeInTheDocument()
  })
})
