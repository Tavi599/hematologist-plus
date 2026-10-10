import { mostellerBsa } from '../../domain/bsa'
import { DOMAIN_DEFAULTS } from '../../domain/config'
import { calvertDose, cockcroftGault, creatinineToMgDl } from '../../domain/renal'
import type { CreatinineUnit } from '../../domain/types'
import type { Field, Score, Text2, Values } from './types'

type NumberField = Extract<Field, { kind: 'number' }>
const t = (uk: string, en: string): Text2 => ({ uk, en })

/** A positive number the physician has entered, or undefined. */
export function num(values: Values, key: string): number | undefined {
  const value = values[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export const HEIGHT: NumberField = {
  kind: 'number',
  key: 'heightCm',
  label: t('Зріст', 'Height'),
  unit: t('см', 'cm'),
  min: 50,
  max: 250,
}
export const WEIGHT: NumberField = {
  kind: 'number',
  key: 'weightKg',
  label: t('Маса тіла', 'Weight'),
  unit: t('кг', 'kg'),
  min: 2,
  max: 350,
  step: 0.1,
}
export const AGE: NumberField = {
  kind: 'number',
  key: 'ageYears',
  label: t('Вік', 'Age'),
  unit: t('років', 'years'),
  min: 18,
  max: 120,
}
export const SEX: Field = {
  kind: 'select',
  key: 'sex',
  label: t('Стать', 'Sex'),
  options: [
    { value: 'male', label: t('Чоловіча', 'Male') },
    { value: 'female', label: t('Жіноча', 'Female') },
  ],
}
const CREATININE: Field = {
  kind: 'number',
  key: 'creatinine',
  label: t('Креатинін сироватки', 'Serum creatinine'),
  step: 0.01,
  min: 0,
}
const CREATININE_UNIT: Field = {
  kind: 'select',
  key: 'creatinineUnit',
  label: t('Одиниці креатиніну', 'Creatinine unit'),
  options: [
    { value: 'umol_l', label: t('мкмоль/л', 'µmol/L') },
    { value: 'mg_dl', label: t('мг/дл', 'mg/dL') },
  ],
  initial: 'umol_l',
}

const MOSTELLER = {
  name: 'Mosteller RD. Simplified calculation of body-surface area. N Engl J Med 1987;317:1098',
  url: 'https://pubmed.ncbi.nlm.nih.gov/3657876/',
  checked: t(
    'Формула; та сама, що в калькуляторі доз',
    'The formula; the same as in the dose calculator',
  ),
}

const bsa: Score = {
  id: 'bsa',
  section: 'general',
  title: t('Площа поверхні тіла (Mosteller)', 'Body surface area (Mosteller)'),
  purpose: t('√(зріст × маса / 3600)', '√(height × weight / 3600)'),
  fields: [HEIGHT, WEIGHT],
  compute: (values) => {
    const height = num(values, 'heightCm')
    const weight = num(values, 'weightKg')
    if (!height || !weight) return null
    const m2 = mostellerBsa(height, weight)
    return {
      value: { amount: m2, decimals: 2, unit: t('м²', 'm²') },
      notes:
        m2 > DOMAIN_DEFAULTS.bsaCapM2
          ? [
              t(
                `Більше ${DOMAIN_DEFAULTS.bsaCapM2} м²: калькулятор доз показує й дозу на ${DOMAIN_DEFAULTS.bsaCapM2} м².`,
                `Above ${DOMAIN_DEFAULTS.bsaCapM2} m²: the dose calculator also shows the dose for ${DOMAIN_DEFAULTS.bsaCapM2} m².`,
              ),
            ]
          : [],
    }
  },
  sources: [MOSTELLER],
}

const bmi: Score = {
  id: 'bmi',
  section: 'general',
  title: t('Індекс маси тіла', 'Body mass index'),
  purpose: t(
    'Маса / зріст²; поріг 35 кг/м² входить до шкали Khorana',
    'Weight / height²; 35 kg/m² is a Khorana factor',
  ),
  fields: [HEIGHT, WEIGHT],
  compute: (values) => {
    const height = num(values, 'heightCm')
    const weight = num(values, 'weightKg')
    if (!height || !weight) return null
    return {
      value: { amount: weight / (height / 100) ** 2, decimals: 1, unit: t('кг/м²', 'kg/m²') },
      notes: [],
    }
  },
  sources: [],
}

function creatinineMgDl(values: Values): number | undefined {
  const value = num(values, 'creatinine')
  if (!value || value <= 0) return undefined
  return creatinineToMgDl(value, (values.creatinineUnit as CreatinineUnit) ?? 'umol_l')
}

const crcl: Score = {
  id: 'cockcroft-gault',
  section: 'general',
  title: t('Кліренс креатиніну (Cockcroft-Gault)', 'Creatinine clearance (Cockcroft-Gault)'),
  purpose: t(
    '(140 − вік) × маса / (72 × креатинін, мг/дл), у жінок × 0,85',
    '(140 − age) × weight / (72 × creatinine, mg/dL), × 0.85 in women',
  ),
  fields: [AGE, WEIGHT, SEX, CREATININE, CREATININE_UNIT],
  compute: (values) => {
    const age = num(values, 'ageYears')
    const weight = num(values, 'weightKg')
    const creatinine = num(values, 'creatinine')
    if (!age || !weight || !creatinine || (values.sex !== 'male' && values.sex !== 'female'))
      return null
    const result = cockcroftGault({
      ageYears: age,
      weightKg: weight,
      sex: values.sex,
      serumCreatinine: creatinine,
      creatinineUnit: (values.creatinineUnit as CreatinineUnit) ?? 'umol_l',
    })
    return {
      value: { amount: result.mlMin, decimals: 0, unit: t('мл/хв', 'mL/min') },
      notes: [
        t(
          'Фактична маса тіла — так само рахує калькулятор доз.',
          'Actual body weight, as the dose calculator uses.',
        ),
      ],
    }
  },
  sources: [
    {
      name: 'Cockcroft DW, Gault MH. Prediction of creatinine clearance from serum creatinine. Nephron 1976;16:31–41',
      url: 'https://pubmed.ncbi.nlm.nih.gov/1244564/',
      checked: t(
        'Резюме: формула для чоловіків, у жінок на 15% менше',
        'Abstract: the formula for men, 15% less in women',
      ),
    },
  ],
}

const ckdEpi: Score = {
  id: 'ckd-epi-2021',
  section: 'general',
  title: t('ШКФ за CKD-EPI 2021', 'eGFR, CKD-EPI 2021'),
  purpose: t(
    'Креатинінове рівняння без раси; результат на 1,73 м²',
    'The creatinine equation without race; per 1.73 m²',
  ),
  fields: [AGE, SEX, CREATININE, CREATININE_UNIT],
  compute: (values) => {
    const age = num(values, 'ageYears')
    const scr = creatinineMgDl(values)
    if (!age || !scr || (values.sex !== 'male' && values.sex !== 'female')) return null
    const female = values.sex === 'female'
    const kappa = female ? 0.7 : 0.9
    const alpha = female ? -0.241 : -0.302
    const ratio = scr / kappa
    const egfr =
      142 *
      Math.min(ratio, 1) ** alpha *
      Math.max(ratio, 1) ** -1.2 *
      0.9938 ** age *
      (female ? 1.012 : 1)
    return {
      value: { amount: egfr, decimals: 0, unit: t('мл/хв/1,73 м²', 'mL/min/1.73 m²') },
      notes: [
        t(
          '142 × min(Scr/κ, 1)^α × max(Scr/κ, 1)^−1,200 × 0,9938^вік × 1,012 (жінки); κ 0,7 (ж) / 0,9 (ч), α −0,241 (ж) / −0,302 (ч), Scr у мг/дл.',
          '142 × min(Scr/κ, 1)^α × max(Scr/κ, 1)^−1.200 × 0.9938^age × 1.012 (women); κ 0.7 (F) / 0.9 (M), α −0.241 (F) / −0.302 (M), Scr in mg/dL.',
        ),
        t(
          'Для дозування карбоплатину й ниркових корекцій інструкції здебільшого беруть кліренс за Cockcroft-Gault.',
          'For carboplatin and renal adjustments the labels mostly use the Cockcroft-Gault clearance.',
        ),
      ],
    }
  },
  sources: [
    {
      name: 'Inker LA et al. New creatinine- and cystatin C-based equations to estimate GFR without race. N Engl J Med 2021;385:1737–49',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8822996/',
      checked: t(
        'Таблиця коефіцієнтів (2021 CKD-EPI creatinine: 142; −0,241/−0,302; −1,200; 0,9938; 1,012) і формула під нею',
        'The coefficient table (2021 CKD-EPI creatinine: 142; −0.241/−0.302; −1.200; 0.9938; 1.012) and the formula under it',
      ),
    },
  ],
}

const calvert: Score = {
  id: 'calvert',
  section: 'general',
  title: t('Доза карбоплатину (Calvert)', 'Carboplatin dose (Calvert)'),
  purpose: t('Доза (мг) = цільова AUC × (ШКФ + 25)', 'Dose (mg) = target AUC × (GFR + 25)'),
  fields: [
    {
      kind: 'number',
      key: 'auc',
      label: t('Цільова AUC', 'Target AUC'),
      unit: t('мг/мл·хв', 'mg/mL·min'),
      min: 1,
      max: 10,
      step: 0.5,
    },
    {
      kind: 'number',
      key: 'gfr',
      label: t('ШКФ або кліренс креатиніну', 'GFR or creatinine clearance'),
      unit: t('мл/хв', 'mL/min'),
      min: 0,
      max: 250,
    },
  ],
  compute: (values) => {
    const auc = num(values, 'auc')
    const gfr = num(values, 'gfr')
    if (!auc || gfr === undefined) return null
    const result = calvertDose(auc, gfr)
    return {
      value: { amount: result.doseMg, decimals: 0, unit: t('мг', 'mg') },
      notes: result.isGfrCapped
        ? [
            t(
              `ШКФ обмежено ${result.gfrUsedMlMin} мл/хв (рекомендація FDA, як і в калькуляторі доз).`,
              `GFR capped at ${result.gfrUsedMlMin} mL/min (FDA guidance, as in the dose calculator).`,
            ),
          ]
        : [],
    }
  },
  sources: [
    {
      name: 'Calvert AH et al. Carboplatin dosage: prospective evaluation of a simple formula based on renal function. J Clin Oncol 1989;7:1748–56',
      url: 'https://pubmed.ncbi.nlm.nih.gov/2681557/',
      checked: t('Резюме: доза = AUC × (ШКФ + 25)', 'Abstract: dose = AUC × (GFR + 25)'),
    },
  ],
}

const calcium: Score = {
  id: 'corrected-calcium',
  section: 'general',
  title: t('Кальцій, скоригований на альбумін (Payne)', 'Albumin-adjusted calcium (Payne)'),
  purpose: t(
    'Кальцій + 0,025 × (40 − альбумін, г/л), ммоль/л',
    'Calcium + 0.025 × (40 − albumin, g/L), mmol/L',
  ),
  fields: [
    {
      kind: 'number',
      key: 'calcium',
      label: t('Загальний кальцій', 'Total calcium'),
      unit: t('ммоль/л', 'mmol/L'),
      min: 0,
      max: 6,
      step: 0.01,
    },
    {
      kind: 'number',
      key: 'albumin',
      label: t('Альбумін', 'Albumin'),
      unit: t('г/л', 'g/L'),
      min: 5,
      max: 70,
    },
  ],
  compute: (values) => {
    const calciumMmol = num(values, 'calcium')
    const albumin = num(values, 'albumin')
    if (!calciumMmol || !albumin) return null
    return {
      value: {
        amount: calciumMmol + 0.025 * (40 - albumin),
        decimals: 2,
        unit: t('ммоль/л', 'mmol/L'),
      },
      notes: [
        t(
          'Payne: кальцій (мг/100 мл) − альбумін (г/100 мл) + 4,0. У ммоль/л і г/л це 0,025 ммоль/л на кожен 1 г/л альбуміну нижче 40. У Великій Британії часто беруть коефіцієнт 0,02 — результат трохи нижчий.',
          'Payne: calcium (mg/100 mL) − albumin (g/100 mL) + 4.0. In mmol/L and g/L that is 0.025 mmol/L for each 1 g/L of albumin below 40. UK laboratories often use 0.02, which gives a little less.',
        ),
      ],
    }
  },
  sources: [
    {
      name: 'Payne RB et al. Interpretation of serum calcium in patients with abnormal serum proteins. Br Med J 1973;4:643–6',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1587636/',
      checked: t(
        'Резюме: формула в мг/100 мл і г/100 мл',
        'Abstract: the formula in mg/100 mL and g/100 mL',
      ),
    },
  ],
}

const anc: Score = {
  id: 'anc',
  section: 'general',
  title: t('Абсолютна кількість нейтрофілів', 'Absolute neutrophil count'),
  purpose: t(
    'Лейкоцити × (сегментоядерні + паличкоядерні, %) / 100',
    'WBC × (segmented + band, %) / 100',
  ),
  fields: [
    {
      kind: 'number',
      key: 'wbc',
      label: t('Лейкоцити', 'White cells'),
      unit: t('×10⁹/л', '×10⁹/L'),
      min: 0,
      step: 0.01,
    },
    {
      kind: 'number',
      key: 'segmented',
      label: t('Сегментоядерні', 'Segmented'),
      unit: t('%', '%'),
      min: 0,
      max: 100,
    },
    {
      kind: 'number',
      key: 'bands',
      label: t('Паличкоядерні', 'Bands'),
      unit: t('%', '%'),
      min: 0,
      max: 100,
      hint: t('Порожнє — 0', 'Empty counts as 0'),
    },
  ],
  compute: (values) => {
    const wbc = num(values, 'wbc')
    const segmented = num(values, 'segmented')
    if (wbc === undefined || segmented === undefined) return null
    const amount = (wbc * (segmented + (num(values, 'bands') ?? 0))) / 100
    return {
      value: { amount, decimals: 2, unit: t('×10⁹/л', '×10⁹/L') },
      notes: [],
    }
  },
  sources: [],
}

export const GENERAL_SCORES: Score[] = [bsa, bmi, crcl, ckdEpi, calvert, calcium, anc]
