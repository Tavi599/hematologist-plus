import { fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  demoAbbreviations,
  demoBook,
  demoIndex,
  demoParts,
} from '../../features/handbook/handbook.fixture'
import { renderWithProviders } from '../../test/render'

import { HandbookPage } from './HandbookPage'

function serveIndex() {
  const bodies: Record<string, unknown> = {
    'book.json': demoBook(),
    'parts.json': demoParts(),
    'index.json': demoIndex(),
    'abbreviations.json': demoAbbreviations(),
    'front.uk.json': {
      parts: { I: 'Вступ', III: 'Методологія та клінічні аспекти' },
      chapters: { 13: 'Кондиціонування' },
      abbreviations: { GVHD: 'Реакція «трансплантат проти господаря»' },
    },
  }
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string) => {
      const name = String(input).split('/').pop() ?? ''
      const body = bodies[name]
      if (body === undefined) return Promise.resolve(new Response('no', { status: 404 }))
      return Promise.resolve(
        new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } }),
      )
    }),
  )
}

afterEach(() => vi.restoreAllMocks())

describe('HandbookPage', () => {
  it('lists the parts with their chapters, in Ukrainian where there is a translation', async () => {
    serveIndex()
    renderWithProviders(<HandbookPage />)

    expect(await screen.findByText('Вступ')).toBeInTheDocument()
    expect(screen.getByText('Кондиціонування')).toBeInTheDocument()
    // Chapter 1 is not translated: its English title stands, with a mark.
    expect(screen.getByText('HCT: Historical Perspective')).toBeInTheDocument()
    expect(screen.getAllByText('без перекладу').length).toBe(1)
  })

  it('names the book, its licence and what the import changed', async () => {
    serveIndex()
    renderWithProviders(<HandbookPage />)

    expect(await screen.findByText('The EBMT Handbook')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'CC BY 4.0' })).toBeInTheDocument()
    expect(screen.getByText(/Текст перенесено з PDF/)).toBeInTheDocument()
  })

  it('searches chapters, sections and abbreviations at once', async () => {
    serveIndex()
    renderWithProviders(<HandbookPage />)
    await screen.findByText('Вступ')

    fireEvent.change(screen.getByLabelText('Пошук по довіднику'), {
      target: { value: 'GVHD' },
    })

    // The abbreviation appears both as a search result and in the list below,
    // and the result carries its Ukrainian meaning.
    expect(screen.getAllByText('GVHD').length).toBeGreaterThan(1)
    expect(screen.getAllByText('Реакція «трансплантат проти господаря»').length).toBeGreaterThan(0)
    expect(screen.getByText(/Знайдено: 1/)).toBeInTheDocument()
  })

  it('says so when a search finds nothing', async () => {
    serveIndex()
    renderWithProviders(<HandbookPage />)
    await screen.findByText('Вступ')

    fireEvent.change(screen.getByLabelText('Пошук по довіднику'), {
      target: { value: 'нічого-такого' },
    })

    expect(screen.getByText('Нічого не знайдено.')).toBeInTheDocument()
  })

  it('shows the abbreviation list with both languages', async () => {
    serveIndex()
    renderWithProviders(<HandbookPage />)
    await screen.findByText('Вступ')

    fireEvent.click(screen.getByRole('tab', { name: /Скорочення/ }))

    expect(screen.getByText('Graft-versus-host disease')).toBeInTheDocument()
    expect(screen.getByText('Реакція «трансплантат проти господаря»')).toBeInTheDocument()
    expect(screen.getByText('Total body irradiation')).toBeInTheDocument()
  })

  it('says so when the handbook files cannot be read', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('no', { status: 500 }))),
    )
    renderWithProviders(<HandbookPage />)

    // The query client retries once, so this takes longer than the default wait.
    expect(
      await screen.findByText(/Не вдалося завантажити довідник/, undefined, { timeout: 5000 }),
    ).toBeInTheDocument()
  })
})
