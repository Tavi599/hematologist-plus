import type { ClearanceWeight, RenalBandLevel } from '../../domain'
import type { AdministrationMode, SheetChoice } from '../../lib/course-input'
import { isVariant, nextVariantId, variantBase, type RowPlan } from '../../lib/row-plan'
import {
  NO_SUPPORT,
  type AntiviralAgent,
  type GastroAgent,
  type SupportCategory,
  type ThromboAgent,
} from '../../lib/standard-support'
import type { RegimenItem } from '../../schemas/catalog'
import { todayIso, type PatientInput } from '../../schemas/patient'
import type { CourseSettingsValue } from './CourseSettings'
import { emptyHeader, type HeaderValue } from './header'
import type { ManualRow } from './manual-rows'
import { NO_INFUSION_THERAPY, type InfusionTherapy } from './supportive-rows'

/**
 * Everything the physician has set for one course, in one object: the patient, the settings of
 * the course, and every switch, hour, reduction and hand-written line of its rows. One object
 * rather than thirty pieces of component state, so a course can be put away and taken out again
 * whole — kept as a draft in the browser, carried to another computer as a file, and tested here
 * without a browser at all.
 *
 * It holds no calculation: the doses are worked out from this by `calculateCourse`.
 */

/** The settings of the whole course; the regimen itself lives in the URL. */
export type CourseSettingsState = Omit<CourseSettingsValue, 'regimenId'>

export interface CourseState {
  /** The patient as last entered and valid; never written anywhere but this browser. */
  patient: PatientInput | null
  settings: CourseSettingsState
  /**
   * The regimen the switches below were set for. `undefined` until the calculator has seen one:
   * that is what tells the first render to open a regimen's rows at their defaults.
   */
  regimenId: string | null | undefined
  /** Set when the calculator itself moved to another phase of the course, to say so. */
  phaseNote: string | null
  customItems: RegimenItem[]
  disabledIds: string[]
  drugPercent: Record<string, number>
  doseOverrideAmount: Record<string, number>
  /** Where and when each row is given, as the physician set it. */
  plans: Record<string, RowPlan>
  /** Copies of rows: the same drug again with settings of its own. */
  variants: string[]
  infusionTherapy: InfusionTherapy
  chosenDoses: Record<string, string>
  /** Empty until a tick is touched: an item with no entry uses what its protocol assumes. */
  chosenModifiers: Record<string, string[]>
  administrationModes: Record<string, AdministrationMode>
  /** Which infusion of an antibody the course opens with, by drug. */
  infusionStart: Record<string, number>
  header: HeaderValue
  manualRows: ManualRow[]
  support: Record<SupportCategory, boolean>
  thromboAgent: ThromboAgent
  antiviralAgent: AntiviralAgent
  gastroAgent: GastroAgent
  /** Cyclophosphamide items the physician has added mesna to. */
  mesnaFor: string[]
  chosenRoutes: Record<string, RegimenItem['route']>
  sheetChoices: Record<string, SheetChoice>
  chosenBags: Record<string, number>
  /** Infusion durations the physician picked for antimicrobials, by row, min. */
  chosenDurations: Record<string, number>
  renalBandOffIds: string[]
  /** Rows given the full dose every other day instead of a lower daily one. */
  renalBandEveryOtherDayIds: string[]
  renalBandLevel: Record<string, RenalBandLevel>
  clearanceWeight: ClearanceWeight
}

export function initialCourseState(): CourseState {
  return {
    patient: null,
    settings: {
      startDate: todayIso(),
      dayStart: '11:00',
      bsaVariant: 'actual',
      bsaM2: null,
      cycleNumber: 1,
    },
    regimenId: undefined,
    phaseNote: null,
    customItems: [],
    disabledIds: [],
    drugPercent: {},
    doseOverrideAmount: {},
    plans: {},
    variants: [],
    infusionTherapy: NO_INFUSION_THERAPY,
    chosenDoses: {},
    chosenModifiers: {},
    administrationModes: {},
    infusionStart: {},
    header: emptyHeader(),
    manualRows: [],
    support: NO_SUPPORT,
    thromboAgent: 'apixaban',
    antiviralAgent: 'aciclovir',
    gastroAgent: 'tablet',
    mesnaFor: [],
    chosenRoutes: {},
    sheetChoices: {},
    chosenBags: {},
    chosenDurations: {},
    renalBandOffIds: [],
    renalBandEveryOtherDayIds: [],
    renalBandLevel: {},
    clearanceWeight: 'actual',
  }
}

