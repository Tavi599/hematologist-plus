import { defaultInfusionStart } from '../../domain'
import { formatNumber } from '../../lib/format'
import { DEFAULT_DOSE_CHOICE, type CourseItem } from '../../lib/course-input'
import type { Language } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import { isVariant, variantBase } from '../../lib/row-plan'
import type { Translate } from './course-sheets'
import type { CourseState } from './course-state'

/**
 * Everything the physician has set on a course that the regimen itself does not say, gathered in
 * one list. A sheet is signed by a person, and in a month it is the deviations — a dose typed by
 * hand, a drug switched off, a kidney correction waved off — that have to be explainable. Each one
 * can be taken back, so a row goes to what the protocol writes without clearing a field by hand.
 */
export type DeviationKind =
  | 'disabled'
  | 'manualDose'
  | 'reduction'
  | 'doseChoice'
  | 'modifiers'
  | 'route'
  | 'mode'
  | 'duration'
  | 'bag'
  | 'planDays'
  | 'planHours'
  | 'planPerDay'
  | 'sheet'
  | 'renalBandOff'
  | 'renalBandEveryOtherDay'
  | 'renalBandLevel'
  | 'variant'
  | 'custom'
  | 'mesna'
  | 'infusionStart'
  | 'bsaSource'
  | 'clearanceWeight'

/** Values of the line this deviation is written as; raw, so the UI translates and formats them. */
export type DeviationValues = Record<string, string | number>

export interface Deviation {
  kind: DeviationKind
  /** The state entry this is taken back by: a row id, a drug id, or null for the whole course. */
  itemId: string | null
  /** The drug's name in the physician's language; null for a deviation of the whole course. */
  drug: string | null
  values: DeviationValues
  /** True when it changes a dose on the sheet, not only where or when the drug is given. */
  changesDose: boolean
}

/** The modifier keys the protocol itself assumes for an item. */
function defaultModifierKeys(item: CourseItem): string[] {
  return (item.item.dose_modifiers ?? [])
    .filter((modifier) => modifier.default_on)
    .map((modifier) => modifier.key)
}

function sameKeys(left: string[], right: string[]): boolean {
  return left.length === right.length && [...left].sort().join() === [...right].sort().join()
}

/**
 * The deviations of a course, in the order the rows stand in, with those of the whole course last.
 * Only rows still in the course are read: an override left behind by another regimen changes
 * nothing and is not shown.
 */
