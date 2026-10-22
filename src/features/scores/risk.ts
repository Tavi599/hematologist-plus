import { AGE, num } from './general'
import { mascc } from './mascc'
import { hctCi } from './transplant'
import type { Field, Outcome, Score, Text2, Tone, Values } from './types'

const t = (uk: string, en: string): Text2 => ({ uk, en })
const check = (key: string, uk: string, en: string, hint?: Text2): Field => ({
  kind: 'check',
  key,
  label: t(uk, en),
  ...(hint ? { hint } : {}),
})
const number = (key: string, uk: string, en: string, unit: Text2, step = 1): Field => ({
  kind: 'number',
  key,
  label: t(uk, en),
  unit,
  min: 0,
  step,
})
const on = (values: Values, key: string) => values[key] === true

const G9 = t('×10⁹/л', '×10⁹/L')
const ULN_TIMES = t('× ВМН', '× ULN')
const AGE_ANY: Field = { ...AGE, min: 0 }

/** The points of a score and the group they fall in, with what the group means. */
function grouped(
  points: number,
  groups: { upTo: number; label: Text2; tone: Tone; meaning?: Text2 }[],
  decimals = 0,
): Outcome {
  const group = groups.find((entry) => points <= entry.upTo) ?? groups[groups.length - 1]!
  return {
    value: { amount: points, decimals, label: t('Бали', 'Points') },
    group: { label: group.label, tone: group.tone },
    notes: group.meaning ? [group.meaning] : [],
  }
}

const LOW = (meaning?: Text2) => ({ label: t('Низький', 'Low'), tone: 'green' as Tone, meaning })

// ── Tumour lysis syndrome ────────────────────────────────────────────────────────────────────

const TLS_DISEASES = [
  ['solid', 'Солідна пухлина', 'Solid tumour'],
  [
    'solid-bulky',
    'Солідна пухлина велика й хіміочутлива (нейробластома, герміногенна, дрібноклітинний рак легені)',
    'Bulky chemosensitive solid tumour (neuroblastoma, germ cell, small cell lung)',
  ],
  ['myeloma', 'Мієлома', 'Myeloma'],
  ['cml', 'ХМЛ', 'CML'],
  ['cll-alkylating', 'ХЛЛ: лише алкілувальні препарати', 'CLL: alkylating agents only'],
  [
    'cll-targeted',
    'ХЛЛ: флударабін, ритуксимаб, таргетна чи біологічна терапія',
    'CLL: fludarabine, rituximab, targeted or biological therapy',
  ],
  [
    'indolent',
    'Ходжкін, ЛМЛ, фолікулярна, маргінальної зони, MALT, мантійноклітинна (не бластоїдна), шкірна Т-клітинна',
    'Hodgkin, SLL, follicular, marginal zone, MALT, mantle cell (non-blastoid), cutaneous T-cell',
  ],
  [
    'aggressive',
    'ДВКЛ, периферична Т-клітинна, трансформована, мантійноклітинна бластоїдна, Т-клітинна лімфома/лейкоз дорослих',
    'DLBCL, peripheral T-cell, transformed, blastoid mantle cell, adult T-cell lymphoma',
  ],
  ['alcl', 'Анапластична великоклітинна лімфома', 'Anaplastic large cell lymphoma'],
  ['aml', 'ГМЛ', 'AML'],
  ['all', 'ГЛЛ', 'ALL'],
  ['burkitt-leukaemia', 'Беркітт: лейкоз (B-ГЛЛ)', 'Burkitt leukaemia (B-ALL)'],
  ['burkitt-lymphoma', 'Лімфома Беркітта', 'Burkitt lymphoma'],
  ['lymphoblastic', 'Лімфобластна лімфома', 'Lymphoblastic lymphoma'],
] as const

type DiseaseRisk = 'LRD' | 'IRD' | 'HRD'

/** Cairo 2010, Figures 1–3: the risk the disease itself carries. */
export function tlsDiseaseRisk(values: Values): DiseaseRisk | null {
  const wbc = num(values, 'wbc')
  const ldh = num(values, 'ldhRatio')
  const advanced = on(values, 'advancedStage')
  const child = values.ageGroup === 'child'
  switch (values.disease) {
    case 'solid':
    case 'myeloma':
    case 'cml':
    case 'indolent':
      return 'LRD'
    case 'solid-bulky':
    case 'cll-targeted':
      return 'IRD'
    case 'cll-alkylating':
      if (wbc === undefined) return null
      return wbc >= 50 ? 'IRD' : 'LRD'
    case 'aml':
      if (wbc === undefined) return null
      if (wbc >= 100) return 'HRD'
      if (wbc >= 25) return 'IRD'
      if (ldh === undefined) return null
      return ldh >= 2 ? 'IRD' : 'LRD'
    case 'all':
      if (wbc === undefined || ldh === undefined) return null
      return wbc >= 100 || ldh >= 2 ? 'HRD' : 'IRD'
    case 'burkitt-leukaemia':
      return 'HRD'
    case 'burkitt-lymphoma':
    case 'lymphoblastic':
      if (advanced) return 'HRD'
      if (ldh === undefined) return null
      return ldh >= 2 ? 'HRD' : 'IRD'
    case 'alcl':
      if (values.ageGroup === undefined) return null
      return child && advanced ? 'IRD' : 'LRD'
    case 'aggressive':
      if (values.ageGroup === undefined || ldh === undefined) return null
      if (child) {
        if (!advanced) return 'LRD'
        return ldh >= 2 ? 'HRD' : 'IRD'
      }
      if (ldh <= 1) return 'LRD'
      return on(values, 'bulky') ? 'HRD' : 'IRD'
    default:
      return null
  }
}

const TLS_PROPHYLAXIS: Record<'low' | 'intermediate' | 'high', Text2> = {
  low: t(
    'Спостереження, звичайна гідратація; алопуринол — лише при метаболічних змінах, великій чи поширеній пухлині або високій проліферації.',
    'Monitoring and normal hydration; allopurinol only with metabolic changes, bulky or advanced disease or high proliferation.',
  ),
  intermediate: t(
    'Спостереження, посилена гідратація 3 л/м² на добу, алопуринол 100–300 мг внутрішньо кожні 8 год; олужнення не потрібне.',
    'Monitoring, increased hydration 3 L/m² a day, allopurinol 100–300 mg by mouth every 8 hours; no alkalinisation.',
  ),
  high: t(
    'Часте спостереження, гідратація 3 л/м² на добу (якщо немає ниркової недостатності й олігурії), расбуриказа 0,1–0,2 мг/кг одноразово, повторно лише за потреби. При дефіциті Г-6-ФД расбуриказа протипоказана — алопуринол.',
    'Frequent monitoring, hydration 3 L/m² a day (unless renal failure and oliguria), rasburicase 0.1–0.2 mg/kg once, repeated only if needed. Contraindicated in G6PD deficiency: allopurinol instead.',
  ),
}

