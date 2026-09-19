import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '../../test/render'
import type { Disease } from '../../schemas/catalog'
import { DiseaseReferences } from './DiseaseReferences'

const disease = (references: Disease['references_json']): Disease => ({
  id: 'hodgkin-lymphoma',
  name: { uk: 'Лімфома Ходжкіна', en: 'Hodgkin lymphoma' },
  summary: null,
  sort_order: 0,
  references_json: references,
})

describe('DiseaseReferences', () => {
  it('opens each guideline in its own tab, named by its source', () => {
    renderWithProviders(
      <DiseaseReferences
        disease={disease([
          { kind: 'nccn', url: 'https://www.nccn.org/guidelines/x', label: null },
          {
            kind: 'uptodate',
            url: 'https://www.uptodate.com/contents/search?search=y',
            label: null,
          },
        ])}
      />,
    )

    const nccn = screen.getByRole('link', { name: 'Що каже NCCN' })
    expect(nccn).toHaveAttribute('href', 'https://www.nccn.org/guidelines/x')
    expect(nccn).toHaveAttribute('target', '_blank')
    // The guideline sites must not be able to reach back into the app through window.opener.
    expect(nccn.getAttribute('rel')).toContain('noopener')
    expect(screen.getByRole('link', { name: 'UpToDate' })).toBeInTheDocument()
  })

  it('prefers a label written for the link', () => {
    renderWithProviders(
      <DiseaseReferences
        disease={disease([
          { kind: 'other', url: 'https://example.org/', label: { uk: 'Наказ МОЗ', en: null } },
        ])}
      />,
    )
    expect(screen.getByRole('link', { name: 'Наказ МОЗ' })).toBeInTheDocument()
  })

  it('renders nothing when a disease has no links', () => {
    renderWithProviders(<DiseaseReferences disease={disease([])} />)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.queryByText('Що кажуть настанови')).not.toBeInTheDocument()
  })
})
