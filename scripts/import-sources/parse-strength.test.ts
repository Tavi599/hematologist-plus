// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { parseForm, parseStrength } from './parse-strength'

const ok = (input: string) => {
  const result = parseStrength(input)
  if (!result.ok) throw new Error(`${input}: ${result.reason}`)
  return result.strengths
}
const reason = (input: string) => {
  const result = parseStrength(input)
  return result.ok ? null : result.reason
}

describe('parseStrength', () => {
  it('reads plain masses', () => {
    expect(ok('100 мг')).toEqual([{ strengthMg: 100 }])
    expect(ok('2,5 мг')).toEqual([{ strengthMg: 2.5 }])
    expect(ok('1000 мг ')).toEqual([{ strengthMg: 1000 }])
    expect(ok('100 мг, 200 мг')).toEqual([{ strengthMg: 100 }, { strengthMg: 200 }])
    expect(ok('80 мг, 125 мг (3 таб/в упаковці)')).toEqual([
      { strengthMg: 80 },
      { strengthMg: 125 },
    ])
  })

  it('reads a mass held in a given volume', () => {
    expect(ok('50 мг/2 мл')).toEqual([{ strengthMg: 50, volumeMl: 2 }])
    expect(ok('300 мкг/0,5 мл')).toEqual([{ strengthMg: 0.3, volumeMl: 0.5 }])
    expect(ok('450 мг/45 мл')).toEqual([{ strengthMg: 450, volumeMl: 45 }])
  })

  it('multiplies a concentration by the pack volume', () => {
    expect(ok('20 мг/мл по 10 мл')).toEqual([{ strengthMg: 200, volumeMl: 10 }])
    expect(ok('10 мг/мл, 4 мл')).toEqual([{ strengthMg: 40, volumeMl: 4 }])
    expect(ok('10 мг/мл 100 мл')).toEqual([{ strengthMg: 1000, volumeMl: 100 }])
  })

  it('derives the volume when a mass and a concentration are both given', () => {
    expect(ok('8 мг, 2 мг/мл')).toEqual([{ strengthMg: 8, volumeMl: 4 }])
  })

  it('refuses what it cannot know', () => {
    expect(reason('2000000 МО')).toBe('дозування в МО')
    expect(reason('3 млн. МО')).toBe('дозування в МО')
    expect(reason('200г/л, 100 мл')).toBe('розчин у г/л або %')
    expect(reason('875/125 мг')).toBe('комбінований препарат')
    expect(reason('4 г/0,5 г')).toBe('комбінований препарат')
    expect(reason('2000/500 мг')).toBe('комбінований препарат')
    expect(reason('1 мг/мл')).toBe('лише концентрація, невідомий об’єм')
    expect(reason('40 мг/мл')).toBe('лише концентрація, невідомий об’єм')
    expect(reason('500 мл')).toBe('лише об’єм')
    expect(reason('0,3 мл')).toBe('лише об’єм')
    expect(reason('0.5')).toBe('не вдалося розпізнати дозування')
    expect(reason('')).toBe('порожнє дозування')
  })
})

describe('parseForm', () => {
  it('maps the form column', () => {
    expect(parseForm('таблетки, капсули, драже')).toBe('tablet')
    expect(parseForm('капсули')).toBe('capsule')
    expect(parseForm('ампули, флакони, шприци')).toBe('vial') // several containers listed
    expect(parseForm('ампули')).toBe('ampoule')
    expect(parseForm('концентрат для інфузій')).toBe('vial')
    expect(parseForm("порошок для ін'єкцій")).toBe('vial')
    expect(parseForm('пластир трансдермальний')).toBe('other')
    expect(parseForm('невідомо')).toBeNull()
  })
})

describe('source lists quirks', () => {
  it('prefers the mass in brackets when the label leads with IU', () => {
    expect(ok('30 млн МО (300 мкг)')).toEqual([{ strengthMg: 0.3 }])
    expect(ok('48 млн МО (480 мкг)')).toEqual([{ strengthMg: 0.48 }])
  })

  it('understands the short form names used in the order lists', () => {
    expect(parseForm('фл.')).toBe('vial')
    expect(parseForm('шпр.')).toBe('syringe')
    expect(parseForm('табл.')).toBe('tablet')
    expect(parseForm('амп.')).toBe('ampoule')
  })
})
