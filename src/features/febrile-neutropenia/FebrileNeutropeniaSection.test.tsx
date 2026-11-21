import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '../../test/render'
import { FebrileNeutropeniaSection } from './FebrileNeutropeniaSection'

describe('FebrileNeutropeniaSection', () => {
  it('shows only the titles of the stages and opens one on request', () => {
    renderWithProviders(<FebrileNeutropeniaSection />)

    const stage = screen.getByRole('button', { name: /1\. Оцінка ризику/ })
    expect(stage).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: /Препарати і дози/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    )

    fireEvent.click(stage)
    expect(stage).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(stage)
    expect(stage).toHaveAttribute('aria-expanded', 'false')
  })

  it('links a step that names a class to its card in the antibacterial reference', () => {
    renderWithProviders(<FebrileNeutropeniaSection />)

    fireEvent.click(screen.getByRole('button', { name: /2\. Високий ризик/ }))
    const link = screen.getAllByRole('link', { name: 'Карбапенеми', hidden: true })[0]
    expect(link).toHaveAttribute('href', '/antibacterials?class=carbapenems')
  })
})
