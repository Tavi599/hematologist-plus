import { fireEvent, screen } from '@testing-library/react'
import { Link, useLocation } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'

import { renderWithProviders } from '../../test/render'
import { HistoryButtons } from './HistoryButtons'
import { stepTrail } from './history-trail'

function Where() {
  return <span data-testid="where">{useLocation().pathname}</span>
}

describe('stepTrail', () => {
  it('pushes, cuts the forward part, replaces and moves on pop', () => {
    let trail = stepTrail(null, 'a', 'POP')
    trail = stepTrail(trail, 'b', 'PUSH')
    trail = stepTrail(trail, 'c', 'PUSH')
    expect(trail).toEqual({ keys: ['a', 'b', 'c'], pos: 2 })
    trail = stepTrail(trail, 'a', 'POP')
    expect(trail.pos).toBe(0)
    trail = stepTrail(trail, 'd', 'PUSH')
    expect(trail).toEqual({ keys: ['a', 'd'], pos: 1 })
    trail = stepTrail(trail, 'e', 'REPLACE')
    expect(trail).toEqual({ keys: ['a', 'e'], pos: 1 })
    expect(stepTrail(trail, 'e', 'PUSH')).toBe(trail)
  })
})

describe('HistoryButtons', () => {
  beforeEach(() => window.sessionStorage.clear())

  it('goes back and forward through the pages opened in the app', () => {
    renderWithProviders(
      <>
        <HistoryButtons />
        <Link to="/scores">to scores</Link>
        <Where />
      </>,
      { route: '/calculator' },
    )
    const back = () => screen.getByRole('button', { name: 'Назад' })
    const forward = () => screen.getByRole('button', { name: 'Вперед' })

    expect(back()).toBeDisabled()
    expect(forward()).toBeDisabled()

    fireEvent.click(screen.getByText('to scores'))
    expect(screen.getByTestId('where')).toHaveTextContent('/scores')
    expect(back()).toBeEnabled()

    fireEvent.click(back())
    expect(screen.getByTestId('where')).toHaveTextContent('/calculator')
    expect(back()).toBeDisabled()
    expect(forward()).toBeEnabled()

    fireEvent.click(forward())
    expect(screen.getByTestId('where')).toHaveTextContent('/scores')
    expect(forward()).toBeDisabled()
  })
})