const tls: Score = {
  id: 'tls-cairo',
  section: 'risk',
  title: t('Ризик синдрому лізису пухлини (Cairo 2010)', 'Tumour lysis syndrome risk (Cairo 2010)'),
  purpose: t(
    'Ризик за хворобою, лейкоцитами, ЛДГ, стадією й масою пухлини з поправкою на нирки та лабораторні зміни',
    'Risk by disease, white cells, LDH, stage and bulk, adjusted for the kidneys and laboratory changes',
  ),
  fields: [
    {
      kind: 'select',
      key: 'disease',
      label: t('Хвороба', 'Disease'),
      options: TLS_DISEASES.map(([value, uk, en]) => ({ value, label: t(uk, en) })),
    },
    {
      kind: 'select',
      key: 'ageGroup',
      label: t('Вік', 'Age'),
      options: [
        { value: 'adult', label: t('Дорослий', 'Adult') },
        { value: 'child', label: t('Дитина', 'Child') },
      ],
      initial: 'adult',
    },
    number('wbc', 'Лейкоцити', 'White cells', G9, 0.1),
    number('ldhRatio', 'ЛДГ', 'LDH', ULN_TIMES, 0.1),
    check('advancedStage', 'Стадія III–IV', 'Stage III–IV'),
    check(
      'bulky',
      'Велика пухлинна маса (bulky)',
      'Bulky disease',
      t('Порогу розміру Cairo не наводить', 'Cairo gives no size threshold'),
    ),
    check(
      'renal',
      'Ниркова дисфункція чи ураження нирок',
      'Renal dysfunction or renal involvement',
    ),
    check('uricAcid', 'Сечова кислота вище норми', 'Uric acid above normal'),
    check('potassium', 'Калій вище норми', 'Potassium above normal'),
    check('phosphate', 'Фосфат вище норми', 'Phosphate above normal'),
  ],
  compute: (values) => {
    const disease = tlsDiseaseRisk(values)
    if (disease === null) return null
    const renal = on(values, 'renal')
    const labs = ['uricAcid', 'potassium', 'phosphate'].filter((key) => on(values, key)).length
    const level =
      disease === 'HRD'
        ? 'high'
        : disease === 'IRD'
          ? renal || labs > 0
            ? 'high'
            : 'intermediate'
          : renal
            ? 'intermediate'
            : 'low'
    const label = {
      low: t('Низький', 'Low'),
      intermediate: t('Проміжний', 'Intermediate'),
      high: t('Високий', 'High'),
    }[level]
    const tone: Tone = { low: 'green', intermediate: 'orange', high: 'red' }[level] as Tone
    const raised = (disease === 'LRD' && level !== 'low') || (disease === 'IRD' && level === 'high')
    const notes: Text2[] = [
      t(
        `Ризик за хворобою: ${{ LRD: 'низький (<1%)', IRD: 'проміжний (1–5%)', HRD: 'високий (>5%)' }[disease]}.${raised ? ' Підвищено через нирки чи лабораторні зміни.' : ''}`,
        `Risk from the disease: ${{ LRD: 'low (<1%)', IRD: 'intermediate (1–5%)', HRD: 'high (>5%)' }[disease]}.${raised ? ' Raised for the kidneys or laboratory changes.' : ''}`,
      ),
      TLS_PROPHYLAXIS[level],
    ]
    if (labs >= 2) {
      notes.push(
        t(
          'Два й більше з трьох показників вище норми — це вже лабораторний СЛП: за Cairo хворий отримує расбуриказу, якщо немає протипоказань.',
          'Two or more of the three above normal is laboratory TLS already: per Cairo the patient gets rasburicase unless contraindicated.',
        ),
      )
    }
    return { group: { label, tone }, notes }
  },
  sources: [
    {
      name: 'Cairo MS, Coiffier B, Reiter A, Younes A. Recommendations for the evaluation of risk and prophylaxis of tumour lysis syndrome (TLS) in adults and children with malignant diseases: an expert TLS panel consensus. Br J Haematol 2010;149:578–86',
      url: 'https://onlinelibrary.wiley.com/doi/full/10.1111/j.1365-2141.2010.08143.x',
      checked: t(
        'Повний текст: рисунки 1–4, таблиця III і рекомендації з профілактики',
        'Full text: Figures 1–4, Table III and the prophylaxis recommendations',
      ),
    },
  ],
  caveat: t(
    'Розбіжності всередині статті: для дорослих з агресивною лімфомою рисунок 3B ділить за ЛДГ у межах норми / вище норми і масою пухлини (так рахує калькулятор), а таблиця III — за ЛДГ < 2 і ≥ 2 ВМН. Для проміжного ризику таблиця III підвищує до високого при будь-якому з показників (сечова кислота, калій, фосфат) вище норми — так рахує калькулятор; текст статті вимагає сечову кислоту разом із калієм чи фосфатом. Не застосовувати, якщо сечова кислота підвищена через подагру до діагнозу пухлини.',
    'Discrepancies within the paper: for adults with aggressive lymphoma Figure 3B splits by LDH within / above normal and bulk (as calculated here), Table III by LDH below / at least 2 × ULN. For intermediate risk Table III raises to high with any of uric acid, potassium or phosphate above normal, as calculated here; the text asks for uric acid with potassium or phosphate. Not for a uric acid raised by gout before the cancer.',
  ),
}

// ── Venous thromboembolism ───────────────────────────────────────────────────────────────────

const khorana: Score = {
  id: 'khorana',
  section: 'risk',
  title: t(
    'Ризик тромбозу при хіміотерапії (Khorana)',
    'Chemotherapy-associated thrombosis (Khorana)',
  ),
  purpose: t(
    'Амбулаторні хворі на рак перед новим курсом хіміотерапії',
    'Cancer outpatients starting a new chemotherapy',
  ),
  fields: [
    {
      kind: 'select',
      key: 'site',
      label: t('Локалізація пухлини', 'Site of cancer'),
      options: [
        {
          value: 'very-high',
          label: t('Шлунок, підшлункова залоза (2 бали)', 'Stomach, pancreas (2 points)'),
        },
        {
          value: 'high',
          label: t(
            'Легеня, лімфома, гінекологічна, сечовий міхур, яєчко (1 бал)',
            'Lung, lymphoma, gynaecological, bladder, testicular (1 point)',
          ),
        },
        { value: 'other', label: t('Інша (0 балів)', 'Other (0 points)') },
      ],
    },
    check('platelets', 'Тромбоцити ≥ 350 ×10⁹/л', 'Platelets ≥ 350 ×10⁹/L'),
    check('anaemia', 'Гемоглобін < 100 г/л або еритропоетин', 'Haemoglobin < 100 g/L or an ESA'),
    check('leukocytes', 'Лейкоцити > 11 ×10⁹/л', 'White cells > 11 ×10⁹/L'),
    check('obesity', 'ІМТ ≥ 35 кг/м²', 'BMI ≥ 35 kg/m²'),
  ],
  compute: (values) => {
    if (!values.site) return null
    const points =
      ({ 'very-high': 2, high: 1, other: 0 } as Record<string, number>)[values.site as string]! +
      ['platelets', 'anaemia', 'leukocytes', 'obesity'].filter((key) => on(values, key)).length
    return grouped(points, [
      {
        upTo: 0,
        ...LOW(
          t(
            'ВТЕ за 2,5 міс.: 0,8% (розробка) і 0,3% (перевірка).',
            'VTE over 2.5 months: 0.8% (derivation), 0.3% (validation).',
          ),
        ),
      },
      {
        upTo: 2,
        label: t('Проміжний', 'Intermediate'),
        tone: 'orange',
        meaning: t('ВТЕ за 2,5 міс.: 1,8% і 2%.', 'VTE over 2.5 months: 1.8% and 2%.'),
      },
      {
        upTo: 99,
        label: t('Високий', 'High'),
        tone: 'red',
        meaning: t('ВТЕ за 2,5 міс.: 7,1% і 6,7%.', 'VTE over 2.5 months: 7.1% and 6.7%.'),
      },
    ])
  },
  sources: [
    {
      name: 'Khorana AA et al. Development and validation of a predictive model for chemotherapy-associated thrombosis. Blood 2008;111:4902–7',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2384124/',
      checked: t(
        'Повний текст: остаточна таблиця балів і частота ВТЕ за групами',
        'Full text: the final points table and VTE rates by group',
      ),
    },
  ],
  caveat: t(
    'Мієломи в дослідженні майже не було — для імуномодуляторів профілактику обирають за протоколом схеми, а не за цією шкалою.',
    'Myeloma was hardly represented: with immunomodulatory drugs prophylaxis follows the regimen protocol, not this score.',
  ),
}

// ── Lymphoma ─────────────────────────────────────────────────────────────────────────────────

const SCHMITZ_2016 = {
  name: 'Schmitz N et al. CNS International Prognostic Index: a risk model for CNS relapse in patients with diffuse large B-cell lymphoma treated with R-CHOP. J Clin Oncol 2016;34:3150–6',
  url: 'https://ascopubs.org/doi/full/10.1200/JCO.2015.65.6520',
  checked: t(
    'Повний текст: шість чинників по 1 балу, групи 0–1, 2–3, 4–6 і 2-річна частота ураження ЦНС; там же визначення чинників IPI',
    'Full text: six factors of 1 point each, groups 0–1, 2–3, 4–6 and the 2-year CNS rates; also the IPI factor definitions',
  ),
}

const ipi: Score = {
  id: 'ipi',
  section: 'risk',
  title: t('IPI і R-IPI (агресивні лімфоми)', 'IPI and R-IPI (aggressive lymphoma)'),
  purpose: t('Міжнародний прогностичний індекс', 'International Prognostic Index'),
  fields: [
    check('age', 'Вік > 60 років', 'Age > 60 years'),
    check('ldh', 'ЛДГ вище норми', 'LDH above normal'),
    check('ecog', 'ECOG ≥ 2', 'ECOG ≥ 2'),
    check('stage', 'Стадія III–IV', 'Stage III–IV'),
    check('extranodal', 'Більше одного екстранодального вогнища', 'More than one extranodal site'),
  ],
  compute: (values) => {
    const points = ['age', 'ldh', 'ecog', 'stage', 'extranodal'].filter((key) =>
      on(values, key),
    ).length
    const outcome = grouped(points, [
      {
        upTo: 1,
        ...LOW(
          t(
            '5-річна виживаність 73% (епоха до ритуксимабу).',
            '5-year survival 73% (before rituximab).',
          ),
        ),
      },
      {
        upTo: 2,
        label: t('Низький проміжний', 'Low-intermediate'),
        tone: 'yellow',
        meaning: t('5-річна виживаність 51%.', '5-year survival 51%.'),
      },
      {
        upTo: 3,
        label: t('Високий проміжний', 'High-intermediate'),
        tone: 'orange',
        meaning: t('5-річна виживаність 43%.', '5-year survival 43%.'),
      },
      {
        upTo: 5,
        label: t('Високий', 'High'),
        tone: 'red',
        meaning: t('5-річна виживаність 26%.', '5-year survival 26%.'),
      },
    ])
    outcome.notes.push(
      t(
        `R-IPI: ${points === 0 ? 'дуже добрий (0)' : points <= 2 ? 'добрий (1–2)' : 'поганий (3–5)'}.`,
        `R-IPI: ${points === 0 ? 'very good (0)' : points <= 2 ? 'good (1–2)' : 'poor (3–5)'}.`,
      ),
    )
    return outcome
  },
  sources: [
    {
      name: "The International Non-Hodgkin's Lymphoma Prognostic Factors Project. A predictive model for aggressive non-Hodgkin's lymphoma. N Engl J Med 1993;329:987–94",
      url: 'https://pubmed.ncbi.nlm.nih.gov/8141877/',
      checked: t(
        'Резюме: п’ять чинників і 5-річна виживаність за групами',
        'Abstract: the five factors and 5-year survival by group',
      ),
    },
    SCHMITZ_2016,
    {
      name: 'Zhou Z et al. An enhanced International Prognostic Index (NCCN-IPI). Blood 2014;123:837–42',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5527396/',
      checked: t(
        'Повний текст: межі IPI (вік > 60, 4–5 чинників — високий ризик)',
        'Full text: the IPI cut-offs (age > 60, 4–5 factors high risk)',
      ),
    },
    {
      name: 'Validation of the International Prognostic Index and subsequent revisions for DLBCL (2020)',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7478920/',
      checked: t(
        'Повний текст: групи IPI (0–1, 2, 3, 4–5) і R-IPI (0, 1–2, 3–5)',
        'Full text: the IPI (0–1, 2, 3, 4–5) and R-IPI (0, 1–2, 3–5) groups',
      ),
    },
  ],
}

