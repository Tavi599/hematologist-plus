import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '../../test/render'
import { CnsProphylaxisSection } from './CnsProphylaxisSection'
import { SOURCES, TOPICS } from './content'

describe('CnsProphylaxisSection', () => {
  it('opens a topic on request and warns that vincristine is intravenous only', () => {
    renderWithProviders(<CnsProphylaxisSection />)

    const safety = screen.getByRole('button', { name: /Техніка та безпека/ })
    expect(safety).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(safety)
    expect(safety).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/ЛИШЕ внутрішньовенно/)).toBeInTheDocument()
  })

  it('gives every source a way to find it', () => {
    for (const source of SOURCES) {
      expect(source.pmid ?? source.doi ?? source.url, source.id).toBeTruthy()
    }
    expect(new Set(TOPICS.map((topic) => topic.id)).size).toBe(TOPICS.length)
  })
})
