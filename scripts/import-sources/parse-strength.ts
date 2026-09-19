/**
 * Parses the "Дозування" and "Форма випуску" columns of the hospital's procurement lists.
 * Anything ambiguous is rejected with a reason instead of being guessed: a wrong strength
 * would produce a wrong number of vials.
 */

export interface ParsedStrength {
  strengthAmount: number
  /** Volume of the vial/ampoule, mL; absent for tablets and powders. */
  volumeMl?: number
}

export type StrengthResult =
  { ok: true; strengths: ParsedStrength[] } | { ok: false; reason: string }

const MASS_UNITS: Record<string, number> = { мг: 1, г: 1000, мкг: 0.001 }
const NUMBER = String.raw`\d+(?:[.,]\d+)?`
// \b does not work around Cyrillic, so word edges are spelled out as "no letter next to it".
const START = String.raw`(?<!\p{L})`
const END = String.raw`(?!\p{L})`

const re = (pattern: string, flags = '') => new RegExp(pattern, `u${flags}`)

function toNumber(value: string): number {
  return Number(value.replace(',', '.'))
}

/** "20 мг/мл по 10 мл", "300 мкг/0,5 мл", "100 мг, 200 мг", "4 мг, 2 мг/мл" */
export function parseStrength(input: string): StrengthResult {
  const text = input.replace(/\s+/g, ' ').trim().toLowerCase()
  if (text === '') return { ok: false, reason: 'порожнє дозування' }
  // «30 млн МО (300 мкг)»: the mass in brackets is the unambiguous part.
  const inBrackets = text.match(/\(([^)]*(?:мг|мкг|г)[^)]*)\)/)
  if (inBrackets && re(`${START}(мо|од)${END}|млн`).test(text)) return parseStrength(inBrackets[1]!)
  if (re(`${START}(мо|од)${END}|млн`).test(text)) return { ok: false, reason: 'дозування в МО' }
  if (re(`${START}г\\s*/\\s*л${END}|%`).test(text)) {
    return { ok: false, reason: 'розчин у г/л або %' }
  }
  // Combinations such as "875/125 мг" or "4 г/0,5 г" hold two active substances.
  if (re(`${NUMBER}\\s*(?:мг|г)?\\s*/\\s*${NUMBER}\\s*(?:мг|г)${END}`).test(text)) {
    return { ok: false, reason: 'комбінований препарат' }
  }

  const inVolume = text.match(re(`(${NUMBER})\\s*(мг|мкг|г)\\s*/\\s*(${NUMBER})\\s*мл`))
  const perMl = text.match(re(`(${NUMBER})\\s*(мг|мкг|г)\\s*/\\s*мл`))
  const volumeAfter = text.match(re(`(?:по\\s*|,\\s*)?(${NUMBER})\\s*мл(?!\\s*/)`))

  // "50 мг/2 мл": the whole vial holds 50 mg.
  if (inVolume) {
    const strengthAmount = toNumber(inVolume[1]!) * MASS_UNITS[inVolume[2]!]!
    return { ok: true, strengths: [{ strengthAmount, volumeMl: toNumber(inVolume[3]!) }] }
  }

  if (perMl) {
    const concentration = toNumber(perMl[1]!) * MASS_UNITS[perMl[2]!]!
    const volume = volumeAfter ? toNumber(volumeAfter[1]!) : null
    // "20 мг/мл по 10 мл": concentration × pack volume.
    if (volume !== null) {
      return { ok: true, strengths: [{ strengthAmount: concentration * volume, volumeMl: volume }] }
    }
    // "4 мг, 2 мг/мл": the ampoule holds 4 mg, so its volume follows from the concentration.
    const mass = text.match(re(`(?:^|[^/\\d])(${NUMBER})\\s*(мг|мкг|г)(?!\\s*/)`))
    if (mass) {
      const strengthAmount = toNumber(mass[1]!) * MASS_UNITS[mass[2]!]!
      return { ok: true, strengths: [{ strengthAmount, volumeMl: strengthAmount / concentration }] }
    }
    return { ok: false, reason: 'лише концентрація, невідомий об’єм' }
  }

  // Plain masses, possibly several: "100 мг, 200 мг".
  const masses = [...text.matchAll(re(`(${NUMBER})\\s*(мг|мкг|г)${END}`, 'g'))].map((match) => ({
    strengthAmount: toNumber(match[1]!) * MASS_UNITS[match[2]!]!,
  }))
  if (masses.length > 0) {
    const unique = masses.filter(
      (mass, index) =>
        masses.findIndex((other) => other.strengthAmount === mass.strengthAmount) === index,
    )
    return { ok: true, strengths: unique }
  }

  if (re(`${START}мл${END}`).test(text)) return { ok: false, reason: 'лише об’єм' }
  return { ok: false, reason: 'не вдалося розпізнати дозування' }
}

export type PresentationForm = 'tablet' | 'capsule' | 'ampoule' | 'vial' | 'syringe' | 'other'

const ORAL_FORMS: [RegExp, PresentationForm][] = [
  [/таблет|табл\./, 'tablet'],
  [/капсул|драже|капс\./, 'capsule'],
  [/пластир/, 'other'],
]
const INJECTABLE_FORMS: [RegExp, PresentationForm][] = [
  [/ампул|амп\./, 'ampoule'],
  [/шприц|шпр\./, 'syringe'],
  [/флакон|фл\.|порош|концентрат|розчин|ліофіл|суспенз|інфуз|ін.єкц/, 'vial'],
]

/**
 * Maps the "Форма випуску" column. Rows that list several injectable containers
 * ("ампули, флакони, шприци") say nothing specific, so they become the generic vial.
 */
export function parseForm(input: string): PresentationForm | null {
  const text = input.toLowerCase()
  for (const [pattern, form] of ORAL_FORMS) if (pattern.test(text)) return form
  const injectable = INJECTABLE_FORMS.filter(([pattern]) => pattern.test(text))
  if (injectable.length === 1) return injectable[0]![1]
  if (injectable.length > 1) return 'vial'
  return null
}
