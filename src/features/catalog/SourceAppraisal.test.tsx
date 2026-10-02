import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { Appraisal } from '../../schemas/common'
import { renderWithProviders } from '../../test/render'

import { SourceAppraisal } from './SourceAppraisal'

const entry: Appraisal = {
  publication: 'Ludwig H. та ін. Blood. 2014;123(7):985-991',
  pmid: '24227817',
  level: {
    scale: 'oxford-cebm-2011',
    value: '4',
    notes: { uk: 'Без групи порівняння.', en: 'No comparison group.' },
  },
  publication_types: ['Clinical Trial, Phase II'],
  journal: { name: 'Blood', issn: '0006-4971', medline_indexed: true },
  sources: [],
}

describe('SourceAppraisal', () => {
  it('states the level, the NLM article type and whether the journal is indexed', () => {
    renderWithProviders(<SourceAppraisal appraisal={[entry]} />)

    expect(
      screen.getByText(/4 — серія випадків або дослідження без групи порівняння/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Оксфордський центр доказової медицини/)).toBeInTheDocument()
    expect(screen.getByText('Clinical Trial, Phase II')).toBeInTheDocument()
    expect(screen.getByText('індексується в MEDLINE')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /24227817/ })).toHaveAttribute(
      'href',
      'https://pubmed.ncbi.nlm.nih.gov/24227817/',
    )
  })

  it('leaves out a quartile nobody has entered', () => {
    renderWithProviders(<SourceAppraisal appraisal={[entry]} />)

    expect(screen.queryByText(/квартиль/)).not.toBeInTheDocument()
  })

  it('renders nothing without an appraisal', () => {
    renderWithProviders(<SourceAppraisal appraisal={[]} />)

    expect(screen.queryByText(/Оцінка джерела/)).not.toBeInTheDocument()
  })
})