export function collectDeviations(
  items: CourseItem[],
  state: CourseState,
  language: Language,
): Deviation[] {
  const list: Deviation[] = []
  const customIds = new Set(state.customItems.map((item) => item.id))
  const add = (
    kind: DeviationKind,
    itemId: string | null,
    drug: string | null,
    values: DeviationValues,
    changesDose = false,
  ) => list.push({ kind, itemId, drug, values, changesDose })

  for (const entry of items) {
    const id = entry.item.id
    const name = localize(entry.drug.name, language)

    if (customIds.has(id)) add('custom', id, name, {})
    else if (isVariant(id) && state.variants.includes(id)) add('variant', id, name, {})

    // Mesna the physician added to a high dose of cyclophosphamide the protocol gives without it.
    const anchor = entry.courseDrug.anchorDrugId
    if (anchor !== undefined && state.mesnaFor.includes(anchor)) add('mesna', anchor, name, {})

    if (entry.item.role === 'main' && !customIds.has(id) && state.disabledIds.includes(id)) {
      add('disabled', id, name, {}, true)
    }
    const manual = state.doseOverrideAmount[id]
    if (manual !== undefined) {
      add('manualDose', id, name, { amount: manual, unit: entry.drug.amount_unit }, true)
    }
    // A reduction ticked and left at nought has changed no dose yet.
    const percent = state.drugPercent[id]
    if (percent !== undefined && percent > 0) add('reduction', id, name, { percent }, true)
    if (entry.doseChoiceId !== DEFAULT_DOSE_CHOICE) {
      const choice = entry.doseChoices.find((option) => option.id === entry.doseChoiceId)
      add('doseChoice', id, name, { source: choice?.label ?? '' }, true)
    }
    const chosenModifiers = state.chosenModifiers[id]
    if (chosenModifiers !== undefined && !sameKeys(chosenModifiers, defaultModifierKeys(entry))) {
      const labels = (entry.item.dose_modifiers ?? [])
        .filter((modifier) => entry.activeModifierKeys.includes(modifier.key))
        .map((modifier) => localize(modifier.label, language))
      add('modifiers', id, name, { modifiers: labels.join(', ') }, true)
    }
    // The route the physician picked, not the department's own rule that a cytostatic push goes
    // diluted: that rule changes the row's route without anyone deviating from anything.
    const route = state.chosenRoutes[id]
    if (route !== undefined && route !== entry.protocolRoute) {
      add('route', id, name, { from: entry.protocolRoute, to: route })
    }
    const mode = state.administrationModes[id]
    if (mode !== undefined && mode.kind !== 'protocol') {
      // A length switched to the one the protocol writes anyway is no deviation.
      const sameAsProtocol =
        (mode.kind === 'short' || mode.kind === 'continuous') &&
        mode.kind === entry.protocolInfusion
      if (!sameAsProtocol) add('mode', id, name, { mode: mode.kind })
    }
    const duration = state.chosenDurations[id]
    if (
      duration !== undefined &&
      entry.durationOptions.length > 0 &&
      duration !== entry.protocolDurationMin
    ) {
      add('duration', id, name, { minutes: duration })
    }
    const bag = state.chosenBags[id]
    if (bag !== undefined && entry.bagSwitchable) add('bag', id, name, { ml: bag })
    const plan = state.plans[id]
    if (plan?.days !== undefined) add('planDays', id, name, { days: plan.days.join(', ') })
    if (plan?.hours !== undefined) add('planHours', id, name, { hours: plan.hours.length })
    if (plan?.perDay !== undefined) add('planPerDay', id, name, { perDay: plan.perDay })
    const sheet = state.sheetChoices[id]
    if (sheet !== undefined) add('sheet', id, name, { sheet })
    if (state.renalBandOffIds.includes(id)) add('renalBandOff', id, name, {}, true)
    if (state.renalBandEveryOtherDayIds.includes(id)) {
      add('renalBandEveryOtherDay', id, name, {}, true)
    }
    const level = state.renalBandLevel[id]
    if (level !== undefined) add('renalBandLevel', id, name, { level }, true)
  }

  // Which infusion of an antibody the course opens with: set by drug, not by row.
  const standardStart = defaultInfusionStart(state.courseSettings.cycleNumber)
  for (const [drugId, start] of Object.entries(state.infusionStart)) {
    if (start === standardStart) continue
    const entry = items.find((item) => item.item.drug_id === drugId)
    if (entry === undefined) continue
    add('infusionStart', drugId, localize(entry.drug.name, language), { start })
  }

  if (state.courseSettings.bsaVariant !== 'actual') {
    add('bsaSource', null, null, { source: state.courseSettings.bsaVariant }, true)
  }
  if (state.clearanceWeight !== 'actual') add('clearanceWeight', null, null, {}, true)

  return list
}

function omit<T>(record: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _removed, ...rest } = record
  return rest
}

function without(list: string[], key: string): string[] {
  return list.filter((entry) => entry !== key)
}

/** The row's plan without one of its parts; the entry itself goes when nothing is left of it. */
function withoutPlanPart(
  state: CourseState,
  id: string,
  part: 'days' | 'hours' | 'perDay',
): CourseState {
  const plan = state.plans[id]
  if (plan === undefined) return state
  const { [part]: _removed, ...rest } = plan
  return {
    ...state,
    plans: Object.keys(rest).length === 0 ? omit(state.plans, id) : { ...state.plans, [id]: rest },
  }
}