const aaIpi: Score = {
  id: 'aa-ipi',
  section: 'risk',
  title: t('IPI з поправкою на вік (до 60 років)', 'Age-adjusted IPI (60 or younger)'),
  purpose: t(
    'Для хворих ≤ 60 років: стадія, ЛДГ, ECOG',
    'For patients 60 or younger: stage, LDH, ECOG',
  ),
  fields: [
    check('ldh', 'ЛДГ вище норми', 'LDH above normal'),
    check('ecog', 'ECOG ≥ 2', 'ECOG ≥ 2'),
    check('stage', 'Стадія III–IV', 'Stage III–IV'),
  ],
  compute: (values) =>
    grouped(['ldh', 'ecog', 'stage'].filter((key) => on(values, key)).length, [
      {
        upTo: 0,
        ...LOW(
          t(
            '5-річна виживаність 83% (епоха до ритуксимабу).',
            '5-year survival 83% (before rituximab).',
          ),
        ),
      },
      {
        upTo: 1,
        label: t('Низький проміжний', 'Low-intermediate'),
        tone: 'yellow',
        meaning: t('5-річна виживаність 69%.', '5-year survival 69%.'),
      },
      {
        upTo: 2,
        label: t('Високий проміжний', 'High-intermediate'),
        tone: 'orange',
        meaning: t('5-річна виживаність 46%.', '5-year survival 46%.'),
      },
      {
        upTo: 3,
        label: t('Високий', 'High'),
        tone: 'red',
        meaning: t('5-річна виживаність 32%.', '5-year survival 32%.'),
      },
    ]),
  sources: [
    {
      name: "The International Non-Hodgkin's Lymphoma Prognostic Factors Project. A predictive model for aggressive non-Hodgkin's lymphoma. N Engl J Med 1993;329:987–94",
      url: 'https://pubmed.ncbi.nlm.nih.gov/8141877/',
      checked: t(
        'Резюме: три чинники (стадія, ЛДГ, загальний стан) і 5-річна виживаність 83, 69, 46, 32% у чотирьох групах',
        'Abstract: three factors (stage, LDH, performance status) and 5-year survival of 83, 69, 46, 32% in four groups',
      ),
    },
    SCHMITZ_2016,
  ],
  caveat: t(
    'Відповідність «0, 1, 2, 3 чинники → чотири групи» виведено з того, що трьом чинникам відповідають чотири групи; повного тексту NEJM 1993 у відкритому доступі немає.',
    'The mapping of 0, 1, 2, 3 factors to the four groups follows from three factors giving four groups; the NEJM 1993 full text is not openly available.',
  ),
}

const cnsIpi: Score = {
  id: 'cns-ipi',
  section: 'risk',
  title: t('CNS-IPI (ризик ураження ЦНС при ДВКЛ)', 'CNS-IPI (CNS relapse risk in DLBCL)'),
  purpose: t(
    'Фактори IPI + ураження нирок чи наднирників; ДВКЛ на R-CHOP',
    'IPI factors + kidney or adrenal involvement; DLBCL on R-CHOP',
  ),
  fields: [
    check('age', 'Вік > 60 років', 'Age > 60 years'),
    check('ldh', 'ЛДГ вище норми', 'LDH above normal'),
    check('ecog', 'ECOG ≥ 2', 'ECOG ≥ 2'),
    check('stage', 'Стадія III–IV', 'Stage III–IV'),
    check('extranodal', 'Більше одного екстранодального вогнища', 'More than one extranodal site'),
    check('kidney', 'Ураження нирок і/або наднирників', 'Kidney and/or adrenal involvement'),
  ],
  compute: (values) =>
    grouped(
      ['age', 'ldh', 'ecog', 'stage', 'extranodal', 'kidney'].filter((key) => on(values, key))
        .length,
      [
        {
          upTo: 1,
          ...LOW(
            t(
              'Ураження ЦНС за 2 роки: 0,6% (перевірка — 0,8%).',
              'CNS disease at 2 years: 0.6% (validation 0.8%).',
            ),
          ),
        },
        {
          upTo: 3,
          label: t('Проміжний', 'Intermediate'),
          tone: 'orange',
          meaning: t(
            'Ураження ЦНС за 2 роки: 3,4% (перевірка — 3,9%).',
            'CNS disease at 2 years: 3.4% (validation 3.9%).',
          ),
        },
        {
          upTo: 6,
          label: t('Високий', 'High'),
          tone: 'red',
          meaning: t(
            'Ураження ЦНС за 2 роки: 10,2% (перевірка — 12,0%). Автори радять обстеження ЦНС і профілактику.',
            'CNS disease at 2 years: 10.2% (validation 12.0%). The authors advise CNS investigations and prophylaxis.',
          ),
        },
      ],
    ),
  sources: [SCHMITZ_2016],
}

const nccnIpi: Score = {
  id: 'nccn-ipi',
  section: 'risk',
  title: t('NCCN-IPI (ДВКЛ)', 'NCCN-IPI (DLBCL)'),
  purpose: t(
    'Уточнений IPI для ДВКЛ в епоху ритуксимабу',
    'An enhanced IPI for DLBCL in the rituximab era',
  ),
  fields: [
    AGE_ANY,
    number('ldhRatio', 'ЛДГ', 'LDH', ULN_TIMES, 0.1),
    check('stage', 'Стадія III–IV', 'Stage III–IV'),
    check('ecog', 'ECOG ≥ 2', 'ECOG ≥ 2'),
    check(
      'organs',
      'Ураження кісткового мозку, ЦНС, печінки/ШКТ чи легень',
      'Bone marrow, CNS, liver/GI tract or lung involvement',
    ),
  ],
  compute: (values) => {
    const age = num(values, 'ageYears')
    const ldh = num(values, 'ldhRatio')
    if (age === undefined || ldh === undefined) return null
    const points =
      (age > 75 ? 3 : age > 60 ? 2 : age > 40 ? 1 : 0) +
      (ldh > 3 ? 2 : ldh > 1 ? 1 : 0) +
      ['stage', 'ecog', 'organs'].filter((key) => on(values, key)).length
    return grouped(points, [
      { upTo: 1, ...LOW(t('5-річна загальна виживаність 96%.', '5-year overall survival 96%.')) },
      { upTo: 3, label: t('Низький проміжний', 'Low-intermediate'), tone: 'yellow' },
      { upTo: 5, label: t('Високий проміжний', 'High-intermediate'), tone: 'orange' },
      {
        upTo: 8,
        label: t('Високий', 'High'),
        tone: 'red',
        meaning: t('5-річна загальна виживаність 33%.', '5-year overall survival 33%.'),
      },
    ])
  },
  sources: [
    {
      name: 'Zhou Z et al. An enhanced International Prognostic Index (NCCN-IPI) for patients with diffuse large B-cell lymphoma treated in the rituximab era. Blood 2014;123:837–42',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5527396/',
      checked: t(
        'Повний текст: таблиця 3 (бали) і групи 0–1, 2–3, 4–5, 6–8',
        'Full text: Table 3 (points) and groups 0–1, 2–3, 4–5, 6–8',
      ),
    },
  ],
}

