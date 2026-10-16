import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'

import type { ClearanceWeight, RenalBandLevel } from '../../domain'
import type { AdministrationMode, SheetChoice } from '../../lib/course-input'
import type { RowPlan } from '../../lib/row-plan'
import type {
  AntiviralAgent,
  GastroAgent,
  SupportCategory,
  ThromboAgent,
} from '../../lib/standard-support'
import { NO_SUPPORT } from '../../lib/standard-support'
import type { RegimenItem } from '../../schemas/catalog'
import { emptyPatientForm, todayIso, type PatientFormValues } from '../../schemas/patient'
import { emptyHeader, type HeaderValue } from './header'
import type { ManualRow } from './manual-rows'
import { NO_INFUSION_THERAPY, type InfusionTherapy } from './supportive-rows'
import type { BsaSource } from './CourseSettings'

/**
 * Everything the physician has set on a course, in one object: the patient's measurements, the
 * settings of the course, every row's dose, hour, sheet and route, the hand-written lines, the
 * header of the printed sheets. One place instead of three dozen separate states, so a course
 * can be kept as a draft, written to a file and read back — and so nothing is lost by leaving
 * the page or accepting an update of the app.
 *
 * Patient data lives here and nowhere else: it is never sent anywhere, and what of it is written
 * to this device is the physician's own choice ([course-draft](../../lib/course-draft.ts)).
 */
export interface CourseState {
  /** The patient form as it is typed, so the fields themselves come back with the draft. */
  patientForm: PatientFormValues
  courseSettings: {
    startDate: string
    dayStart: string
    bsaVariant: BsaSource
    bsaM2: number | null
    cycleNumber: number
  }
  /** Drugs the physician added to the course by hand. */
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
  chosenDurations: Record<string, number>
  renalBandOffIds: string[]
  renalBandEveryOtherDayIds: string[]
  renalBandLevel: Record<string, RenalBandLevel>
  clearanceWeight: ClearanceWeight
}

/** A course nobody has touched yet: today's date, no regimen, no patient. */
export function initialCourseState(): CourseState {
  return {
    patientForm: emptyPatientForm(),
    courseSettings: {
      startDate: todayIso(),
      dayStart: '11:00',
      bsaVariant: 'actual',
      bsaM2: null,
      cycleNumber: 1,
    },
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

/** The fields of a course, as the draft and the course card iterate over them. */
export const COURSE_FIELDS = Object.keys(initialCourseState()) as (keyof CourseState)[]

/** One setter per field, each behaving like `useState`'s own — a value or an updater. */
export type CourseSetters = {
  [K in keyof CourseState]: (action: SetStateAction<CourseState[K]>) => void
}

function fieldSetter<K extends keyof CourseState>(
  setState: Dispatch<SetStateAction<CourseState>>,
  key: K,
): (action: SetStateAction<CourseState[K]>) => void {
  return (action) =>
    setState((current) => ({
      ...current,
      [key]:
        typeof action === 'function'
          ? (action as (previous: CourseState[K]) => CourseState[K])(current[key])
          : action,
    }))
}

/**
 * The state of the course and a setter for each of its fields. The setters are made once, so a
 * component given one is not re-rendered for the sake of a new function.
 */
export function useCourseState(initial: CourseState): {
  state: CourseState
  setState: Dispatch<SetStateAction<CourseState>>
  set: CourseSetters
} {
  const [state, setState] = useState<CourseState>(initial)
  const set = useMemo(
    () =>
      Object.fromEntries(
        COURSE_FIELDS.map((key) => [key, fieldSetter(setState, key)]),
      ) as CourseSetters,
    [],
  )
  return { state, setState, set }
}
