import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useClosedLines } from './use-closed-lines'

describe('useClosedLines', () => {
  beforeEach(() => window.localStorage.clear())

  it('starts from the default until the physician folds or opens a line', () => {
    const { result } = renderHook(() => useClosedLines('mm', ['mm.trials']))
    expect([...result.current[0]]).toEqual(['mm.trials'])
  })

  it('remembers every line opened, not only the folded ones', () => {
    const first = renderHook(() => useClosedLines('mm', ['mm.trials']))
    act(() => first.result.current[1](new Set()))
    first.unmount()

    const again = renderHook(() => useClosedLines('mm', ['mm.trials']))
    expect(again.result.current[0].size).toBe(0)
    // Another disease keeps its own default.
    const other = renderHook(() => useClosedLines('fl', ['fl.trials']))
    expect([...other.result.current[0]]).toEqual(['fl.trials'])
  })

  it('falls back to the default on a damaged record', () => {
    window.localStorage.setItem('closedLines:mm', '{not json')
    const { result } = renderHook(() => useClosedLines('mm', ['mm.trials']))
    expect([...result.current[0]]).toEqual(['mm.trials'])
  })
})