const flipi: Score = {
  id: 'flipi',
  section: 'risk',
  title: t('FLIPI (фолікулярна лімфома)', 'FLIPI (follicular lymphoma)'),
  purpose: t(
    'Прогностичний індекс фолікулярної лімфоми',
    'Follicular Lymphoma International Prognostic Index',
  ),
  fields: [
    check('age', 'Вік > 60 років', 'Age > 60 years'),
    check('stage', 'Стадія III–IV', 'Stage III–IV'),
    check('haemoglobin', 'Гемоглобін < 120 г/л', 'Haemoglobin < 120 g/L'),
    check('nodal', 'Більше 4 лімфатичних зон', 'More than 4 nodal areas'),
    check('ldh', 'ЛДГ вище норми', 'LDH above normal'),
  ],
  compute: (values) =>
    grouped(
      ['age', 'stage', 'haemoglobin', 'nodal', 'ldh'].filter((key) => on(values, key)).length,
      [
        { upTo: 1, ...LOW() },
        {
          upTo: 2,
          label: t('Проміжний', 'Intermediate'),
          tone: 'orange',
          meaning: t('Відношення ризиків 2,3.', 'Hazard ratio 2.3.'),
        },
        {
          upTo: 5,
          label: t('Високий', 'Poor'),
          tone: 'red',
          meaning: t('Відношення ризиків 4,3.', 'Hazard ratio 4.3.'),
        },
      ],
    ),
  sources: [
    {
      name: 'Solal-Céligny P et al. Follicular lymphoma international prognostic index. Blood 2004;104:1258–65',
      url: 'https://pubmed.ncbi.nlm.nih.gov/15126323/',
      checked: t(
        'Резюме: п’ять чинників і три групи',
        'Abstract: the five factors and three groups',
      ),
    },
  ],
}

const mipi: Score = {
  id: 'mipi',
  section: 'risk',
  title: t('MIPI (мантійноклітинна лімфома)', 'MIPI (mantle cell lymphoma)'),
  purpose: t(
    'Прогностичний індекс поширеної мантійноклітинної лімфоми',
    'Prognostic index for advanced mantle cell lymphoma',
  ),
  fields: [
    AGE_ANY,
    check('ecog', 'ECOG ≥ 2', 'ECOG ≥ 2'),
    number('ldh', 'ЛДГ', 'LDH', t('Од/л', 'U/L')),
    number('uln', 'Верхня межа норми ЛДГ', 'LDH upper limit of normal', t('Од/л', 'U/L')),
    number('wbc', 'Лейкоцити', 'White cells', G9, 0.1),
  ],
  compute: (values) => {
    const age = num(values, 'ageYears')
    const ldh = num(values, 'ldh')
    const uln = num(values, 'uln')
    const wbc = num(values, 'wbc')
    if (!age || !ldh || !uln || !wbc) return null
    // The white count enters per 10⁶/L: 6.7 ×10⁹/L is 6 700.
    const score =
      0.03535 * age +
      (on(values, 'ecog') ? 0.6978 : 0) +
      1.367 * Math.log10(ldh / uln) +
      0.9393 * Math.log10(wbc * 1000)
    const outcome: Outcome = {
      value: { amount: score, decimals: 2, label: t('Індекс', 'Index') },
      group:
        score < 5.7
          ? { label: t('Низький', 'Low'), tone: 'green' }
          : score < 6.2
            ? { label: t('Проміжний', 'Intermediate'), tone: 'orange' }
            : { label: t('Високий', 'High'), tone: 'red' },
      notes: [
        score < 5.7
          ? t('Медіана загальної виживаності не досягнута.', 'Median overall survival not reached.')
          : score < 6.2
            ? t('Медіана загальної виживаності 51 міс.', 'Median overall survival 51 months.')
            : t('Медіана загальної виживаності 29 міс.', 'Median overall survival 29 months.'),
        t(
          '0,03535 × вік + 0,6978 (ECOG ≥ 2) + 1,367 × log10(ЛДГ/ВМН) + 0,9393 × log10(лейкоцити в 10⁶/л); межі 5,7 і 6,2.',
          '0.03535 × age + 0.6978 (ECOG ≥ 2) + 1.367 × log10(LDH/ULN) + 0.9393 × log10(white cells per 10⁶/L); cut-offs 5.7 and 6.2.',
        ),
      ],
    }
    return outcome
  },
  sources: [
    {
      name: 'Hoster E et al. A new prognostic index (MIPI) for patients with advanced-stage mantle cell lymphoma. Blood 2008;111:558–65',
      url: 'https://pubmed.ncbi.nlm.nih.gov/17962512/',
      checked: t(
        'Резюме: чотири чинники, три групи й медіани виживаності',
        'Abstract: the four factors, three groups and median survivals',
      ),
    },
    {
      name: 'Evolving therapeutic strategies in mantle cell lymphoma (2026), table of scoring systems',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13149306/',
      checked: t(
        'Формула й межі 5,70 / 6,20 (повного тексту Hoster 2008 у відкритому доступі немає)',
        'The formula and cut-offs 5.70 / 6.20 (Hoster 2008 has no open full text)',
      ),
    },
  ],
}

const ips: Score = {
  id: 'ips-hodgkin',
  section: 'risk',
  title: t('IPS (поширена лімфома Ходжкіна)', 'IPS (advanced Hodgkin lymphoma)'),
  purpose: t(
    'Міжнародна прогностична шкала Hasenclever',
    'Hasenclever International Prognostic Score',
  ),
  fields: [
    check('albumin', 'Альбумін < 40 г/л', 'Albumin < 40 g/L'),
    check('haemoglobin', 'Гемоглобін < 105 г/л', 'Haemoglobin < 105 g/L'),
    check('male', 'Чоловіча стать', 'Male sex'),
    check('age', 'Вік ≥ 45 років', 'Age ≥ 45 years'),
    check('stage', 'Стадія IV', 'Stage IV'),
    check('leukocytosis', 'Лейкоцити ≥ 15 ×10⁹/л', 'White cells ≥ 15 ×10⁹/L'),
    check(
      'lymphopenia',
      'Лімфоцити < 0,6 ×10⁹/л і/або < 8%',
      'Lymphocytes < 0.6 ×10⁹/L and/or < 8%',
    ),
  ],
  compute: (values) => {
    const points = [
      'albumin',
      'haemoglobin',
      'male',
      'age',
      'stage',
      'leukocytosis',
      'lymphopenia',
    ].filter((key) => on(values, key)).length
    const ffp = [84, 77, 67, 60, 51, 42][Math.min(points, 5)]!
    return {
      value: { amount: points, decimals: 0, label: t('Бали', 'Points') },
      group: {
        label: t(
          `Без прогресування за 5 років: ${ffp}%`,
          `Freedom from progression at 5 years: ${ffp}%`,
        ),
        tone: points <= 2 ? 'green' : points <= 3 ? 'yellow' : points === 4 ? 'orange' : 'red',
      },
      notes: [
        t(
          'Частоти для 0, 1, 2, 3, 4 і ≥ 5 балів: 84, 77, 67, 60, 51, 42%.',
          'Rates for 0, 1, 2, 3, 4 and ≥ 5 points: 84, 77, 67, 60, 51, 42%.',
        ),
      ],
    }
  },
  sources: [
    {
      name: "Hasenclever D, Diehl V. A prognostic score for advanced Hodgkin's disease. N Engl J Med 1998;339:1506–14",
      url: 'https://pubmed.ncbi.nlm.nih.gov/9819449/',
      checked: t(
        'Резюме: сім чинників і частота без прогресування за балами',
        'Abstract: the seven factors and freedom from progression by points',
      ),
    },
  ],
}

// ── Chronic lymphocytic leukaemia ───────────────────────────────────────────────────────────

const cllIpi: Score = {
  id: 'cll-ipi',
  section: 'risk',
  title: t('CLL-IPI (ХЛЛ)', 'CLL-IPI (CLL)'),
  purpose: t('Міжнародний прогностичний індекс ХЛЛ', 'International Prognostic Index for CLL'),
  fields: [
    check(
      'tp53',
      'del(17p) і/або мутація TP53 (4 бали)',
      'del(17p) and/or TP53 mutation (4 points)',
    ),
    check('ighv', 'IGHV без мутацій (2 бали)', 'Unmutated IGHV (2 points)'),
    check('b2m', 'β2-мікроглобулін > 3,5 мг/л (2 бали)', 'β2-microglobulin > 3.5 mg/L (2 points)'),
    check('stage', 'Binet B–C або Rai I–IV (1 бал)', 'Binet B–C or Rai I–IV (1 point)'),
    check('age', 'Вік > 65 років (1 бал)', 'Age > 65 years (1 point)'),
  ],
  compute: (values) => {
    const points =
      (on(values, 'tp53') ? 4 : 0) +
      (on(values, 'ighv') ? 2 : 0) +
      (on(values, 'b2m') ? 2 : 0) +
      (on(values, 'stage') ? 1 : 0) +
      (on(values, 'age') ? 1 : 0)
    return grouped(points, [
      {
        upTo: 1,
        ...LOW(t('5-річна загальна виживаність 93,2%.', '5-year overall survival 93.2%.')),
      },
      {
        upTo: 3,
        label: t('Проміжний', 'Intermediate'),
        tone: 'yellow',
        meaning: t('5-річна загальна виживаність 79,3%.', '5-year overall survival 79.3%.'),
      },
      {
        upTo: 6,
        label: t('Високий', 'High'),
        tone: 'orange',
        meaning: t('5-річна загальна виживаність 63,3%.', '5-year overall survival 63.3%.'),
      },
      {
        upTo: 10,
        label: t('Дуже високий', 'Very high'),
        tone: 'red',
        meaning: t('5-річна загальна виживаність 23,3%.', '5-year overall survival 23.3%.'),
      },
    ])
  },
  sources: [
    {
      name: 'International CLL-IPI working group. An international prognostic index for patients with chronic lymphocytic leukaemia (CLL-IPI). Lancet Oncol 2016;17:779–90',
      url: 'https://pubmed.ncbi.nlm.nih.gov/27185642/',
      checked: t(
        'Резюме: п’ять чинників і 5-річна виживаність за групами',
        'Abstract: the five factors and 5-year survival by group',
      ),
    },
    {
      name: 'The CLL-IPI has the higher value in predicting overall outcome (2018)',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5874971/',
      checked: t(
        'Бали (4, 2, 2, 1, 1) і групи 0–1, 2–3, 4–6, 7–10 (повного тексту оригіналу у відкритому доступі немає)',
        'Points (4, 2, 2, 1, 1) and groups 0–1, 2–3, 4–6, 7–10 (the original has no open full text)',
      ),
    },
  ],
  caveat: t(
    'Індекс створено на хворих, лікованих хіміоімунотерапією; при таргетній терапії його прогностична сила менша.',
    'Built on patients given chemoimmunotherapy; with targeted therapy it predicts less well.',
  ),
}

