import { formatNumber } from './format'
import type { DynamicTranslate, Language } from './i18n'

/**
 * Params that carry a unit code (`mg`, `iu`, `mg_m2`, …) rather than a value. They are shown
 * as the unit's name in the reader's language, so one step string serves every unit.
 */
const UNIT_PARAMS = new Set(['unit', 'doseUnit'])

/** Rounds numbers and translates unit codes so a step or warning reads like a worked example. */
export function formatDynamicParams(
  params: Record<string, number | string | boolean> | undefined,
  language: Language,
  t: DynamicTranslate,
): Record<string, string | number | boolean> {
  const formatted: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(params ?? {})) {
    if (UNIT_PARAMS.has(key)) formatted[key] = t(`units.${String(value)}`)
    else if (typeof value === 'number') formatted[key] = formatNumber(value, language, 2)
    else formatted[key] = value
  }
  return formatted
}
