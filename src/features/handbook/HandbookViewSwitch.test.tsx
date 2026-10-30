import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../../test/render'

import { HandbookViewSwitch } from './HandbookViewSwitch'

describe('HandbookViewSwitch', () => {
  it('notes the reading place on mousedown, before the click moves the page', () => {
    const onBeforeChange = vi.fn()
    renderWithProviders(
      <HandbookViewSwitch value="both" onChange={vi.fn()} onBeforeChange={onBeforeChange} />,
    )

    // Clicking focuses the radio button and the browser scrolls it into view,
    // so by the change event the place is already lost: it has to be noted here.
    fireEvent.mouseDown(screen.getByRole('radio', { name: 'Оригінал' }))

    expect(onBeforeChange).toHaveBeenCalled()
  })

  it('changes the view on a click', () => {
    const onChange = vi.fn()
    renderWithProviders(<HandbookViewSwitch value="both" onChange={onChange} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Українською' }))

    expect(onChange).toHaveBeenCalledWith('uk')
  })
})
