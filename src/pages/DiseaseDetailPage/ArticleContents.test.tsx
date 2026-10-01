import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../../test/render'
import { ArticleContents } from './ArticleContents'

const article = ['# Діагностика', 'текст', '## Лабораторні дані', '# Лікування'].join('\n')

describe('ArticleContents', () => {
  it('lists the sections of the article', () => {
    renderWithProviders(<ArticleContents markdown={article} />)
    const contents = screen.getByRole('navigation', { name: 'Зміст' })
    expect(contents).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Лабораторні дані' })).toBeInTheDocument()
  })

  it('scrolls to the section instead of navigating away from the page', () => {
    renderWithProviders(<ArticleContents markdown={article} />)
    const heading = document.createElement('h2')
    heading.id = 'лікування'
    const scroll = vi.fn()
    heading.scrollIntoView = scroll
    document.body.append(heading)

    fireEvent.click(screen.getByRole('button', { name: 'Лікування' }))
    expect(scroll).toHaveBeenCalled()
    // A hash router reads an ordinary anchor as a change of page, so there is no href to follow.
    expect(screen.getByRole('button', { name: 'Лікування' })).not.toHaveAttribute('href')
    heading.remove()
  })

  it('shows nothing for an article that has no sections to jump between', () => {
    const { container } = renderWithProviders(<ArticleContents markdown={'# Сама назва'} />)
    expect(container.querySelector('nav')).toBeNull()
  })
})