// ── Myeloma ─────────────────────────────────────────────────────────────────────────────────

const B2M = number('b2m', 'β2-мікроглобулін', 'β2-microglobulin', t('мг/л', 'mg/L'), 0.1)
const ALBUMIN = number('albumin', 'Альбумін', 'Albumin', t('г/л', 'g/L'))

/** ISS from β2-microglobulin (mg/L) and albumin (g/L). */
function iss(values: Values): 1 | 2 | 3 | null {
  const b2m = num(values, 'b2m')
  const albumin = num(values, 'albumin')
  if (b2m === undefined || albumin === undefined) return null
  if (b2m >= 5.5) return 3
  return b2m < 3.5 && albumin >= 35 ? 1 : 2
}

const ISS_NOTE = (stage: number) =>
  t(
    `ISS ${'I'.repeat(stage)}: I — β2М < 3,5 мг/л і альбумін ≥ 35 г/л; III — β2М ≥ 5,5 мг/л; II — решта.`,
    `ISS ${'I'.repeat(stage)}: I is β2M < 3.5 mg/L and albumin ≥ 35 g/L; III is β2M ≥ 5.5 mg/L; II the rest.`,
  )

const rIss: Score = {
  id: 'r-iss',
  section: 'risk',
  title: t('R-ISS (мієлома)', 'R-ISS (myeloma)'),
  purpose: t(
    'Переглянута міжнародна система стадіювання, вперше діагностована мієлома',
    'Revised International Staging System, newly diagnosed myeloma',
  ),
  fields: [
    B2M,
    ALBUMIN,
    check(
      'cytogenetics',
      'del(17p), t(4;14) чи t(14;16) (FISH)',
      'del(17p), t(4;14) or t(14;16) (FISH)',
    ),
    check('ldh', 'ЛДГ вище норми', 'LDH above normal'),
  ],
  compute: (values) => {
    const stage = iss(values)
    if (stage === null) return null
    const risk = on(values, 'cytogenetics')
    const ldh = on(values, 'ldh')
    const r = stage === 1 && !risk && !ldh ? 1 : stage === 3 && (risk || ldh) ? 3 : 2
    return {
      group: {
        label: t(`R-ISS ${'I'.repeat(r)}`, `R-ISS ${'I'.repeat(r)}`),
        tone: r === 1 ? 'green' : r === 2 ? 'orange' : 'red',
      },
      notes: [
        t(
          `5-річна загальна виживаність ${[82, 62, 40][r - 1]}%, без прогресування ${[55, 36, 24][r - 1]}%.`,
          `5-year overall survival ${[82, 62, 40][r - 1]}%, progression-free ${[55, 36, 24][r - 1]}%.`,
        ),
        ISS_NOTE(stage),
      ],
    }
  },
  sources: [
    {
      name: 'Palumbo A et al. Revised International Staging System for Multiple Myeloma: a report from International Myeloma Working Group. J Clin Oncol 2015;33:2863–9',
      url: 'https://pubmed.ncbi.nlm.nih.gov/26240224/',
      checked: t(
        'Резюме: визначення стадій і 5-річна виживаність',
        'Abstract: the stage definitions and 5-year survival',
      ),
    },
  ],
  caveat: t(
    'Резюме R-ISS пише для ISS III «β2М > 5,5 мг/л»; калькулятор бере ≥ 5,5 мг/л, як в оригінальній ISS (Greipp 2005).',
    'The R-ISS abstract writes ISS III as β2M > 5.5 mg/L; this takes ≥ 5.5 mg/L, as in the original ISS (Greipp 2005).',
  ),
}

const r2Iss: Score = {
  id: 'r2-iss',
  section: 'risk',
  title: t('R2-ISS (мієлома)', 'R2-ISS (myeloma)'),
  purpose: t(
    'Друга ревізія ISS: адитивні бали, вперше діагностована мієлома',
    'Second revision of the ISS: additive points, newly diagnosed myeloma',
  ),
  fields: [
    B2M,
    ALBUMIN,
    check('del17p', 'del(17p) (1 бал)', 'del(17p) (1 point)'),
    check('ldh', 'ЛДГ вище норми (1 бал)', 'LDH above normal (1 point)'),
    check('t414', 't(4;14) (1 бал)', 't(4;14) (1 point)'),
    check('gain1q', '1q+ (0,5 бала)', '1q+ (0.5 point)'),
  ],
  compute: (values) => {
    const stage = iss(values)
    if (stage === null) return null
    const points =
      (stage === 3 ? 1.5 : stage === 2 ? 1 : 0) +
      (on(values, 'del17p') ? 1 : 0) +
      (on(values, 'ldh') ? 1 : 0) +
      (on(values, 't414') ? 1 : 0) +
      (on(values, 'gain1q') ? 0.5 : 0)
    const outcome = grouped(
      points,
      [
        {
          upTo: 0,
          label: t('R2-ISS I (низький)', 'R2-ISS I (low)'),
          tone: 'green',
          meaning: t(
            'Медіана загальної виживаності не досягнута, без прогресування 68 міс.',
            'Median OS not reached, PFS 68 months.',
          ),
        },
        {
          upTo: 1,
          label: t('R2-ISS II (низький проміжний)', 'R2-ISS II (low-intermediate)'),
          tone: 'yellow',
          meaning: t(
            'Медіана загальної виживаності 109,2 міс., без прогресування 45,5 міс.',
            'Median OS 109.2 months, PFS 45.5 months.',
          ),
        },
        {
          upTo: 2.5,
          label: t('R2-ISS III (проміжний високий)', 'R2-ISS III (intermediate-high)'),
          tone: 'orange',
          meaning: t(
            'Медіана загальної виживаності 68,5 міс., без прогресування 30,2 міс.',
            'Median OS 68.5 months, PFS 30.2 months.',
          ),
        },
        {
          upTo: 5,
          label: t('R2-ISS IV (високий)', 'R2-ISS IV (high)'),
          tone: 'red',
          meaning: t(
            'Медіана загальної виживаності 37,9 міс., без прогресування 19,9 міс.',
            'Median OS 37.9 months, PFS 19.9 months.',
          ),
        },
      ],
      1,
    )
    outcome.notes.push(ISS_NOTE(stage))
    return outcome
  },
  sources: [
    {
      name: "D'Agostino M et al. Second Revision of the International Staging System (R2-ISS) for overall survival in multiple myeloma. J Clin Oncol 2022;40:3406–18",
      url: 'https://pubmed.ncbi.nlm.nih.gov/35605179/',
      checked: t(
        'Резюме: бали, межі груп і медіани виживаності',
        'Abstract: points, group limits and median survivals',
      ),
    },
  ],
}

// ── Chronic myeloid leukaemia ───────────────────────────────────────────────────────────────

const CML_FIELDS: Field[] = [
  AGE_ANY,
  number(
    'spleen',
    'Селезінка нижче реберної дуги',
    'Spleen below the costal margin',
    t('см', 'cm'),
    0.5,
  ),
  number('platelets', 'Тромбоцити', 'Platelets', G9),
  number('blasts', 'Бласти в крові', 'Blood blasts', t('%', '%'), 0.1),
]

function cmlInputs(values: Values) {
  const age = num(values, 'ageYears')
  const spleen = num(values, 'spleen')
  const platelets = num(values, 'platelets')
  const blasts = num(values, 'blasts')
  if (age === undefined || spleen === undefined || !platelets || blasts === undefined) return null
  return { age, spleen, platelets, blasts }
}

const ELN_2020 = {
  name: 'Hochhaus A et al. European LeukemiaNet 2020 recommendations for treating chronic myeloid leukemia. Leukemia 2020;34:966–84, Table 2',
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7214240/',
  checked: t(
    'Повний текст: таблиця 2 — формули Sokal і ELTS, межі груп, частки й виживаність',
    'Full text: Table 2, the Sokal and ELTS formulas, group limits, proportions and survival',
  ),
}

