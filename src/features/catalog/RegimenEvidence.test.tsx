import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { Regimen } from '../../schemas/catalog'
import { renderWithProviders } from '../../test/render'

import { RegimenEvidence } from './RegimenEvidence'

const regimen = (overrides: Partial<Regimen>): Regimen => ({
  id: 'bbd',
  short_name: 'BBD',
  name: { uk: 'BBD', en: 'BBD' },
  description: { uk: 'Рецидивна мієлома.', en: 'Relapsed myeloma.' },
  cycle_length_days: 28,
  default_cycles: 8,
  print_forms: { version: 1, forms: [] },
  sort_order: 0,
  sources: [{ name: 'Blood. 2014;123(7):985-991', checkedOn: '2026-10-03' }],
  evidence: null,
  ...overrides,
})

describe('RegimenEvidence', () => {
  it('warns that a trial regimen is not a protocol and shows what the study was', () => {
    renderWithProviders(
      <RegimenEvidence
        regimen={regimen({
          evidence: {
            design: { uk: 'Фаза II, 79 пацієнтів.', en: 'Phase II, 79 patients.' },
            results: { uk: 'Загальна відповідь 60,8%.', en: 'Overall response 60.8%.' },
          },
        })}
      />,
    )

    expect(screen.getByText(/Схема з клінічного дослідження: BBD/)).toBeInTheDocument()
    expect(screen.getByText(/не з настанови чи інструкції/)).toBeInTheDocument()
    expect(screen.getByText('Фаза II, 79 пацієнтів.')).toBeInTheDocument()
    expect(screen.getByText('Загальна відповідь 60,8%.')).toBeInTheDocument()
    // Only the two fields that are filled; the other two say nothing and are left out.
    expect(screen.queryByText('Пацієнти')).not.toBeInTheDocument()
    expect(screen.queryByText('Особливості проведення')).not.toBeInTheDocument()
  })

  it('shows a protocol regimen without the warning', () => {
    renderWithProviders(<RegimenEvidence regimen={regimen({})} />)

    expect(screen.getByText(/^Схема: BBD$/)).toBeInTheDocument()
    expect(screen.queryByText(/не з настанови чи інструкції/)).not.toBeInTheDocument()
    expect(screen.getByText('Рецидивна мієлома.')).toBeInTheDocument()
  })

  it('does not call a protocol regimen a trial when the cached row predates the column', () => {
    // A catalog persisted to IndexedDB before the migration has no evidence key at all.
    const { evidence: _absent, ...cached } = regimen({})
    renderWithProviders(<RegimenEvidence regimen={cached as Regimen} />)

    expect(screen.getByText(/^Схема: BBD$/)).toBeInTheDocument()
    expect(screen.queryByText(/не з настанови чи інструкції/)).not.toBeInTheDocument()
  })

  it('renders nothing when there is nothing to say', () => {
    renderWithProviders(<RegimenEvidence regimen={regimen({ description: null, sources: [] })} />)

    expect(screen.queryByText(/BBD/)).not.toBeInTheDocument()
  })
})
