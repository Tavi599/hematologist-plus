import type { CourseAdjustments, CourseDrug, CoursePatient } from '../course'

/**
 * Reference sheet № 1 of the calibration (docs/calibration.md): the department's own
 * «Схеми курсів на листах призначень/HD ARA-C (Цитозар 1,5 г_м2).xlsx», read on 2026-11-20.
 *
 * What the sheet itself carries, verbatim:
 * - header of every day sheet: `S тіла: 1,8 м^2`; age, height and weight are left blank;
 * - days 1, 3 and 5: `Цитозар (цитарабін) 2700 мг / 0,9% NaCl 500,0 мл`, `в/в крап. V= 170 мл/год`,
 *   with the mark in the hour columns 10 and 22;
 * - the hydration before it (`Р-н Натрію хлориду 0.9% 1000 мл` + `Р-н Калія хлориду 4,0 % 40 мл` +
 *   `Р-н Магнію сульфату 25% 4 мл`, `V= 150 мл/год`) starts at hour 9 on those days and at hour 11
 *   on days 0, 2 and 4;
 * - the inpatient sheet: `Ацикловір 400 мг`, `р.о. х 2р/добу (09:00 та 21:00)`.
 *
 * Only the numbers above are expectations of the calculator. Ondansetron, pyridoxine, the eye
 * drops and the hydration are rows the physician adds to the sheet by hand, and their hours
 * differ from one day sheet to the next, so the sheet gives no rule to calibrate them against.
 */
export const HD_ARA_C_SHEET = {
  source: 'Схеми курсів на листах призначень/HD ARA-C (Цитозар 1,5 г_м2).xlsx',
  readOn: '2026-11-20',
  regimenId: 'hd-ara-c',

  /** The sheet gives the BSA and nothing else: age, height and weight are blank on the blank. */
  patient: {} satisfies CoursePatient,

  /**
   * The cytarabine row of `data/regimens/hd-ara-c.json` joined with the `nacl-500` dilution set of
   * `data/drugs/cytarabine.json`. `calibration.test.ts` checks these numbers against both files.
   */
  cytarabine: {
    id: 'hd-ara-c.cytarabine',
    dose: { value: 1500, unit: 'mg_m2' },
    days: [1, 3, 5],
    administrationsPerDay: 2,
    intervalMin: 720,
    durationMin: 180,
    isMain: true,
    drugKey: 'cytarabine',
    infusion: { bagVolumesMl: [500] },
  } satisfies CourseDrug,

  /**
   * The hydration opens the day at 09:00 and the cytostatic follows at 10:00; the physician sets
   * that hour on the form (the default start, 11:00, is the one on the sheets of the days without
   * a cytostatic).
   */
  adjustments: {
    startDateIso: '2026-11-23',
    dayStart: '10:00',
    bsaM2: 1.8,
  } satisfies CourseAdjustments,

  expected: {
    bsaM2: 1.8,
    /** `Цитозар (цитарабін) 2700 мг`: 1500 mg/m² × 1.8 m², and the sheet rounds nothing further. */
    doseAmount: 2700,
    /** `0,9% NaCl 500,0 мл`. */
    bagVolumeMl: 500,
    totalVolumeMl: 500,
    /** `V= 170 мл/год` — 500 mL over 3 hours is 166.7 mL/h, written as whole tens. */
    rateMlH: 170,
    /** The marks in the hour columns of days 1, 3 and 5. */
    times: ['10:00', '22:00'],
    administrationsInCourse: 6,
  },
}