const sokal: Score = {
  id: 'sokal',
  section: 'risk',
  title: t('Sokal (ХМЛ)', 'Sokal (CML)'),
  purpose: t(
    'Ризик при діагнозі хронічної фази; дані до лікування',
    'Risk at diagnosis of chronic phase; pre-treatment values',
  ),
  fields: CML_FIELDS,
  compute: (values) => {
    const input = cmlInputs(values)
    if (!input) return null
    const score = Math.exp(
      0.0116 * (input.age - 43.4) +
        0.0345 * (input.spleen - 7.51) +
        0.188 * ((input.platelets / 700) ** 2 - 0.563) +
        0.0887 * (input.blasts - 2.1),
    )
    return {
      value: { amount: score, decimals: 2, label: t('Індекс', 'Index') },
      group:
        score < 0.8
          ? { label: t('Низький', 'Low'), tone: 'green' }
          : score <= 1.2
            ? { label: t('Проміжний', 'Intermediate'), tone: 'orange' }
            : { label: t('Високий', 'High'), tone: 'red' },
      notes: [
        t(
          'ELN 2020 радить замість Sokal шкалу ELTS.',
          'ELN 2020 recommends ELTS instead of Sokal.',
        ),
      ],
    }
  },
  sources: [
    {
      name: 'Sokal JE et al. Prognostic discrimination in "good-risk" chronic granulocytic leukemia. Blood 1984;63:789–99',
      url: 'https://pubmed.ncbi.nlm.nih.gov/6584184/',
      checked: t('Резюме: чотири змінні моделі', 'Abstract: the four variables of the model'),
    },
    ELN_2020,
  ],
}

const elts: Score = {
  id: 'elts',
  section: 'risk',
  title: t('ELTS (ХМЛ)', 'ELTS (CML)'),
  purpose: t(
    'Ризик смерті від ХМЛ на інгібіторах тирозинкінази; рекомендує ELN 2020',
    'Risk of dying of CML on TKIs; recommended by ELN 2020',
  ),
  fields: CML_FIELDS,
  compute: (values) => {
    const input = cmlInputs(values)
    if (!input) return null
    const score =
      0.0025 * (input.age / 10) ** 3 +
      0.0615 * input.spleen +
      0.1052 * input.blasts +
      0.4104 * (input.platelets / 1000) ** -0.5
    return {
      value: { amount: score, decimals: 4, label: t('Індекс', 'Index') },
      group:
        score <= 1.568
          ? { label: t('Низький', 'Low'), tone: 'green' }
          : score <= 2.2185
            ? { label: t('Проміжний', 'Intermediate'), tone: 'orange' }
            : { label: t('Високий', 'High'), tone: 'red' },
      notes: [
        score <= 1.568
          ? t(
              '10-річна загальна виживаність 88%, смерть від ХМЛ за 6 років 2%.',
              '10-year OS 88%, death from CML at 6 years 2%.',
            )
          : score <= 2.2185
            ? t(
                '10-річна загальна виживаність 79%, смерть від ХМЛ за 6 років 5%.',
                '10-year OS 79%, death from CML at 6 years 5%.',
              )
            : t(
                '10-річна загальна виживаність 68%, смерть від ХМЛ за 6 років 12%.',
                '10-year OS 68%, death from CML at 6 years 12%.',
              ),
      ],
    }
  },
  sources: [
    {
      name: 'Pfirrmann M et al. Prognosis of long-term survival considering disease-specific death in patients with chronic myeloid leukemia. Leukemia 2016;30:48–56',
      url: 'https://pubmed.ncbi.nlm.nih.gov/26416462/',
      checked: t('Резюме: змінні шкали', 'Abstract: the variables of the score'),
    },
    ELN_2020,
  ],
}

const NCCN_CML = {
  name: 'NCCN Guidelines: Chronic Myeloid Leukemia, версія 2.2027 від 10.07.2026, CML-A',
  url: 'https://www.nccn.org/guidelines/category_1',
  checked: t(
    'Формули та межі груп у таблиці CML-A (нумерація посилань у таблиці зсунута відносно назв шкал)',
    'Formulas and group limits in table CML-A (the reference numbers in the table are shifted against the score names)',
  ),
}

const hasford: Score = {
  id: 'hasford',
  section: 'risk',
  title: t('Hasford / Euro (ХМЛ)', 'Hasford / Euro (CML)'),
  purpose: t(
    'Ризик при діагнозі хронічної фази; дані до лікування',
    'Risk at diagnosis of chronic phase; pre-treatment values',
  ),
  fields: [
    AGE_ANY,
    number(
      'spleen',
      'Селезінка нижче реберної дуги',
      'Spleen below the costal margin',
      t('см', 'cm'),
      0.5,
    ),
    number('platelets', 'Тромбоцити', 'Platelets', G9),
    number('blasts', 'Бласти в крові', 'Blood blasts', t('%', '%'), 0.1),
    number('eosinophils', 'Еозинофіли в крові', 'Blood eosinophils', t('%', '%'), 0.1),
    number('basophils', 'Базофіли в крові', 'Blood basophils', t('%', '%'), 0.1),
  ],
  compute: (values) => {
    const age = num(values, 'ageYears')
    const spleen = num(values, 'spleen')
    const platelets = num(values, 'platelets')
    const blasts = num(values, 'blasts')
    const eos = num(values, 'eosinophils')
    const baso = num(values, 'basophils')
    if (
      age === undefined ||
      spleen === undefined ||
      platelets === undefined ||
      blasts === undefined ||
      eos === undefined ||
      baso === undefined
    )
      return null
    const score =
      (0.6666 * (age >= 50 ? 1 : 0) +
        0.042 * spleen +
        0.0584 * blasts +
        0.0413 * eos +
        0.2039 * (baso >= 3 ? 1 : 0) +
        1.0956 * (platelets >= 1500 ? 1 : 0)) *
      1000
    return {
      value: { amount: score, decimals: 0, label: t('Індекс', 'Index') },
      group:
        score <= 780
          ? { label: t('Низький', 'Low'), tone: 'green' }
          : score <= 1480
            ? { label: t('Проміжний', 'Intermediate'), tone: 'orange' }
            : { label: t('Високий', 'High'), tone: 'red' },
      notes: [
        t(
          'За NCCN бажана шкала ELTS; Hasford (Euro) — альтернатива.',
          'NCCN prefers ELTS; Hasford (Euro) is an alternative.',
        ),
      ],
    }
  },
  sources: [NCCN_CML],
}

const eutos: Score = {
  id: 'eutos',
  section: 'risk',
  title: t('EUTOS (ХМЛ)', 'EUTOS (CML)'),
  purpose: t(
    'Дві змінні: базофіли й селезінка; ризик недосягнення CCyR за 18 місяців на іматинібі',
    'Two variables, basophils and spleen; risk of missing CCyR at 18 months on imatinib',
  ),
  fields: [
    number('basophils', 'Базофіли в крові', 'Blood basophils', t('%', '%'), 0.1),
    number(
      'spleen',
      'Селезінка нижче реберної дуги',
      'Spleen below the costal margin',
      t('см', 'cm'),
      0.5,
    ),
  ],
  compute: (values) => {
    const baso = num(values, 'basophils')
    const spleen = num(values, 'spleen')
    if (baso === undefined || spleen === undefined) return null
    const score = 0.07 * baso + 0.0402 * spleen
    return {
      value: { amount: score, decimals: 4, label: t('Індекс', 'Index') },
      group:
        score <= 0.8754
          ? { label: t('Низький', 'Low'), tone: 'green' }
          : { label: t('Високий', 'High'), tone: 'red' },
      notes: [
        t(
          'Формула в NCCN — 0,07 × базофіли + 0,0402 × селезінка, межа 0,8754 (первісна публікація: 7 × базофіли + 4 × селезінка, межа 87).',
          'NCCN formula: 0.07 x basophils + 0.0402 x spleen, cutoff 0.8754 (the original publication: 7 x basophils + 4 x spleen, cutoff 87).',
        ),
      ],
    }
  },
  sources: [NCCN_CML],
}

// ── Myelodysplastic and myeloproliferative ──────────────────────────────────────────────────

const MDS_LOWER = t(
  'За NCCN це нижчий ризик: лікують цитопенії, передусім анемію й трансфузійну залежність (MDS-4…MDS-6).',
  'NCCN calls this lower risk: the cytopenias are treated, above all anaemia and transfusion dependence (MDS-4 to MDS-6).',
)
const MDS_HIGHER = t(
  'За NCCN це вищий ризик: гіпометилювальні засоби, обговорення алогенної трансплантації (MDS-7).',
  'NCCN calls this higher risk: hypomethylating agents and a discussion of allogeneic transplantation (MDS-7).',
)

const MDS_KARYOTYPE_GOOD = t(
  'Добрий: норма, −Y, del(5q) або del(20q) окремо',
  'Good: normal, −Y alone, del(5q) alone or del(20q) alone',
)
const MDS_KARYOTYPE_POOR = t(
  'Поганий: комплексний (3 і більше аномалій) або аномалії хромосоми 7',
  'Poor: complex (3 or more abnormalities) or chromosome 7 anomalies',
)

