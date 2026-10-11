import type { Score, Text2, Values } from './types'

const t = (uk: string, en: string): Text2 => ({ uk, en })
const on = (values: Values, key: string) => values[key] === true

/** MASCC risk index for febrile neutropenia, with the weights of AGIHO 2024, table 4. */
export const mascc: Score = {
  id: 'mascc',
  section: 'risk',
  title: t('MASCC (ризик ускладнень фебрильної нейтропенії)', 'MASCC (febrile neutropenia risk)'),
  purpose: t(
    'Чи можна лікувати фебрильну нейтропенію амбулаторно: ≥ 21 бал — стандартний ризик',
    'Whether febrile neutropenia may be treated as an outpatient: ≥ 21 points is standard risk',
  ),
  fields: [
    {
      kind: 'select',
      key: 'burden',
      label: t('Тяжкість стану через фебрильну нейтропенію', 'Burden of febrile neutropenia'),
      options: [
        { value: '5', label: t('Без симптомів або легкі (5)', 'No or mild symptoms (5)') },
        { value: '3', label: t('Помірні симптоми (3)', 'Moderate symptoms (3)') },
        { value: '0', label: t('Тяжкі симптоми (0)', 'Severe symptoms (0)') },
      ],
    },
    {
      kind: 'check',
      key: 'noHypotension',
      label: t(
        'Немає гіпотензії: САТ > 90 мм рт. ст. (5)',
        'No hypotension: systolic BP > 90 mmHg (5)',
      ),
    },
    { kind: 'check', key: 'noCopd', label: t('Немає ХОЗЛ (4)', 'No COPD (4)') },
    {
      kind: 'check',
      key: 'noFungal',
      label: t(
        'Солідна пухлина або гемобластоз без грибкової інфекції в анамнезі (4)',
        'Solid tumour or haematological malignancy without a prior fungal infection (4)',
      ),
    },
    {
      kind: 'check',
      key: 'noDehydration',
      label: t(
        'Немає зневоднення, не потрібна інфузійна регідратація (3)',
        'No dehydration, no need for parenteral fluids (3)',
      ),
    },
    {
      kind: 'check',
      key: 'outpatient',
      label: t('Гарячка почалася амбулаторно (3)', 'Fever began as an outpatient (3)'),
    },
    { kind: 'check', key: 'under60', label: t('Вік < 60 років (2)', 'Age < 60 years (2)') },
  ],
  compute: (values) => {
    if (values.burden === undefined) return null
    const points =
      Number(values.burden) +
      (on(values, 'noHypotension') ? 5 : 0) +
      (on(values, 'noCopd') ? 4 : 0) +
      (on(values, 'noFungal') ? 4 : 0) +
      (on(values, 'noDehydration') ? 3 : 0) +
      (on(values, 'outpatient') ? 3 : 0) +
      (on(values, 'under60') ? 2 : 0)
    const standard = points >= 21
    return {
      value: { amount: points, decimals: 0, label: t('Бали (з 26)', 'Points (of 26)') },
      group: standard
        ? { label: t('Стандартний ризик', 'Standard risk'), tone: 'green' }
        : { label: t('Високий ризик', 'High risk'), tone: 'red' },
      notes: [
        standard
          ? t(
              'Амбулаторне лікування можливе лише за тривалості нейтропенії ≤ 7 днів, без клінічних чинників ризику і за всіх умов безпеки й комплаєнсу (вкладка «Фебрильна нейтропенія»).',
              'Outpatient care only with neutropenia ≤ 7 days, no clinical risk factors and every condition of safety and compliance met (the "Febrile neutropenia" tab).',
            )
          : t(
              '< 21 бала пов’язано з гіршим перебігом (бактеріємія, ВРІТ, смерть): госпіталізація, лікування як при високому ризику.',
              '< 21 points goes with a worse course (bacteraemia, ICU, death): admission, treatment as high risk.',
            ),
      ],
    }
  },
  sources: [
    {
      name: 'Sandherr M et al. 2024 update of the AGIHO guideline on diagnosis and empirical treatment of fever of unknown origin (FUO) in adult neutropenic patients. Lancet Reg Health Eur 2025;51:101214',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11836497/',
      checked: t(
        'Повний текст: таблиця 4 (ваги), поріг > 21 у підписі й ≥ 21 на рисунку 3, < 21 — високий ризик (AIIu)',
        'Full text: table 4 (weights), the threshold > 21 in its caption and ≥ 21 in figure 3, < 21 high risk (AIIu)',
      ),
    },
  ],
  caveat: t(
    'Розбіжність у джерелі: підпис таблиці 4 визначає стандартний ризик як > 21, а рисунок 3 і текст — як ≥ 21 (поза ним < 21 — високий). Тут прийнято ≥ 21. Сам MASCC може пропустити частину хворих з ризиком; у приймальному відділенні для виявлення низького ризику корисніша шкала CISNE (AIIu).',
    'A discrepancy in the source: the caption of table 4 defines standard risk as > 21, figure 3 and the text as ≥ 21 (with < 21 high). ≥ 21 is used here. MASCC alone may miss some patients at risk; in the emergency department CISNE is more useful to find low risk (AIIu).',
  ),
}
