import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  demoAbbreviations,
  demoBook,
  demoChapter,
  demoIndex,
  demoParts,
  demoTranslation,
} from '../../features/handbook/handbook.fixture'
import { resetHandbookView, setHandbookView } from '../../features/handbook/handbook-view'
import { renderWithProviders } from '../../test/render'

import { HandbookChapterPage } from './HandbookChapterPage'

/** Serves the handbook's static files out of the fixtures. */
function serveHandbook(options: { translation?: boolean; frontTitle?: string } = {}) {
  const bodies: Record<string, unknown> = {
    'book.json': demoBook(),
    'parts.json': demoParts(),
    'index.json': demoIndex(),
    'abbreviations.json': demoAbbreviations(),
    'ch13.json': demoChapter(),
    'front.uk.json': {
      parts: { III: 'Методологія' },
      chapters: options.frontTitle ? { 13: options.frontTitle } : {},
      abbreviations: {},
    },
  }
  if (options.translation !== false) bodies['ch13.uk.json'] = demoTranslation()
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string) => {
      const name = String(input).split('/').pop() ?? ''
      const body = bodies[name]
      if (body === undefined)
        return Promise.resolve(
          new Response('not found', { status: 404, headers: { 'content-type': 'text/plain' } }),
        )
      return Promise.resolve(
        new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } }),
      )
    }),
  )
}

const render = () =>
  renderWithProviders(<HandbookChapterPage />, { route: '/handbook/13', path: '/handbook/:number' })

beforeEach(() => resetHandbookView())
afterEach(() => {
  vi.restoreAllMocks()
  resetHandbookView()
})

describe('HandbookChapterPage', () => {
  it('shows the Ukrainian text with the original under it', async () => {
    serveHandbook()
    render()

    expect(await screen.findByText('Кондиціонування')).toBeInTheDocument()
    // Both languages at once: the translated paragraph and its original.
    expect(
      screen.getByText('Трансплантація гемопоетичних клітин — потенційно куративна процедура.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Hematopoietic cell transplantation is a curative procedure.'),
    ).toBeInTheDocument()
  })

  it('shows only the original when the original is asked for', async () => {
    serveHandbook()
    setHandbookView('en')
    render()

    expect(await screen.findByText('Conditioning')).toBeInTheDocument()
    expect(
      screen.queryByText('Трансплантація гемопоетичних клітин — потенційно куративна процедура.'),
    ).not.toBeInTheDocument()
  })

  it('falls back to the original, and says so, where a paragraph is not translated', async () => {
    serveHandbook()
    setHandbookView('uk')
    render()

    expect(await screen.findByText('Загальний огляд')).toBeInTheDocument()
    // p2 has no Ukrainian: the English must still be there, marked as such.
    expect(
      screen.getByText(/A conditioning regimen consists of two components\./),
    ).toBeInTheDocument()
    expect(screen.getAllByText('без перекладу').length).toBeGreaterThan(0)
  })

  it('switches language from the page', async () => {
    serveHandbook()
    render()
    await screen.findByText('Кондиціонування')

    fireEvent.click(screen.getByRole('radio', { name: 'Оригінал' }))

    await waitFor(() =>
      expect(
        screen.queryByText('Трансплантація гемопоетичних клітин — потенційно куративна процедура.'),
      ).not.toBeInTheDocument(),
    )
  })

  it('rebuilds a table from the book and keeps its number', async () => {
    serveHandbook()
    render()
    await screen.findByText('Кондиціонування')

    expect(screen.getByText('Lee et al. (2013)')).toBeInTheDocument()
    expect(screen.getByText('BuCy better RI and OS')).toBeInTheDocument()
    expect(screen.getByText(/Табл\./)).toBeInTheDocument()
  })

  it('highlights the paragraphs a search in the chapter matches', async () => {
    serveHandbook()
    render()
    await screen.findByText('Кондиціонування')

    fireEvent.change(screen.getByLabelText('Пошук у розділі'), {
      target: { value: 'куративна' },
    })

    expect(await screen.findByText(/Підсвічено абзаців: 1/)).toBeInTheDocument()
  })

  it('reads a chapter that has no translation at all', async () => {
    serveHandbook({ translation: false })
    render()

    expect(await screen.findByText('Conditioning')).toBeInTheDocument()
    expect(screen.getByText(/переклад: 0%/)).toBeInTheDocument()
  })

  it('names an untranslated chapter in Ukrainian, because the titles are translated apart', async () => {
    serveHandbook({ translation: false, frontTitle: 'Кондиціонування' })
    render()

    // The chapter's own file is missing, so the text is the original; the title
    // comes from the translated table of contents all the same.
    expect(await screen.findByText('Кондиціонування')).toBeInTheDocument()
    expect(screen.getByText('Conditioning')).toBeInTheDocument()
  })

  it('refuses a chapter number that is not one', () => {
    serveHandbook()
    renderWithProviders(<HandbookChapterPage />, {
      route: '/handbook/nonsense',
      path: '/handbook/:number',
    })

    expect(screen.getByText(/У довіднику 94 розділи/)).toBeInTheDocument()
  })

  it('lists the references of the chapter', async () => {
    serveHandbook()
    render()

    expect(await screen.findByText(/Джерела \(1\)/)).toBeInTheDocument()
  })
})
