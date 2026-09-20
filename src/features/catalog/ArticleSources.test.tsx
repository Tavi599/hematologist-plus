import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../../test/render'
import type { Disease } from '../../schemas/catalog'
import { articleSources } from '../../lib/article-sources'
import { ArticleSources } from './ArticleSources'

const disease = (references: Disease['references_json']): Disease => ({
  id: 'hodgkin-lymphoma',
  name: { uk: 'Лімфома Ходжкіна', en: 'Hodgkin lymphoma' },
  summary: null,
  sort_order: 0,
  references_json: references,
})

const withNccn = disease([
  {
    kind: 'nccn',
    url: 'https://www.nccn.org/guidelines/x',
    label: null,
    version: '2.2026',
    updated: '2026-07-01',
  },
  {
    kind: 'uptodate',
    url: 'https://www.uptodate.com/contents/search?search=y',
    label: null,
    version: null,
    updated: null,
  },
])

describe('ArticleSources', () => {
  it('offers the department article first, then one button per source', () => {
    renderWithProviders(<ArticleSources disease={withNccn} value="own" onChange={() => {}} />)

    expect(articleSources(withNccn).map((choice) => choice.section)).toEqual([
      'own',
      'nccn',
      'uptodate',
    ])
    expect(screen.getByRole('button', { name: 'Наша стаття' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Що каже NCCN · 2.2026' })).toBeInTheDocument()
  })

  it('never sends the reader to the guideline site', () => {
    renderWithProviders(<ArticleSources disease={withNccn} value="nccn" onChange={() => {}} />)

    // The text is the department's own and stays behind the sign-in: no link leaves the app.
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(document.querySelectorAll('[href]')).toHaveLength(0)
  })

  it('names the edition of the selected source and when it was issued', () => {
    renderWithProviders(<ArticleSources disease={withNccn} value="nccn" onChange={() => {}} />)
    expect(screen.getByText(/NCCN 2.2026 — 01.07.2026/)).toBeInTheDocument()
  })

  it('says nothing about an edition the source does not state', () => {
    renderWithProviders(<ArticleSources disease={withNccn} value="uptodate" onChange={() => {}} />)
    expect(screen.queryByText(/Версія настанови/)).not.toBeInTheDocument()
  })

  it('reports the source the reader picked', () => {
    const onChange = vi.fn()
    renderWithProviders(<ArticleSources disease={withNccn} value="own" onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'UpToDate' }))
    expect(onChange).toHaveBeenCalledWith('uptodate')
  })

  it('renders nothing when a disease names no source', () => {
    renderWithProviders(<ArticleSources disease={disease([])} value="own" onChange={() => {}} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})
