import { describe, expect, it } from 'vitest'

import { RISK_AREAS, scoresForDisease } from './areas'
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

  it('IPSS and WPSS follow the NCCN MDS-B tables', () => {
    // Blasts 12% (1.5) + poor karyotype (1) + two cytopenias (0.5) = 3: high.
    expect(group('ipss', { blasts: 12, karyotype: '1', cytopenias: '0.5' })).toBe('High')
    // Blasts 3% (0) + good (0) + two cytopenias (0.5) = 0.5: intermediate-1, managed as lower risk.
    const lower = run('ipss', { blasts: 3, karyotype: '0', cytopenias: '0.5' })!
    expect(lower.group!.label.en).toBe('Intermediate-1')
    expect(lower.notes[0]!.en).toContain('lower risk')
    expect(group('ipss', { blasts: 3, karyotype: '0', cytopenias: '0' })).toBe('Low')
    expect(group('ipss', { blasts: 15, karyotype: '0.5', cytopenias: '0' })).toBe('Intermediate-2')
    // RAEB-1 (2) + intermediate karyotype (1) + severe anaemia (1) = 4: high.
    expect(group('wpss', { who: '2', karyotype: '1', anaemia: true })).toBe('High')
    expect(group('wpss', { who: '1', karyotype: '0' })).toBe('Low')
    expect(group('wpss', { who: '0', karyotype: '0' })).toBe('Very low')
    expect(group('wpss', { who: '3', karyotype: '2', anaemia: true })).toBe('Very high')
  })

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
    // Good (1) + blasts 3% (1) + Hb 90 (1) + platelets 60 (0.5) = 3.5: intermediate, managed as lower risk.
    const borderline = run('ipss-r', {
      cytogenetics: '1',
      blasts: 3,
      haemoglobin: 90,
      platelets: 60,
      anc: 1,
    })!
    expect(borderline.group!.label.en).toBe('Intermediate')
    expect(borderline.notes[0]!.en).toContain('3.5 or less as lower risk')
    // Intermediate (2) + blasts 3% (1) + Hb 90 (1) = 4: above 3.5, managed as higher risk.
    const above = run('ipss-r', {
      cytogenetics: '2',
      blasts: 3,
      haemoglobin: 90,
      platelets: 120,
      anc: 1,
    })!
    expect(above.notes[0]!.en).toContain('above 3.5 as higher risk')
    expect(group('dipss', { haemoglobin: true })).toBe('Intermediate-1')
    expect(group('dipss', { haemoglobin: true, age: true, blasts: true })).toBe('Intermediate-2')
    expect(group('khorana', { site: 'high', platelets: true })).toBe('Intermediate')
    expect(group('khorana', { site: 'very-high', anaemia: true })).toBe('High')
  })
})

describe('score groups', () => {
  it('puts every risk score in exactly one group, and names only diseases in the catalog', () => {
    for (const entry of RISK_SCORES) {
      expect(RISK_AREAS.filter((area) => area.scoreIds.includes(entry.id))).toHaveLength(1)
    }
    // The catalog's diseases are the folders of data/diseases.
    const known = new Set(
      Object.keys(import.meta.glob('../../../data/diseases/*/disease.json')).map((path) =>
        path.split('/').at(-2)!,
      ),
    )
    expect(known.size).toBeGreaterThan(10)
    for (const area of RISK_AREAS) for (const id of area.diseases) expect(known).toContain(id)
  })

  it('lists the disease own scores before those for any malignancy', () => {
    expect(scoresForDisease('dlbcl').map((entry) => entry.id)).toEqual([
      'ipi',
      'aa-ipi',
      'nccn-ipi',
      'cns-ipi',
      'tls-cairo',
      'khorana',
    ])
    expect(scoresForDisease('nope')).toEqual([])
  })

  it('converts ECOG and Karnofsky both ways', () => {
    expect(run('ecog-karnofsky', { grade: 'ecog-2' })!.group!.label.en).toBe('Karnofsky 60 / 50%')
    expect(run('ecog-karnofsky', { grade: 'kps-70' })!.group!.label.en).toBe('ECOG 1')
  })

  it('CNS-IPI, aaIPI and MIPSS70', () => {
    const group = (id: string, values: Values) => run(id, values)!.group!.label.en
    expect(group('cns-ipi', { age: true, ldh: true, kidney: true, stage: true })).toBe('High')
    expect(group('aa-ipi', { ldh: true, stage: true })).toBe('High-intermediate')
    // Two or more HMR mutations (3) + leukocytosis (2) = 5: high.
    expect(group('mipss70', { hmr: '3', leukocytes: true })).toBe('High')
    expect(group('mipss70', { hmr: '0', haemoglobin: true })).toBe('Low')
  })

  it('HCT-CI by the weights of Table 4', () => {
    const group = (values: Values) => run('hct-ci', values)!.group!.label.en
    expect(group({ pulmonary: '0', hepatic: '0' })).toBe('Low')
    expect(group({ pulmonary: '0', hepatic: '1', diabetes: true })).toBe('Intermediate')
    // Severe lungs (3) alone is high.
    expect(group({ pulmonary: '3', hepatic: '0' })).toBe('High')
    expect(
      run('hct-ci', { pulmonary: '2', hepatic: '3', renal: true, valve: true })!.value!.amount,
    ).toBe(10)
  })
})