const ipss: Score = {
  id: 'ipss',
  section: 'risk',
  title: t('IPSS (МДС)', 'IPSS (MDS)'),
  purpose: t(
    'Первинна міжнародна прогностична шкала мієлодиспластичних синдромів',
    'Original International Prognostic Scoring System for MDS',
  ),
  fields: [
    number('blasts', 'Бласти в кістковому мозку', 'Marrow blasts', t('%', '%'), 0.5),
    {
      kind: 'select',
      key: 'karyotype',
      label: t('Каріотип', 'Karyotype'),
      options: [
        { value: '0', label: MDS_KARYOTYPE_GOOD },
        { value: '0.5', label: t('Проміжний: інші аномалії', 'Intermediate: other abnormalities') },
        { value: '1', label: MDS_KARYOTYPE_POOR },
      ],
    },
    {
      kind: 'select',
      key: 'cytopenias',
      label: t('Цитопенії', 'Cytopenias'),
      hint: t(
        'Нейтрофіли <1,8·10⁹/л, тромбоцити <100·10⁹/л, гемоглобін <100 г/л',
        'Neutrophils <1.8×10⁹/L, platelets <100×10⁹/L, haemoglobin <100 g/L',
      ),
      options: [
        { value: '0', label: t('0 або 1 цитопенія', '0 or 1 cytopenia') },
        { value: '0.5', label: t('2 або 3 цитопенії', '2 or 3 cytopenias') },
      ],
    },
  ],
  compute: (values) => {
    const blasts = num(values, 'blasts')
    if (blasts === undefined || values.karyotype === undefined || values.cytopenias === undefined)
      return null
    const points =
      (blasts < 5 ? 0 : blasts <= 10 ? 0.5 : blasts <= 20 ? 1.5 : 2) +
      Number(values.karyotype) +
      Number(values.cytopenias)
    return grouped(
      points,
      [
        { upTo: 0, label: t('Низький', 'Low'), tone: 'green', meaning: MDS_LOWER },
        { upTo: 1, label: t('Проміжний-1', 'Intermediate-1'), tone: 'yellow', meaning: MDS_LOWER },
        { upTo: 2, label: t('Проміжний-2', 'Intermediate-2'), tone: 'orange', meaning: MDS_HIGHER },
        { upTo: 99, label: t('Високий', 'High'), tone: 'red', meaning: MDS_HIGHER },
      ],
      1,
    )
  },
  sources: [
    {
      name: 'NCCN Guidelines: Myelodysplastic Syndromes, версія 3.2026, MDS-B (1 of 4)',
      url: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1446',
      checked: t(
        'Таблиця балів і категорій ризику (за Greenberg PL et al. Blood 1997;89:2079–88)',
        'The table of points and risk categories (after Greenberg PL et al. Blood 1997;89:2079-88)',
      ),
    },
  ],
  caveat: t(
    'Бласти 20–29% за FAB — МДС, за ВООЗ — уже ГМЛ. Шкала дає початковий прогноз; для оцінки в динаміці є WPSS.',
    'Blasts of 20-29% are MDS by FAB but AML by WHO. The score gives the starting prognosis; WPSS allows an estimate over time.',
  ),
}

const wpss: Score = {
  id: 'wpss',
  section: 'risk',
  title: t('WPSS (МДС)', 'WPSS (MDS)'),
  purpose: t(
    'Прогностична шкала МДС на основі класифікації ВООЗ; допускає оцінку в динаміці',
    'WHO classification-based prognostic scoring system for MDS; allows an estimate over time',
  ),
  fields: [
    {
      kind: 'select',
      key: 'who',
      label: t('Категорія ВООЗ (2016)', 'WHO category (2016)'),
      options: [
        {
          value: '0',
          label: t(
            'RCUD, RARS або МДС з ізольованою del(5q)',
            'RCUD, RARS or MDS with isolated del(5q)',
          ),
        },
        { value: '1', label: t('RCMD', 'RCMD') },
        { value: '2', label: t('RAEB-1', 'RAEB-1') },
        { value: '3', label: t('RAEB-2', 'RAEB-2') },
      ],
    },
    {
      kind: 'select',
      key: 'karyotype',
      label: t('Каріотип', 'Karyotype'),
      options: [
        { value: '0', label: MDS_KARYOTYPE_GOOD },
        { value: '1', label: t('Проміжний: інші аномалії', 'Intermediate: other abnormalities') },
        { value: '2', label: MDS_KARYOTYPE_POOR },
      ],
    },
    {
      kind: 'check',
      key: 'anaemia',
      label: t('Тяжка анемія', 'Severe anaemia'),
      hint: t(
        'Гемоглобін <90 г/л у чоловіків або <80 г/л у жінок',
        'Haemoglobin <90 g/L in men or <80 g/L in women',
      ),
    },
  ],
  compute: (values) => {
    if (values.who === undefined || values.karyotype === undefined) return null
    const points = Number(values.who) + Number(values.karyotype) + (values.anaemia === true ? 1 : 0)
    return grouped(points, [
      { upTo: 0, label: t('Дуже низький', 'Very low'), tone: 'green', meaning: MDS_LOWER },
      { upTo: 1, label: t('Низький', 'Low'), tone: 'green', meaning: MDS_LOWER },
      { upTo: 2, label: t('Проміжний', 'Intermediate'), tone: 'yellow', meaning: MDS_LOWER },
      { upTo: 4, label: t('Високий', 'High'), tone: 'orange', meaning: MDS_HIGHER },
      { upTo: 99, label: t('Дуже високий', 'Very high'), tone: 'red', meaning: MDS_HIGHER },
    ])
  },
  sources: [
    {
      name: 'NCCN Guidelines: Myelodysplastic Syndromes, версія 3.2026, MDS-B (2 of 4)',
      url: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1446',
      checked: t(
        'Таблиця балів і категорій (за Malcovati L et al. Haematologica 2011;96:1433–40; Della Porta MG et al. Leukemia 2015;29:1502–13)',
        'The table of points and categories (after Malcovati L et al. Haematologica 2011;96:1433-40; Della Porta MG et al. Leukemia 2015;29:1502-13)',
      ),
    },
  ],
  caveat: t(
    'Категорії ВООЗ 2016 (RCUD, RCMD, RAEB) замінені в класифікації 2022 року; шкала валідована саме на них.',
    'The WHO 2016 categories (RCUD, RCMD, RAEB) are superseded by the 2022 classification; the score was validated on them.',
  ),
}

const ipssR: Score = {
  id: 'ipss-r',
  section: 'risk',
  title: t('IPSS-R (МДС)', 'IPSS-R (MDS)'),
  purpose: t(
    'Переглянута прогностична шкала мієлодиспластичних синдромів',
    'Revised International Prognostic Scoring System for MDS',
  ),
  fields: [
    {
      kind: 'select',
      key: 'cytogenetics',
      label: t('Цитогенетика', 'Cytogenetics'),
      options: [
        { value: '0', label: t('Дуже добра: −Y, del(11q)', 'Very good: −Y, del(11q)') },
        {
          value: '1',
          label: t(
            'Добра: норма, del(5q), del(12p), del(20q), подвійна з del(5q)',
            'Good: normal, del(5q), del(12p), del(20q), double including del(5q)',
          ),
        },
        {
          value: '2',
          label: t(
            'Проміжна: del(7q), +8, +19, i(17q), інші поодинокі чи подвійні клони',
            'Intermediate: del(7q), +8, +19, i(17q), any other single or double clones',
          ),
        },
        {
          value: '3',
          label: t(
            'Погана: −7, inv(3)/t(3q)/del(3q), подвійна з −7/del(7q), комплексна з 3 аномалій',
            'Poor: −7, inv(3)/t(3q)/del(3q), double including −7/del(7q), complex with 3 abnormalities',
          ),
        },
        {
          value: '4',
          label: t(
            'Дуже погана: комплексна, більше 3 аномалій',
            'Very poor: complex, more than 3 abnormalities',
          ),
        },
      ],
    },
    number('blasts', 'Бласти в кістковому мозку', 'Marrow blasts', t('%', '%'), 0.5),
    number('haemoglobin', 'Гемоглобін', 'Haemoglobin', t('г/л', 'g/L')),
    number('platelets', 'Тромбоцити', 'Platelets', G9),
    number('anc', 'Нейтрофіли (АКН)', 'Neutrophils (ANC)', G9, 0.1),
  ],
  compute: (values) => {
    const blasts = num(values, 'blasts')
    const haemoglobin = num(values, 'haemoglobin')
    const platelets = num(values, 'platelets')
    const anc = num(values, 'anc')
    if (
      values.cytogenetics === undefined ||
      blasts === undefined ||
      !haemoglobin ||
      platelets === undefined ||
      anc === undefined
    )
      return null
    const points =
      Number(values.cytogenetics) +
      (blasts <= 2 ? 0 : blasts < 5 ? 1 : blasts <= 10 ? 2 : 3) +
      (haemoglobin >= 100 ? 0 : haemoglobin >= 80 ? 1 : 1.5) +
      (platelets >= 100 ? 0 : platelets >= 50 ? 0.5 : 1) +
      (anc >= 0.8 ? 0 : 0.5)
    const outcome = grouped(
      points,
      [
        { upTo: 1.5, label: t('Дуже низький', 'Very low'), tone: 'green', meaning: MDS_LOWER },
        { upTo: 3, label: t('Низький', 'Low'), tone: 'green', meaning: MDS_LOWER },
        { upTo: 4.5, label: t('Проміжний', 'Intermediate'), tone: 'yellow' },
        { upTo: 6, label: t('Високий', 'High'), tone: 'orange', meaning: MDS_HIGHER },
        { upTo: 99, label: t('Дуже високий', 'Very high'), tone: 'red', meaning: MDS_HIGHER },
      ],
      1,
    )
    if (points > 3 && points <= 4.5)
      outcome.notes.push(
        points <= 3.5
          ? t(
              'Проміжний ризик із балами ≤3,5 NCCN радить вести як нижчий ризик (MDS-4…MDS-6).',
              'NCCN manages intermediate risk with a score of 3.5 or less as lower risk (MDS-4 to MDS-6).',
            )
          : t(
              'Проміжний ризик із балами >3,5 NCCN радить вести як вищий ризик (MDS-7).',
              'NCCN manages intermediate risk with a score above 3.5 as higher risk (MDS-7).',
            ),
      )
    return outcome
  },
  sources: [
    {
      name: 'Greenberg PL et al. Revised international prognostic scoring system for myelodysplastic syndromes. Blood 2012;120:2454–65',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4425443/',
      checked: t(
        'Повний текст: таблиці цитогенетичних груп, балів і категорій ризику',
        'Full text: the tables of cytogenetic groups, points and risk categories',
      ),
    },
  ],
}

