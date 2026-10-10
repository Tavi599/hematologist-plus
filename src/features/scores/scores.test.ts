import { describe, expect, it } from 'vitest'

import { GENERAL_SCORES } from './general'
import { RISK_SCORES, tlsDiseaseRisk } from './risk'
import type { Values } from './types'

const all = [...GENERAL_SCORES, ...RISK_SCORES]
const score = (id: string) => all.find((entry) => entry.id === id)!
const run = (id: string, values: Values) => score(id).compute(values)

describe('every score', () => {
  it('has a unique id, a source unless it is plain arithmetic, and waits for its inputs', () => {
    expect(new Set(all.map((entry) => entry.id)).size).toBe(all.length)
    for (const entry of all) {
      if (!['bmi', 'anc'].includes(entry.id)) expect(entry.sources.length).toBeGreaterThan(0)
      const empty = entry.compute({})
      // A score of ticks alone is complete with none ticked; one with numbers waits.
      if (entry.fields.some((field) => field.kind !== 'check')) expect(empty).toBeNull()
    }
  })
})

describe('general formulas', () => {
  it('BSA by Mosteller', () => {
    expect(run('bsa', { heightCm: 170, weightKg: 70 })!.value!.amount).toBeCloseTo(1.818, 3)
  })

  it('CKD-EPI 2021 matches worked values', () => {
    // Male, 60, creatinine 1.2 mg/dL: about 69; female, 50, 0.7 mg/dL: about 105.
    expect(
      run('ckd-epi-2021', { ageYears: 60, sex: 'male', creatinine: 1.2, creatinineUnit: 'mg_dl' })!
        .value!.amount,
    ).toBeCloseTo(69.2, 1)
    expect(
      run('ckd-epi-2021', {
        ageYears: 50,
        sex: 'female',
        creatinine: 0.7,
        creatinineUnit: 'mg_dl',
      })!.value!.amount,
    ).toBeCloseTo(105.3, 1)
    // µmol/L converts: 106.08 µmol/L is 1.2 mg/dL.
    expect(
      run('ckd-epi-2021', {
        ageYears: 60,
        sex: 'male',
        creatinine: 106.08,
        creatinineUnit: 'umol_l',
      })!.value!.amount,
    ).toBeCloseTo(69.2, 1)
  })

  it('Calvert caps the GFR at 125 mL/min', () => {
    expect(run('calvert', { auc: 5, gfr: 100 })!.value!.amount).toBe(625)
    expect(run('calvert', { auc: 5, gfr: 150 })!.value!.amount).toBe(750)
  })

  it('adjusts calcium for albumin by Payne', () => {
    expect(run('corrected-calcium', { calcium: 2.1, albumin: 30 })!.value!.amount).toBeCloseTo(2.35)
  })

  it('counts neutrophils with bands left empty', () => {
    expect(run('anc', { wbc: 4, segmented: 50 })!.value!.amount).toBe(2)
  })
})

describe('tumour lysis syndrome (Cairo 2010)', () => {
  it('reads the disease risk from the figures', () => {
    expect(tlsDiseaseRisk({ disease: 'myeloma' })).toBe('LRD')
    expect(tlsDiseaseRisk({ disease: 'aml', wbc: 10, ldhRatio: 1 })).toBe('LRD')
    expect(tlsDiseaseRisk({ disease: 'aml', wbc: 10, ldhRatio: 2 })).toBe('IRD')
    expect(tlsDiseaseRisk({ disease: 'aml', wbc: 30 })).toBe('IRD')
    expect(tlsDiseaseRisk({ disease: 'aml', wbc: 100 })).toBe('HRD')
    expect(tlsDiseaseRisk({ disease: 'all', wbc: 50, ldhRatio: 1.5 })).toBe('IRD')
    expect(tlsDiseaseRisk({ disease: 'all', wbc: 50, ldhRatio: 2 })).toBe('HRD')
    expect(tlsDiseaseRisk({ disease: 'cll-alkylating', wbc: 60 })).toBe('IRD')
    expect(tlsDiseaseRisk({ disease: 'burkitt-leukaemia' })).toBe('HRD')
    expect(tlsDiseaseRisk({ disease: 'burkitt-lymphoma', ldhRatio: 1.5 })).toBe('IRD')
    expect(tlsDiseaseRisk({ disease: 'burkitt-lymphoma', advancedStage: true })).toBe('HRD')
    expect(tlsDiseaseRisk({ disease: 'aggressive', ageGroup: 'adult', ldhRatio: 1 })).toBe('LRD')
    expect(tlsDiseaseRisk({ disease: 'aggressive', ageGroup: 'adult', ldhRatio: 1.5 })).toBe('IRD')
    expect(
      tlsDiseaseRisk({ disease: 'aggressive', ageGroup: 'adult', ldhRatio: 1.5, bulky: true }),
    ).toBe('HRD')
    expect(
      tlsDiseaseRisk({
        disease: 'aggressive',
        ageGroup: 'child',
        ldhRatio: 2,
        advancedStage: true,
      }),
    ).toBe('HRD')
    expect(tlsDiseaseRisk({ disease: 'alcl', ageGroup: 'child', advancedStage: true })).toBe('IRD')
    // Waits for what it needs.
    expect(tlsDiseaseRisk({ disease: 'aml' })).toBeNull()
  })

  it('adjusts for the kidneys and laboratory changes', () => {
    const label = (values: Values) => run('tls-cairo', values)!.group!.label.en
    expect(label({ disease: 'myeloma' })).toBe('Low')
    expect(label({ disease: 'myeloma', renal: true })).toBe('Intermediate')
    expect(label({ disease: 'aml', wbc: 30 })).toBe('Intermediate')
    expect(label({ disease: 'aml', wbc: 30, renal: true })).toBe('High')
    expect(label({ disease: 'aml', wbc: 30, potassium: true })).toBe('High')
    // Laboratory changes alone do not raise a low-risk disease, but two of them say LTLS.
    const ltls = run('tls-cairo', { disease: 'myeloma', uricAcid: true, phosphate: true })!
    expect(ltls.group!.label.en).toBe('Low')
    expect(ltls.notes.some((note) => note.en.includes('laboratory TLS'))).toBe(true)
  })
})