export type CourseAction =
  /** A draft read back from the browser, or a course card imported from a file. */
  | { type: 'restore'; state: CourseState }
  | { type: 'patient'; patient: PatientInput | null }
  | { type: 'settings'; settings: CourseSettingsState; phaseNote?: string | null }
  | { type: 'cycle'; cycleNumber: number }
  /**
   * Another regimen was chosen: its own rows open at their defaults. What the regimen itself
   * needs is worked out from the catalog by the caller and handed in here.
   */
  | {
      type: 'regimen'
      regimenId: string | null
      support: Record<SupportCategory, boolean>
      disabledIds: string[]
      /** The standard support written out above an immunoglobulin of the new regimen. */
      ivigRows: ManualRow[]
    }
  | { type: 'support'; category: SupportCategory; on: boolean; ids: string[] }
  | { type: 'thromboAgent'; agent: ThromboAgent }
  | { type: 'antiviralAgent'; agent: AntiviralAgent }
  | { type: 'gastroAgent'; agent: GastroAgent }
  | { type: 'infusionTherapy'; value: InfusionTherapy }
  | { type: 'clearanceWeight'; value: ClearanceWeight }
  | { type: 'header'; value: HeaderValue }
  | { type: 'manualRows'; rows: ManualRow[] }
  | { type: 'ivigSupport'; id: string; rows: ManualRow[] }
  | { type: 'addDrug'; item: RegimenItem }
  | { type: 'removeRow'; id: string }
  | { type: 'toggleRow'; id: string; enabled: boolean }
  | { type: 'reduction'; id: string; percent: number | null }
  | { type: 'doseOverride'; id: string; amount: number | null }
  | { type: 'doseChoice'; id: string; choiceId: string }
  | { type: 'doseModifiers'; id: string; keys: string[] }
  | { type: 'administrationMode'; id: string; mode: AdministrationMode }
  | { type: 'plan'; id: string; patch: Partial<RowPlan> | null }
  | { type: 'variant'; id: string }
  | { type: 'route'; id: string; route: RegimenItem['route'] }
  | { type: 'sheet'; id: string; sheet: SheetChoice }
  | { type: 'bag'; id: string; bag: number }
  | { type: 'duration'; id: string; minutes: number | null }
  | { type: 'mesna'; id: string; on: boolean }
  | { type: 'renalBandOff'; id: string; off: boolean }
  | { type: 'renalBandEveryOtherDay'; id: string; on: boolean }
  | { type: 'renalBandLevel'; id: string; level: RenalBandLevel }
  | { type: 'infusionStart'; key: string; start: number }

/** Sets one entry of a map of row settings, or drops it when the physician clears the field. */
function entry<T>(map: Record<string, T>, id: string, value: T | null): Record<string, T> {
  const { [id]: _removed, ...rest } = map
  return value === null ? rest : { ...rest, [id]: value }
}

/** Adds an id to a list, or takes it out; never twice over. */
function listed(ids: string[], id: string, on: boolean): string[] {
  const without = ids.filter((entryId) => entryId !== id)
  return on ? [...without, id] : without
}

