import type { Field, Score, Text2, Values } from './types'

const t = (uk: string, en: string): Text2 => ({ uk, en })
const check = (key: string, uk: string, en: string): Field => ({
  kind: 'check',
  key,
  label: t(uk, en),
})
const on = (values: Values, key: string) => values[key] === true

/** One-point comorbidities of the HCT-CI, as Table 4 of the paper defines them. */
const ONE_POINT: [string, string, string][] = [
  [
    'arrhythmia',
    'Аритмія: фібриляція чи тріпотіння передсердь, СССВ, шлуночкові аритмії (1)',
    'Arrhythmia: atrial fibrillation or flutter, sick sinus syndrome, ventricular arrhythmias (1)',
  ],
  [
    'cardiac',
    'Серце: ІХС (стеноз, що потребує лікування, стенту чи шунтування), серцева недостатність, інфаркт або ФВ ≤ 50% (1)',
    'Cardiac: coronary artery disease (stenosis needing treatment, stent or bypass), heart failure, myocardial infarction or EF ≤ 50% (1)',
  ],
  ['ibd', 'Хвороба Крона чи виразковий коліт (1)', "Crohn's disease or ulcerative colitis (1)"],
  [
    'diabetes',
    'Цукровий діабет на інсуліні чи пероральних препаратах, не лише дієта (1)',
    'Diabetes on insulin or oral agents, not diet alone (1)',
  ],
  ['cerebrovascular', 'ТІА чи інсульт (1)', 'Transient ischaemic attack or stroke (1)'],
  [
    'psychiatric',
    'Депресія чи тривога, що потребують консультації психіатра чи лікування (1)',
    'Depression or anxiety needing psychiatric consultation or treatment (1)',
  ],
  ['obesity', 'ІМТ > 35 кг/м² (1)', 'BMI > 35 kg/m² (1)'],
  [
    'infection',
    'Інфекція, що потребує антимікробної терапії і після дня 0 (1)',
    'Infection needing antimicrobial treatment beyond day 0 (1)',
  ],
]

const TWO_POINT: [string, string, string][] = [
  [
    'rheumatologic',
    'СЧВ, РА, поліміозит, змішане захворювання сполучної тканини чи ревматична поліміалгія (2)',
    'SLE, RA, polymyositis, mixed connective tissue disease or polymyalgia rheumatica (2)',
  ],
  [
    'pepticUlcer',
    'Виразкова хвороба, що потребує лікування (2)',
    'Peptic ulcer needing treatment (2)',
  ],
  [
    'renal',
    'Нирки: креатинін > 2 мг/дл (> 177 мкмоль/л), діаліз чи пересаджена нирка (2)',
    'Kidneys: creatinine > 2 mg/dL (> 177 µmol/L), dialysis or a kidney transplant (2)',
  ],
]

const THREE_POINT: [string, string, string][] = [
  [
    'solidTumour',
    'Солідна пухлина, лікована будь-коли раніше, крім немеланомного раку шкіри (3)',
    'A solid tumour treated at any time before, except non-melanoma skin cancer (3)',
  ],
  [
    'valve',
    'Ураження клапанів серця, крім пролапсу мітрального клапана (3)',
    'Heart valve disease, except mitral valve prolapse (3)',
  ],
]

