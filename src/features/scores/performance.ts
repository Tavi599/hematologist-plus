import type { Score, Text2 } from './types'

const t = (uk: string, en: string): Text2 => ({ uk, en })

/** ECOG grades with their descriptions, as ECOG-ACRIN publishes them. */
const ECOG: { grade: number; text: Text2 }[] = [
  {
    grade: 0,
    text: t(
      'Повністю активний, виконує все, що й до хвороби, без обмежень',
      'Fully active, able to carry on all pre-disease performance without restriction',
    ),
  },
  {
    grade: 1,
    text: t(
      'Обмежений у важкій фізичній активності, але ходить і може виконувати легку чи сидячу роботу (легка хатня, офісна)',
      'Restricted in physically strenuous activity but ambulatory and able to carry out light or sedentary work, e.g. light house work, office work',
    ),
  },
  {
    grade: 2,
    text: t(
      'Ходить, повністю себе обслуговує, але не може працювати; на ногах понад 50% часу неспання',
      'Ambulatory and capable of all self-care but unable to carry out any work; up and about more than 50% of waking hours',
    ),
  },
  {
    grade: 3,
    text: t(
      'Обмежено себе обслуговує; у ліжку чи кріслі понад 50% часу неспання',
      'Capable of only limited self-care; confined to bed or chair more than 50% of waking hours',
    ),
  },
  {
    grade: 4,
    text: t(
      'Повністю непрацездатний, не обслуговує себе, весь час у ліжку чи кріслі',
      'Completely disabled; cannot carry on any self-care; totally confined to bed or chair',
    ),
  },
  { grade: 5, text: t('Смерть', 'Dead') },
]

/** Karnofsky levels and the ECOG grade the ECOG-ACRIN comparison sets beside each. */
const KARNOFSKY: { level: number; ecog: number; text: Text2 }[] = [
  {
    level: 100,
    ecog: 0,
    text: t(
      'Норма, скарг немає, ознак хвороби немає',
      'Normal, no complaints; no evidence of disease',
    ),
  },
  {
    level: 90,
    ecog: 0,
    text: t(
      'Здатний до звичайної активності; незначні ознаки чи симптоми хвороби',
      'Able to carry on normal activity; minor signs or symptoms of disease',
    ),
  },
  {
    level: 80,
    ecog: 1,
    text: t(
      'Звичайна активність із зусиллям; деякі ознаки чи симптоми хвороби',
      'Normal activity with effort, some signs or symptoms of disease',
    ),
  },
  {
    level: 70,
    ecog: 1,
    text: t(
      'Себе обслуговує, але не здатний до звичайної активності чи активної роботи',
      'Cares for self but unable to carry on normal activity or to do active work',
    ),
  },
  {
    level: 60,
    ecog: 2,
    text: t(
      'Інколи потребує допомоги, але здебільшого обслуговує себе сам',
      'Requires occasional assistance but is able to care for most of personal needs',
    ),
  },
  {
    level: 50,
    ecog: 2,
    text: t(
      'Потребує значної допомоги й частої медичної допомоги',
      'Requires considerable assistance and frequent medical care',
    ),
  },
  {
    level: 40,
    ecog: 3,
    text: t(
      'Непрацездатний; потребує спеціального догляду й допомоги',
      'Disabled; requires special care and assistance',
    ),
  },
  {
    level: 30,
    ecog: 3,
    text: t(
      'Тяжко непрацездатний; показана госпіталізація, хоча смерть не неминуча',
      'Severely disabled; hospitalization is indicated although death not imminent',
    ),
  },
  {
    level: 20,
    ecog: 4,
    text: t(
      'Дуже тяжкий стан; потрібні госпіталізація й активна підтримувальна терапія',
      'Very ill; hospitalization and active supportive care necessary',
    ),
  },
  { level: 10, ecog: 4, text: t('Помираючий', 'Moribund') },
  { level: 0, ecog: 5, text: t('Смерть', 'Dead') },
]

