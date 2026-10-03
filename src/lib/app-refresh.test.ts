import { describe, expect, it } from 'vitest'

import { reinstallUrl } from './app-refresh'

describe('reinstallUrl', () => {
  it('adds a parameter no cache can have seen before', () => {
    const first = reinstallUrl('https://example.org/app/')
    expect(new URL(first).searchParams.get('reinstalled')).not.toBeNull()
  })

  it('keeps the route, which lives in the hash', () => {
    const url = new URL(reinstallUrl('https://example.org/app/#/calculator?regimen=r-chop-21'))
    expect(url.hash).toBe('#/calculator?regimen=r-chop-21')
    expect(url.pathname).toBe('/app/')
  })

  it('replaces its own parameter instead of stacking them up', () => {
    const once = reinstallUrl('https://example.org/app/?reinstalled=abc#/diseases')
    const twice = new URL(reinstallUrl(once))
    expect(twice.searchParams.getAll('reinstalled')).toHaveLength(1)
    expect(twice.searchParams.get('reinstalled')).not.toBe('abc')
    expect(twice.hash).toBe('#/diseases')
  })
})