const dipss: Score = {
  id: 'dipss',
  section: 'risk',
  title: t('DIPSS (первинний мієлофіброз)', 'DIPSS (primary myelofibrosis)'),
  purpose: t(
    'Динамічна шкала: застосовна в будь-який момент перебігу',
    'Dynamic score: usable at any point of the course',
  ),
  fields: [
    check('age', 'Вік > 65 років (1 бал)', 'Age > 65 years (1 point)'),
    check('haemoglobin', 'Гемоглобін < 100 г/л (2 бали)', 'Haemoglobin < 100 g/L (2 points)'),
    check('leukocytes', 'Лейкоцити > 25 ×10⁹/л (1 бал)', 'White cells > 25 ×10⁹/L (1 point)'),
    check('blasts', 'Бласти в крові ≥ 1% (1 бал)', 'Blood blasts ≥ 1% (1 point)'),
    check('symptoms', 'Конституційні симптоми (1 бал)', 'Constitutional symptoms (1 point)'),
  ],
  compute: (values) =>
    grouped(
      (on(values, 'haemoglobin') ? 2 : 0) +
        ['age', 'leukocytes', 'blasts', 'symptoms'].filter((key) => on(values, key)).length,
      [
        { upTo: 0, ...LOW(t('Медіана виживаності не досягнута.', 'Median survival not reached.')) },
        {
          upTo: 2,
          label: t('Проміжний-1', 'Intermediate-1'),
          tone: 'yellow',
          meaning: t('Медіана виживаності 14,2 року.', 'Median survival 14.2 years.'),
        },
        {
          upTo: 4,
          label: t('Проміжний-2', 'Intermediate-2'),
          tone: 'orange',
          meaning: t('Медіана виживаності 4 роки.', 'Median survival 4 years.'),
        },
        {
          upTo: 6,
          label: t('Високий', 'High'),
          tone: 'red',
          meaning: t('Медіана виживаності 1,5 року.', 'Median survival 1.5 years.'),
        },
      ],
    ),
  sources: [
    {
      name: 'Passamonti F et al. A dynamic prognostic model to predict survival in primary myelofibrosis (DIPSS). Blood 2010;115:1703–8',
      url: 'https://pubmed.ncbi.nlm.nih.gov/20008785/',
      checked: t(
        'Резюме: п’ять чинників і чотири групи',
        'Abstract: the five factors and four groups',
      ),
    },
    {
      name: 'Prognostic Scores and Risk Stratification of Myeloproliferative Neoplasms: 2026 Updates, Table 10',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13255837/',
      checked: t(
        'Бали (гемоглобін — 2) і межі груп з медіанами (повного тексту оригіналу у відкритому доступі немає)',
        'Points (haemoglobin 2) and group limits with medians (the original has no open full text)',
      ),
    },
  ],
}

const mipss70: Score = {
  id: 'mipss70',
  section: 'risk',
  title: t(
    'MIPSS70 (первинний мієлофіброз, до 70 років)',
    'MIPSS70 (primary myelofibrosis, 70 or younger)',
  ),
  purpose: t(
    'Клінічні й молекулярні чинники; для хворих віку трансплантації',
    'Clinical and molecular factors; for transplant-age patients',
  ),
  fields: [
    {
      kind: 'select',
      key: 'hmr',
      label: t(
        'Мутації високого молекулярного ризику (ASXL1, EZH2, SRSF2, IDH1/2)',
        'High molecular risk mutations (ASXL1, EZH2, SRSF2, IDH1/2)',
      ),
      options: [
        { value: '0', label: t('Немає', 'None') },
        { value: '1', label: t('Одна (1 бал)', 'One (1 point)') },
        { value: '3', label: t('Дві й більше (1 + 2 = 3 бали)', 'Two or more (1 + 2 = 3 points)') },
      ],
    },
    check('haemoglobin', 'Гемоглобін < 100 г/л (1 бал)', 'Haemoglobin < 100 g/L (1 point)'),
    check('leukocytes', 'Лейкоцити > 25 ×10⁹/л (2 бали)', 'White cells > 25 ×10⁹/L (2 points)'),
    check('platelets', 'Тромбоцити < 100 ×10⁹/л (2 бали)', 'Platelets < 100 ×10⁹/L (2 points)'),
    check('blasts', 'Бласти в крові ≥ 2% (1 бал)', 'Blood blasts ≥ 2% (1 point)'),
    check(
      'fibrosis',
      'Фіброз кісткового мозку ≥ 2 ступеня (1 бал)',
      'Marrow fibrosis grade ≥ 2 (1 point)',
    ),
    check('symptoms', 'Конституційні симптоми (1 бал)', 'Constitutional symptoms (1 point)'),
    check(
      'noCalr1',
      'Немає мутації CALR типу 1 чи подібної (1 бал)',
      'No CALR type 1 or type 1-like mutation (1 point)',
    ),
  ],
  compute: (values) => {
    if (values.hmr === undefined) return null
    const points =
      Number(values.hmr) +
      (on(values, 'leukocytes') ? 2 : 0) +
      (on(values, 'platelets') ? 2 : 0) +
      ['haemoglobin', 'blasts', 'fibrosis', 'symptoms', 'noCalr1'].filter((key) => on(values, key))
        .length
    return grouped(points, [
      {
        upTo: 1,
        ...LOW(
          t(
            '5-річна загальна виживаність 95%, медіана 27,7 року.',
            '5-year OS 95%, median 27.7 years.',
          ),
        ),
      },
      {
        upTo: 4,
        label: t('Проміжний', 'Intermediate'),
        tone: 'orange',
        meaning: t(
          '5-річна загальна виживаність 70%, медіана 7,1 року.',
          '5-year OS 70%, median 7.1 years.',
        ),
      },
      {
        upTo: 12,
        label: t('Високий', 'High'),
        tone: 'red',
        meaning: t(
          '5-річна загальна виживаність 29%, медіана 2,3 року.',
          '5-year OS 29%, median 2.3 years.',
        ),
      },
    ])
  },
  sources: [
    {
      name: 'Guglielmelli P et al. MIPSS70: Mutation-Enhanced International Prognostic Score System for transplantation-age patients with primary myelofibrosis. J Clin Oncol 2018;36:310–8',
      url: 'https://ascopubs.org/doi/full/10.1200/JCO.2017.76.4886',
      checked: t(
        'Повний текст: бали (1 і 2), загальний максимум 12, групи 0–1, 2–4, ≥ 5 і виживаність',
        'Full text: the points (1 and 2), a maximum of 12, groups 0–1, 2–4, ≥ 5 and survival',
      ),
    },
  ],
  caveat: t(
    'Одна мутація високого ризику дає 1 бал, дві й більше — ще 2 (разом 3): так сходиться максимум 12 балів зі статті. MIPSS70-plus (з каріотипом) тут не рахується.',
    'One high-risk mutation scores 1, two or more add 2 more (3 in all): that is how the paper reaches its maximum of 12. MIPSS70-plus (with the karyotype) is not calculated here.',
  ),
}

export const RISK_SCORES: Score[] = [
  tls,
  khorana,
  ipi,
  aaIpi,
  nccnIpi,
  cnsIpi,
  flipi,
  mipi,
  ips,
  cllIpi,
  rIss,
  r2Iss,
  sokal,
  elts,
  hasford,
  eutos,
  ipss,
  ipssR,
  wpss,
  dipss,
  mipss70,
  hctCi,
  mascc,
]
