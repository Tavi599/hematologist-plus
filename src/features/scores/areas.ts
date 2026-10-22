import { GENERAL_SCORES } from './general'
import { RISK_SCORES } from './risk'
import type { Score, Text2 } from './types'

const t = (uk: string, en: string): Text2 => ({ uk, en })

export interface Area {
  id: string
  /** Who the scores of the group are for, as the heading above them and the badge on each. */
  title: Text2
  scoreIds: string[]
  /** Catalog diseases whose page links to these scores. */
  diseases: string[]
}

/**
 * The risk and prognostic scores by the disease they were built on, in the order a
 * haematologist meets the diseases. A score belongs to one group; the general formulas apply to
 * any patient and are not grouped.
 */
export const RISK_AREAS: Area[] = [
  {
    id: 'any',
    title: t('Будь-яке онкологічне захворювання', 'Any malignancy'),
    scoreIds: ['tls-cairo', 'khorana'],
    diseases: [
      'aml',
      'apl',
      'acute-lymphoblastic-leukemia',
      'cll',
      'dlbcl',
      'mantle-cell-lymphoma',
      'ptcl-nos',
      'follicular-lymphoma',
      'hodgkin-lymphoma',
      'multiple-myeloma',
    ],
  },
  {
    id: 'febrile-neutropenia',
    title: t('Фебрильна нейтропенія', 'Febrile neutropenia'),
    scoreIds: ['mascc'],
    diseases: [],
  },
  {
    id: 'transplant',
    title: t(
      'Алогенна трансплантація гемопоетичних клітин',
      'Allogeneic haematopoietic cell transplantation',
    ),
    scoreIds: ['hct-ci'],
    diseases: ['aml', 'acute-lymphoblastic-leukemia', 'mds', 'primary-myelofibrosis', 'cml'],
  },
  {
    id: 'aggressive-lymphoma',
    title: t('ДВКЛ та інші агресивні лімфоми', 'DLBCL and other aggressive lymphomas'),
    scoreIds: ['ipi', 'aa-ipi', 'nccn-ipi', 'cns-ipi'],
    diseases: ['dlbcl', 'ptcl-nos', 'aitl', 'alcl', 'eatl-meitl'],
  },
  {
    id: 't-cell',
    title: t('Т-клітинні лімфоми', 'T-cell lymphomas'),
    scoreIds: ['pit', 'pink', 'atl-pi'],
    diseases: ['ptcl-nos', 'aitl', 'alcl', 'eatl-meitl', 'enkl', 'atll'],
  },
  {
    id: 'follicular',
    title: t('Фолікулярна лімфома', 'Follicular lymphoma'),
    scoreIds: ['flipi'],
    diseases: ['follicular-lymphoma'],
  },
  {
    id: 'mantle',
    title: t('Лімфома з клітин мантії', 'Mantle cell lymphoma'),
    scoreIds: ['mipi'],
    diseases: ['mantle-cell-lymphoma'],
  },
  {
    id: 'hodgkin',
    title: t('Лімфома Ходжкіна', 'Hodgkin lymphoma'),
    scoreIds: ['ips-hodgkin'],
    diseases: ['hodgkin-lymphoma'],
  },
  {
    id: 'cll',
    title: t('Хронічний лімфоцитарний лейкоз', 'Chronic lymphocytic leukaemia'),
    scoreIds: ['cll-ipi'],
    diseases: ['cll'],
  },
  {
    id: 'myeloma',
    title: t('Множинна мієлома', 'Multiple myeloma'),
    scoreIds: ['r-iss', 'r2-iss'],
    diseases: ['multiple-myeloma'],
  },
  {
    id: 'cml',
    title: t('Хронічний мієлолейкоз', 'Chronic myeloid leukaemia'),
    scoreIds: ['sokal', 'elts', 'hasford', 'eutos'],
    diseases: ['cml'],
  },
  {
    id: 'mds',
    title: t('Мієлодиспластичні синдроми', 'Myelodysplastic syndromes'),
    scoreIds: ['ipss-r', 'ipss', 'wpss'],
    diseases: ['mds'],
  },
  {
    id: 'myelofibrosis',
    title: t('Первинний мієлофіброз', 'Primary myelofibrosis'),
    scoreIds: ['dipss', 'mipss70'],
    diseases: ['primary-myelofibrosis'],
  },
]

const BY_ID = new Map([...GENERAL_SCORES, ...RISK_SCORES].map((score) => [score.id, score]))

export function scoreById(id: string): Score | undefined {
  return BY_ID.get(id)
}

export function areaOf(scoreId: string): Area | undefined {
  return RISK_AREAS.find((area) => area.scoreIds.includes(scoreId))
}

/** The scores a disease page points to: those of its groups, the disease's own first. */
export function scoresForDisease(diseaseId: string): Score[] {
  return RISK_AREAS.filter((area) => area.diseases.includes(diseaseId))
    .sort((a, b) => Number(a.id === 'any') - Number(b.id === 'any'))
    .flatMap((area) => area.scoreIds)
    .map((id) => BY_ID.get(id)!)
}