export function courseReducer(state: CourseState, action: CourseAction): CourseState {
  switch (action.type) {
    case 'restore':
      return action.state

    case 'patient':
      return { ...state, patient: action.patient }

    case 'settings': {
      // Another cycle is another course: the first-infusion ticks go back to «cycle 1 has it».
      const cycleChanged = action.settings.cycleNumber !== state.settings.cycleNumber
      return {
        ...state,
        settings: action.settings,
        ...(cycleChanged ? { infusionStart: {} } : {}),
        ...('phaseNote' in action ? { phaseNote: action.phaseNote ?? null } : {}),
      }
    }

    case 'cycle': {
      if (action.cycleNumber === state.settings.cycleNumber) {
        return { ...state, phaseNote: null }
      }
      return {
        ...state,
        settings: { ...state.settings, cycleNumber: action.cycleNumber },
        infusionStart: {},
        phaseNote: null,
      }
    }

    case 'regimen':
      return {
        ...state,
        regimenId: action.regimenId,
        support: action.support,
        disabledIds: action.disabledIds,
        thromboAgent: 'apixaban',
        antiviralAgent: 'aciclovir',
        gastroAgent: 'tablet',
        mesnaFor: [],
        // The lines proposed for the previous regimen go with it; the physician's own stay.
        manualRows: [
          ...state.manualRows.filter((row) => row.supportFor === undefined),
          ...action.ivigRows,
        ],
        chosenRoutes: {},
        sheetChoices: {},
        plans: {},
        variants: [],
        infusionTherapy: NO_INFUSION_THERAPY,
      }

    case 'support': {
      // The regimen's own rows of the kind follow the switch as a group.
      const disabledIds = action.on
        ? state.disabledIds.filter((id) => !action.ids.includes(id))
        : [...new Set([...state.disabledIds, ...action.ids])]
      return {
        ...state,
        support: { ...state.support, [action.category]: action.on },
        disabledIds,
      }
    }

    case 'thromboAgent':
      return { ...state, thromboAgent: action.agent }
    case 'antiviralAgent':
      return { ...state, antiviralAgent: action.agent }
    case 'gastroAgent':
      return { ...state, gastroAgent: action.agent }
    case 'infusionTherapy':
      return { ...state, infusionTherapy: action.value }
    case 'clearanceWeight':
      return { ...state, clearanceWeight: action.value }
    case 'header':
      return { ...state, header: action.value }
    case 'manualRows':
      return { ...state, manualRows: action.rows }

    case 'ivigSupport':
      return {
        ...state,
        manualRows: [
          ...state.manualRows.filter((row) => row.supportFor !== action.id),
          ...action.rows,
        ],
      }

    case 'addDrug':
      return { ...state, customItems: [...state.customItems, action.item] }

    case 'removeRow':
      return isVariant(action.id)
        ? { ...state, variants: state.variants.filter((id) => id !== action.id) }
        : { ...state, customItems: state.customItems.filter((item) => item.id !== action.id) }

    case 'toggleRow':
      return { ...state, disabledIds: listed(state.disabledIds, action.id, !action.enabled) }

    case 'reduction':
      return { ...state, drugPercent: entry(state.drugPercent, action.id, action.percent) }

    case 'doseOverride':
      return {
        ...state,
        doseOverrideAmount: entry(state.doseOverrideAmount, action.id, action.amount),
      }

    case 'doseChoice':
      return { ...state, chosenDoses: { ...state.chosenDoses, [action.id]: action.choiceId } }

    case 'doseModifiers':
      return { ...state, chosenModifiers: { ...state.chosenModifiers, [action.id]: action.keys } }

    case 'administrationMode':
      // The doses on offer change with the split, so a dose picked before no longer exists.
      return {
        ...state,
        chosenDoses: entry(state.chosenDoses, action.id, null),
        doseOverrideAmount: entry(state.doseOverrideAmount, action.id, null),
        administrationModes: { ...state.administrationModes, [action.id]: action.mode },
      }

    case 'plan': {
      const own = state.plans[action.id]
      return {
        ...state,
        plans: entry(state.plans, action.id, action.patch && { ...own, ...action.patch }),
      }
    }

    case 'variant':
      return {
        ...state,
        variants: [...state.variants, nextVariantId(variantBase(action.id), state.variants)],
      }

    case 'route':
      return { ...state, chosenRoutes: { ...state.chosenRoutes, [action.id]: action.route } }
    case 'sheet':
      return { ...state, sheetChoices: { ...state.sheetChoices, [action.id]: action.sheet } }
    case 'bag':
      return { ...state, chosenBags: { ...state.chosenBags, [action.id]: action.bag } }

    case 'duration':
      return { ...state, chosenDurations: entry(state.chosenDurations, action.id, action.minutes) }

    case 'mesna':
      return { ...state, mesnaFor: listed(state.mesnaFor, action.id, action.on) }

    case 'renalBandOff':
      return { ...state, renalBandOffIds: listed(state.renalBandOffIds, action.id, action.off) }

    case 'renalBandEveryOtherDay':
      return {
        ...state,
        renalBandEveryOtherDayIds: listed(state.renalBandEveryOtherDayIds, action.id, action.on),
      }

    case 'renalBandLevel':
      return { ...state, renalBandLevel: { ...state.renalBandLevel, [action.id]: action.level } }

    case 'infusionStart':
      return { ...state, infusionStart: { ...state.infusionStart, [action.key]: action.start } }
  }
}
