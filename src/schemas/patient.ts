import { z } from 'zod'

/**
 * Patient form. These values never leave the browser: they live in component state,
 * are never sent to Supabase and are never cached by the service worker.
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

/** Number inputs hand over a number or an empty string; an empty one reads as «not given». */
const optionalNumber = (min: number, max: number) =>
  z.union([
    z.literal('').transform(() => null),
    z.null(),
    z
      .union([z.number(), z.string().trim().min(1)])
      .transform(Number)
      .pipe(z.number().min(min).max(max)),
  ])

export const CREATININE_UNITS = ['umol_l', 'mg_dl'] as const

/**
 * Wide hard limits; clinically implausible values are surfaced as warnings by the domain.
 *
 * Height, weight and age may be left empty: a course of drugs dosed per square metre can be
 * calculated from a BSA the physician types in, and the printed sheet simply leaves the line for
 * the ward to fill in by hand. What is genuinely needed is asked for where it is needed — a dose
 * per kilogram or by AUC names the missing field instead of the form refusing to start.
 */
export const patientFormSchema = z.object({
  /** Identification, used only for the printed sheets. */
  fullName: z.string().trim(),
  recordNumber: z.string().trim(),
  birthDate: z.union([z.literal(''), z.string().regex(DATE_PATTERN)]),
  ageYears: optionalNumber(0, 130),
  sex: z.enum(['male', 'female']),
  heightCm: optionalNumber(50, 300),
  weightKg: optionalNumber(1, 500),
  serumCreatinine: optionalNumber(0.01, 5000),
  creatinineUnit: z.enum(CREATININE_UNITS),
  bilirubinUmolL: optionalNumber(0.1, 2000),
})

export type PatientFormValues = z.input<typeof patientFormSchema>
export type PatientInput = z.output<typeof patientFormSchema>

export const courseSettingsSchema = z.object({
  startDate: z.string().regex(DATE_PATTERN),
  dayStart: z.string().regex(TIME_PATTERN),
})

export function emptyPatientForm(): PatientFormValues {
  return {
    fullName: '',
    recordNumber: '',
    birthDate: '',
    ageYears: '',
    sex: 'male',
    heightCm: '',
    weightKg: '',
    serumCreatinine: '',
    creatinineUnit: 'umol_l',
    bilirubinUmolL: '',
  }
}

/** Full years between a birth date and a reference date; null for malformed input. */
export function ageFromBirthDate(birthDate: string, today = new Date()): number | null {
  if (!DATE_PATTERN.test(birthDate)) return null
  const [year, month, day] = birthDate.split('-').map(Number) as [number, number, number]
  const birth = new Date(Date.UTC(year, month - 1, day))
  if (Number.isNaN(birth.getTime()) || birth.getUTCDate() !== day) return null

  const reference = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  if (birth.getTime() > reference) return null
  let age = new Date(reference).getUTCFullYear() - year
  const hadBirthday =
    new Date(reference).getUTCMonth() + 1 > month ||
    (new Date(reference).getUTCMonth() + 1 === month && new Date(reference).getUTCDate() >= day)
  if (!hadBirthday) age -= 1
  return age
}

/** Today as YYYY-MM-DD in the local time zone (course dates are local calendar dates). */
export function todayIso(today = new Date()): string {
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${today.getFullYear()}-${month}-${day}`
}