/** ECOG and Karnofsky in one: either is chosen, the other is read off the comparison. */
export const performanceStatus: Score = {
  id: 'ecog-karnofsky',
  section: 'general',
  title: t('Загальний стан: ECOG ↔ Карновський', 'Performance status: ECOG ↔ Karnofsky'),
  purpose: t(
    'Оберіть оцінку за будь-якою шкалою — буде показано відповідник за іншою',
    'Pick a grade on either scale to see its counterpart on the other',
  ),
  fields: [
    {
      kind: 'select',
      key: 'grade',
      label: t('Оцінка', 'Grade'),
      options: [
        ...ECOG.map(({ grade, text }) => ({
          value: `ecog-${grade}`,
          label: t(`ECOG ${grade} — ${text.uk}`, `ECOG ${grade} — ${text.en}`),
        })),
        ...KARNOFSKY.map(({ level, text }) => ({
          value: `kps-${level}`,
          label: t(`Карновський ${level}% — ${text.uk}`, `Karnofsky ${level}% — ${text.en}`),
        })),
      ],
    },
  ],
  compute: (values) => {
    const chosen = typeof values.grade === 'string' ? values.grade : undefined
    if (!chosen) return null
    const [scale, raw] = chosen.split('-')
    const number = Number(raw)
    if (scale === 'ecog') {
      const ecog = ECOG.find((entry) => entry.grade === number)!
      const levels = KARNOFSKY.filter((entry) => entry.ecog === number)
      return {
        group: {
          label: t(
            `Карновський ${levels.map((entry) => entry.level).join(' / ')}%`,
            `Karnofsky ${levels.map((entry) => entry.level).join(' / ')}%`,
          ),
          tone: number <= 1 ? 'green' : number === 2 ? 'yellow' : number === 3 ? 'orange' : 'red',
        },
        notes: [
          t(`ECOG ${number}: ${ecog.text.uk}.`, `ECOG ${number}: ${ecog.text.en}.`),
          ...levels.map((entry) =>
            t(
              `Карновський ${entry.level}%: ${entry.text.uk}.`,
              `Karnofsky ${entry.level}%: ${entry.text.en}.`,
            ),
          ),
        ],
      }
    }
    const kps = KARNOFSKY.find((entry) => entry.level === number)!
    const ecog = ECOG.find((entry) => entry.grade === kps.ecog)!
    return {
      group: {
        label: t(`ECOG ${ecog.grade}`, `ECOG ${ecog.grade}`),
        tone:
          ecog.grade <= 1
            ? 'green'
            : ecog.grade === 2
              ? 'yellow'
              : ecog.grade === 3
                ? 'orange'
                : 'red',
      },
      notes: [
        t(`Карновський ${kps.level}%: ${kps.text.uk}.`, `Karnofsky ${kps.level}%: ${kps.text.en}.`),
        t(`ECOG ${ecog.grade}: ${ecog.text.uk}.`, `ECOG ${ecog.grade}: ${ecog.text.en}.`),
      ],
    }
  },
  sources: [
    {
      name: 'ECOG-ACRIN Cancer Research Group. ECOG Performance Status Scale; Comparing the ECOG and the Karnofsky Performance Status Scales',
      url: 'https://ecog-acrin.org/resources/ecog-performance-status/',
      checked: t(
        'Обидві шкали з описами й таблиця відповідності',
        'Both scales with their descriptions and the comparison table',
      ),
    },
    {
      name: 'Oken MM et al. Toxicity and response criteria of the Eastern Cooperative Oncology Group. Am J Clin Oncol 1982;5:649–55',
      url: 'https://pubmed.ncbi.nlm.nih.gov/7165009/',
      checked: t(
        'Першоджерело шкали ECOG (за посиланням ECOG-ACRIN)',
        'The original of the ECOG scale (as cited by ECOG-ACRIN)',
      ),
    },
  ],
  caveat: t(
    'ECOG-ACRIN зазначає, що узгодити дві шкали можна по-різному; тут — найпоширеніша відповідність, яку вона публікує.',
    'ECOG-ACRIN notes there are several ways to map the two scales; this is the commonly used comparison it publishes.',
  ),
}