describe('risk scores', () => {
  const group = (id: string, values: Values) => run(id, values)!.group!.label.en

  it('IPI with R-IPI', () => {
    const outcome = run('ipi', { age: true, ldh: true, stage: true })!
    expect(outcome.group!.label.en).toBe('High-intermediate')
    expect(outcome.notes.some((note) => note.en.includes('R-IPI: poor'))).toBe(true)
    expect(group('ipi', {})).toBe('Low')
  })

  it('NCCN-IPI by age, LDH ratio and the rest', () => {
    // Age 70 (2) + LDH 2 × ULN (1) + stage III-IV (1) = 4.
    expect(group('nccn-ipi', { ageYears: 70, ldhRatio: 2, stage: true })).toBe('High-intermediate')
    expect(group('nccn-ipi', { ageYears: 80, ldhRatio: 3.5, stage: true, ecog: true })).toBe('High')
    expect(group('nccn-ipi', { ageYears: 40, ldhRatio: 1 })).toBe('Low')
  })

  it('FLIPI and CLL-IPI', () => {
    expect(group('flipi', { age: true, stage: true })).toBe('Intermediate')
    expect(group('cll-ipi', { tp53: true, ighv: true, b2m: true })).toBe('Very high')
    expect(group('cll-ipi', { ighv: true, age: true })).toBe('Intermediate')
  })

  it('MIPI by its formula', () => {
    const outcome = run('mipi', { ageYears: 60, ldh: 200, uln: 250, wbc: 6.7 })!
    expect(outcome.value!.amount).toBeCloseTo(5.582, 2)
    expect(outcome.group!.label.en).toBe('Low')
    expect(group('mipi', { ageYears: 75, ecog: true, ldh: 400, uln: 250, wbc: 12 })).toBe('High')
  })

  it('R-ISS and R2-ISS from β2-microglobulin and albumin', () => {
    expect(group('r-iss', { b2m: 3, albumin: 40 })).toBe('R-ISS I')
    expect(group('r-iss', { b2m: 6, albumin: 30, ldh: true })).toBe('R-ISS III')
    expect(group('r-iss', { b2m: 6, albumin: 30 })).toBe('R-ISS II')
    // ISS III (1.5) + 1q+ (0.5) = 2.
    expect(group('r2-iss', { b2m: 6, albumin: 30, gain1q: true })).toBe(
      'R2-ISS III (intermediate-high)',
    )
    expect(group('r2-iss', { b2m: 2, albumin: 40 })).toBe('R2-ISS I (low)')
  })

  it('Sokal and ELTS by the ELN 2020 formulas', () => {
    // Every term zero: exp(0) = 1, intermediate.
    const sokal = run('sokal', {
      ageYears: 43.4,
      spleen: 7.51,
      platelets: 700 * Math.sqrt(0.563),
      blasts: 2.1,
    })!
    expect(sokal.value!.amount).toBeCloseTo(1, 6)
    expect(sokal.group!.label.en).toBe('Intermediate')
    // 0.0025 × 5³ + 0.4104 × 0.25^−0.5 = 0.3125 + 0.8208.
    const elts = run('elts', { ageYears: 50, spleen: 0, platelets: 250, blasts: 0 })!
    expect(elts.value!.amount).toBeCloseTo(1.1333, 4)
    expect(elts.group!.label.en).toBe('Low')
  })

  it('IPSS-R, DIPSS and Khorana', () => {
    // Good (1) + blasts 3% (1) + Hb 90 (1) = 3: low.
    expect(
      group('ipss-r', { cytogenetics: '1', blasts: 3, haemoglobin: 90, platelets: 120, anc: 1 }),
    ).toBe('Low')
    expect(
      group('ipss-r', { cytogenetics: '4', blasts: 12, haemoglobin: 70, platelets: 30, anc: 0.5 }),
    ).toBe('Very high')
    expect(group('dipss', { haemoglobin: true })).toBe('Intermediate-1')
    expect(group('dipss', { haemoglobin: true, age: true, blasts: true })).toBe('Intermediate-2')
    expect(group('khorana', { site: 'high', platelets: true })).toBe('Intermediate')
    expect(group('khorana', { site: 'very-high', anaemia: true })).toBe('High')
  })
})