export const hctCi: Score = {
  id: 'hct-ci',
  section: 'risk',
  title: t(
    'HCT-CI (коморбідність перед алогенною ТГСК)',
    'HCT-CI (comorbidity before allogeneic HCT)',
  ),
  purpose: t(
    'Ризик смертності, не пов’язаної з рецидивом, після алогенної трансплантації',
    'Non-relapse mortality risk after allogeneic transplantation',
  ),
  fields: [
    {
      kind: 'select',
      key: 'pulmonary',
      label: t('Легені', 'Lungs'),
      options: [
        { value: '0', label: t('Без уражень (0)', 'None (0)') },
        {
          value: '2',
          label: t(
            'Помірне: DLCO і/або ОФВ1 66–80% або задишка при незначному навантаженні (2)',
            'Moderate: DLCO and/or FEV1 66–80% or dyspnoea on slight activity (2)',
          ),
        },
        {
          value: '3',
          label: t(
            'Тяжке: DLCO і/або ОФВ1 ≤ 65%, задишка в спокої чи потреба в кисні (3)',
            'Severe: DLCO and/or FEV1 ≤ 65%, dyspnoea at rest or on oxygen (3)',
          ),
        },
      ],
      initial: '0',
    },
    {
      kind: 'select',
      key: 'hepatic',
      label: t('Печінка', 'Liver'),
      options: [
        { value: '0', label: t('Без уражень (0)', 'None (0)') },
        {
          value: '1',
          label: t(
            'Легке: хронічний гепатит, білірубін > ВМН до 1,5 ВМН чи АСТ/АЛТ > ВМН до 2,5 ВМН (1)',
            'Mild: chronic hepatitis, bilirubin > ULN to 1.5 × ULN or AST/ALT > ULN to 2.5 × ULN (1)',
          ),
        },
        {
          value: '3',
          label: t(
            'Помірне чи тяжке: цироз, білірубін > 1,5 ВМН чи АСТ/АЛТ > 2,5 ВМН (3)',
            'Moderate or severe: cirrhosis, bilirubin > 1.5 × ULN or AST/ALT > 2.5 × ULN (3)',
          ),
        },
      ],
      initial: '0',
    },
    ...ONE_POINT.map(([key, uk, en]) => check(key, uk, en)),
    ...TWO_POINT.map(([key, uk, en]) => check(key, uk, en)),
    ...THREE_POINT.map(([key, uk, en]) => check(key, uk, en)),
  ],
  compute: (values) => {
    if (values.pulmonary === undefined || values.hepatic === undefined) return null
    const points =
      Number(values.pulmonary) +
      Number(values.hepatic) +
      ONE_POINT.filter(([key]) => on(values, key)).length +
      2 * TWO_POINT.filter(([key]) => on(values, key)).length +
      3 * THREE_POINT.filter(([key]) => on(values, key)).length
    const group =
      points === 0
        ? {
            label: t('Низький', 'Low'),
            tone: 'green' as const,
            meaning: t(
              '2-річна смертність без рецидиву 14%, виживаність 71%.',
              '2-year non-relapse mortality 14%, survival 71%.',
            ),
          }
        : points <= 2
          ? {
              label: t('Проміжний', 'Intermediate'),
              tone: 'orange' as const,
              meaning: t(
                '2-річна смертність без рецидиву 21%, виживаність 60%.',
                '2-year non-relapse mortality 21%, survival 60%.',
              ),
            }
          : {
              label: t('Високий', 'High'),
              tone: 'red' as const,
              meaning: t(
                '2-річна смертність без рецидиву 41%, виживаність 34%.',
                '2-year non-relapse mortality 41%, survival 34%.',
              ),
            }
    return {
      value: { amount: points, decimals: 0, label: t('Бали', 'Points') },
      group: { label: group.label, tone: group.tone },
      notes: [
        group.meaning,
        t(
          'Частоти — з групи перевірки (347 хворих, Сієтл, 1997–2003); вони можуть відрізнятися в сучасних умовах.',
          'Rates from the validation set (347 patients, Seattle, 1997–2003); they may differ today.',
        ),
      ],
    }
  },
  sources: [
    {
      name: 'Sorror ML et al. Hematopoietic cell transplantation (HCT)-specific comorbidity index: a new tool for risk assessment before allogeneic HCT. Blood 2005;106:2912–9',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1895304/',
      checked: t(
        'Повний текст: таблиця 4 (визначення й бали) і таблиця 6 (групи 0, 1–2, ≥ 3; смертність і виживаність за 2 роки)',
        'Full text: Table 4 (definitions and points) and Table 6 (groups 0, 1–2, ≥ 3; 2-year mortality and survival)',
      ),
    },
  ],
  caveat: t(
    'Оцінюють стан на момент трансплантації. Креатинін 2 мг/дл — це 177 мкмоль/л (× 88,4, як у статті).',
    'The state at the time of transplant is scored. Creatinine 2 mg/dL is 177 µmol/L (× 88.4, as in the paper).',
  ),
}