/** The course with this one deviation taken back; everything else the physician set stays. */
export function revertDeviation(state: CourseState, deviation: Deviation): CourseState {
  const id = deviation.itemId
  if (id === null) {
    switch (deviation.kind) {
      case 'bsaSource':
        return {
          ...state,
          courseSettings: { ...state.courseSettings, bsaVariant: 'actual', bsaM2: null },
        }
      case 'clearanceWeight':
        return { ...state, clearanceWeight: 'actual' }
      default:
        return state
    }
  }
  switch (deviation.kind) {
    case 'disabled':
      return { ...state, disabledIds: without(state.disabledIds, id) }
    case 'manualDose':
      return { ...state, doseOverrideAmount: omit(state.doseOverrideAmount, id) }
    case 'reduction':
      return { ...state, drugPercent: omit(state.drugPercent, id) }
    case 'doseChoice':
      return { ...state, chosenDoses: omit(state.chosenDoses, id) }
    case 'modifiers':
      return { ...state, chosenModifiers: omit(state.chosenModifiers, id) }
    case 'route':
      return { ...state, chosenRoutes: omit(state.chosenRoutes, id) }
    case 'mode':
      return { ...state, administrationModes: omit(state.administrationModes, id) }
    case 'duration':
      return { ...state, chosenDurations: omit(state.chosenDurations, id) }
    case 'bag':
      return { ...state, chosenBags: omit(state.chosenBags, id) }
    case 'planDays':
      return withoutPlanPart(state, id, 'days')
    case 'planHours':
      return withoutPlanPart(state, id, 'hours')
    case 'planPerDay':
      return withoutPlanPart(state, id, 'perDay')
    case 'sheet':
      return { ...state, sheetChoices: omit(state.sheetChoices, id) }
    case 'renalBandOff':
      return { ...state, renalBandOffIds: without(state.renalBandOffIds, id) }
    case 'renalBandEveryOtherDay':
      return { ...state, renalBandEveryOtherDayIds: without(state.renalBandEveryOtherDayIds, id) }
    case 'renalBandLevel':
      return { ...state, renalBandLevel: omit(state.renalBandLevel, id) }
    case 'variant':
      return { ...state, variants: without(state.variants, id) }
    case 'custom':
      // The copies of a row added by hand go with the row itself.
      return {
        ...state,
        customItems: state.customItems.filter((item) => item.id !== id),
        variants: state.variants.filter((variant) => variantBase(variant) !== id),
      }
    case 'mesna':
      return { ...state, mesnaFor: without(state.mesnaFor, id) }
    case 'infusionStart':
      return { ...state, infusionStart: omit(state.infusionStart, id) }
    default:
      return state
  }
}

/** The course back as the protocol writes it: every deviation taken back, the patient untouched. */
export function revertAll(state: CourseState, deviations: Deviation[]): CourseState {
  return deviations.reduce(revertDeviation, state)
}

/** The mode of a row, as the dose table itself names it. */
const MODE_KEYS: Record<string, string> = {
  bolus: 'calculator.doses.modeBolus',
  short: 'calculator.doses.infusionShort',
  continuous: 'calculator.doses.infusionContinuous',
}

/**
 * Values of a deviation's line with everything that is a key of its own already translated: the
 * line itself is one sentence, and i18next does not translate inside an interpolation.
 */
function lineValues(deviation: Deviation, t: Translate, language: Language): DeviationValues {
  const values: DeviationValues = { ...deviation.values }
  if (typeof values.unit === 'string') values.unit = t(`units.${values.unit}`)
  if (typeof values.from === 'string') values.from = t(`route.${values.from}`)
  if (typeof values.to === 'string') values.to = t(`route.${values.to}`)
  if (typeof values.sheet === 'string') values.sheet = t(`calculator.doses.sheet.${values.sheet}`)
  if (typeof values.mode === 'string') {
    values.mode = t(MODE_KEYS[values.mode] ?? 'calculator.doses.modeProtocol')
  }
  if (typeof values.level === 'string') {
    values.level = t(`calculator.deviations.level.${values.level}`)
  }
  if (typeof values.source === 'string' && deviation.kind === 'bsaSource') {
    values.source = t(`calculator.deviations.bsa.${values.source}`)
  }
  if (typeof values.amount === 'number') values.amount = formatNumber(values.amount, language, 2)
  return values
}

/** The one line a deviation is written as: the drug, then what was set instead of the protocol. */
export function deviationLine(deviation: Deviation, t: Translate, language: Language): string {
  const what = t(`calculator.deviations.line.${deviation.kind}`, lineValues(deviation, t, language))
  return deviation.drug === null ? what : `${deviation.drug}: ${what}`
}
