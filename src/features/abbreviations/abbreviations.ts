/**
 * English abbreviations the clinical sections use as they stand in the guidelines, each with its
 * full English form and what it means in Ukrainian. Expansions are the standard ones; where a
 * guideline spells one differently (AGIHO 2024 writes MRSA as "multi-drug resistant S. aureus"),
 * the standard form is kept.
 */

import type { Text2 } from '../irradiated/indications'

const t = (uk: string, en: string): Text2 => ({ uk, en })

export interface Abbreviation {
  short: string
  full: string
  meaning: Text2
}

const LIST: Abbreviation[] = [
  {
    short: 'AGIHO',
    full: 'Arbeitsgemeinschaft Infektionen in der Hämatologie und Onkologie',
    meaning: t(
      'Робоча група з інфекцій у гематології та онкології (Німеччина)',
      'Infectious Diseases Working Party (Germany)',
    ),
  },
  {
    short: 'DGHO',
    full: 'Deutsche Gesellschaft für Hämatologie und Medizinische Onkologie',
    meaning: t(
      'Німецьке товариство гематології та медичної онкології',
      'German Society of Hematology and Medical Oncology',
    ),
  },
  {
    short: 'ESCMID',
    full: 'European Society of Clinical Microbiology and Infectious Diseases',
    meaning: t(
      'Європейське товариство клінічної мікробіології та інфекційних хвороб',
      'European Society of Clinical Microbiology and Infectious Diseases',
    ),
  },
  {
    short: 'ESGICH',
    full: 'ESCMID Study Group for Infections in Compromised Hosts',
    meaning: t(
      'Дослідницька група ESCMID з інфекцій в імуноскомпрометованих хворих',
      'ESCMID study group on infections in immunocompromised hosts',
    ),
  },
  {
    short: 'NHS',
    full: 'National Health Service',
    meaning: t('Національна служба охорони здоров’я Англії', 'The English health service'),
  },
  {
    short: 'FDA',
    full: 'Food and Drug Administration',
    meaning: t(
      'Управління з контролю якості харчових продуктів і ліків США',
      'The US medicines regulator',
    ),
  },
  {
    short: 'EMA',
    full: 'European Medicines Agency',
    meaning: t('Європейське агентство з лікарських засобів', 'The EU medicines regulator'),
  },
  {
    short: 'SmPC',
    full: 'Summary of Product Characteristics',
    meaning: t(
      'Коротка характеристика лікарського засобу (європейська інструкція)',
      'The European label of a medicine',
    ),
  },
  {
    short: 'emc',
    full: 'electronic medicines compendium',
    meaning: t(
      'Британський довідник інструкцій лікарських засобів',
      'The UK database of medicine labels',
    ),
  },
  {
    short: 'FUO',
    full: 'fever of unknown origin',
    meaning: t('Гарячка невідомого походження', 'Fever of unknown origin'),
  },
  {
    short: 'MASCC',
    full: 'Multinational Association for Supportive Care in Cancer',
    meaning: t(
      'Міжнародна асоціація підтримувальної терапії в онкології; її шкала ризику фебрильної нейтропенії',
      'The association and its febrile neutropenia risk score',
    ),
  },
  {
    short: 'CISNE',
    full: 'Clinical Index of Stable Febrile Neutropenia',
    meaning: t(
      'Клінічний індекс стабільної фебрильної нейтропенії (шкала для приймального відділення)',
      'A risk score for stable febrile neutropenia in the emergency department',
    ),
  },
  {
    short: 'qSOFA',
    full: 'quick Sequential (Sepsis-related) Organ Failure Assessment',
    meaning: t(
      'Швидка оцінка органної недостатності при сепсисі',
      'Quick bedside sepsis organ failure score',
    ),
  },
  {
    short: 'MRSA',
    full: 'methicillin-resistant Staphylococcus aureus',
    meaning: t('Метицилінрезистентний золотистий стафілокок', 'Methicillin-resistant S. aureus'),
  },
  {
    short: 'ESBL-E',
    full: 'extended-spectrum beta-lactamase-producing Enterobacterales',
    meaning: t(
      'Ентеробактерії, що продукують бета-лактамази розширеного спектра',
      'Enterobacterales producing extended-spectrum beta-lactamases',
    ),
  },
  {
    short: 'VRE',
    full: 'vancomycin-resistant enterococci',
    meaning: t('Ванкоміцинрезистентні ентерококи', 'Vancomycin-resistant enterococci'),
  },
  {
    short: 'CRE',
    full: 'carbapenem-resistant Enterobacterales',
    meaning: t('Карбапенемрезистентні ентеробактерії', 'Carbapenem-resistant Enterobacterales'),
  },
  {
    short: 'MDR',
    full: 'multidrug-resistant',
    meaning: t(
      'Полірезистентний (стійкий до кількох груп антибіотиків)',
      'Resistant to several antibiotic classes',
    ),
  },
  {
    short: 'L-AmB',
    full: 'liposomal amphotericin B',
    meaning: t('Ліпосомальний амфотерицин B', 'Liposomal amphotericin B'),
  },
  {
    short: 'ANC',
    full: 'absolute neutrophil count',
    meaning: t('Абсолютна кількість нейтрофілів', 'Absolute neutrophil count'),
  },
  {
    short: 'CrCl',
    full: 'creatinine clearance',
    meaning: t('Кліренс креатиніну (КК)', 'Creatinine clearance'),
  },
  {
    short: 'CAPD',
    full: 'continuous ambulatory peritoneal dialysis',
    meaning: t(
      'Постійний амбулаторний перитонеальний діаліз (ПАПД)',
      'Continuous ambulatory peritoneal dialysis',
    ),
  },
  {
    short: 'PJP (PcP)',
    full: 'Pneumocystis jirovecii pneumonia',
    meaning: t('Пневмоцистна пневмонія', 'Pneumocystis pneumonia'),
  },
  {
    short: 'HSV',
    full: 'herpes simplex virus',
    meaning: t('Вірус простого герпесу', 'Herpes simplex virus'),
  },
  {
    short: 'VZV',
    full: 'varicella-zoster virus',
    meaning: t(
      'Вірус вітряної віспи й оперізувального герпесу',
      'Varicella and herpes zoster virus',
    ),
  },
  {
    short: 'CMV',
    full: 'cytomegalovirus',
    meaning: t('Цитомегаловірус', 'Cytomegalovirus'),
  },
  {
    short: 'HBV',
    full: 'hepatitis B virus',
    meaning: t('Вірус гепатиту B', 'Hepatitis B virus'),
  },
  {
    short: 'HCV',
    full: 'hepatitis C virus',
    meaning: t('Вірус гепатиту C', 'Hepatitis C virus'),
  },
  {
    short: 'HBsAg',
    full: 'hepatitis B surface antigen',
    meaning: t('Поверхневий антиген вірусу гепатиту B', 'Hepatitis B surface antigen'),
  },
  {
    short: 'anti-HBc',
    full: 'antibodies to hepatitis B core antigen',
    meaning: t(
      'Антитіла до ядерного антигену вірусу гепатиту B (перенесена інфекція)',
      'Antibodies to the hepatitis B core antigen (past infection)',
    ),
  },
  {
    short: 'PML',
    full: 'progressive multifocal leukoencephalopathy',
    meaning: t(
      'Прогресуюча мультифокальна лейкоенцефалопатія',
      'Progressive multifocal leukoencephalopathy',
    ),
  },
  {
    short: 'IgG',
    full: 'immunoglobulin G',
    meaning: t('Імуноглобулін G', 'Immunoglobulin G'),
  },
  {
    short: 'CD',
    full: 'cluster of differentiation',
    meaning: t(
      'Кластер диференціювання — поверхневий маркер клітини (CD20, CD38, CD52…)',
      'A cell surface marker (CD20, CD38, CD52…)',
    ),
  },
  {
    short: 'HSCT',
    full: 'haematopoietic stem cell transplantation',
    meaning: t(
      'Трансплантація гемопоетичних стовбурових клітин (ТГСК)',
      'Stem cell transplantation',
    ),
  },
  {
    short: 'CAR-T',
    full: 'chimeric antigen receptor T cells',
    meaning: t('Т-клітини з химерним антигенним рецептором', 'Chimeric antigen receptor T cells'),
  },
  {
    short: 'BTK',
    full: "Bruton's tyrosine kinase",
    meaning: t('Тирозинкіназа Брутона (мішень ібрутинібу та ін.)', "Bruton's tyrosine kinase"),
  },
  {
    short: 'PI3K',
    full: 'phosphoinositide 3-kinase',
    meaning: t('Фосфоінозитид-3-кіназа (мішень іделалісибу)', 'Phosphoinositide 3-kinase'),
  },
  {
    short: 'JAK',
    full: 'Janus kinase',
    meaning: t('Янус-кіназа (мішень руксолітинібу)', 'Janus kinase'),
  },
  {
    short: 'BCL2',
    full: 'B-cell lymphoma 2',
    meaning: t('Білок BCL2, мішень венетоклаксу', 'The BCL2 protein, target of venetoclax'),
  },
  {
    short: 'A–D, I–III',
    full: 'strength of recommendation, quality of evidence (ESCMID)',
    meaning: t(
      'Сила рекомендації: A — переконливо за, B — помірно за, C — слабко за, D — проти. Якість доказів: I — щонайменше одне належне рандомізоване дослідження; II — нерандомізовані, когортні, «випадок–контроль»; III — думка експертів, клінічний досвід. Індекси до II: r — метааналіз чи систематичний огляд РКД, t — перенесені з іншої групи хворих, h — історичний контроль, u — неконтрольоване дослідження, a — опублікована теза',
      'Strength: A strongly for, B moderately for, C marginally for, D against. Quality: I at least one proper randomised trial; II non-randomised, cohort or case-control; III expert opinion, clinical experience. Indices to II: r meta-analysis of RCTs, t transferred evidence, h historical control, u uncontrolled trial, a published abstract',
    ),
  },
]

export const ABBREVIATIONS: ReadonlyMap<string, Abbreviation> = new Map(
  LIST.map((entry) => [entry.short, entry]),
)

/** The abbreviations of the febrile neutropenia tab. */
export const FEBRILE_NEUTROPENIA_ABBREVIATIONS = [
  'AGIHO',
  'DGHO',
  'FUO',
  'MASCC',
  'CISNE',
  'qSOFA',
  'MRSA',
  'ESBL-E',
  'VRE',
  'CRE',
  'MDR',
  'L-AmB',
  'ANC',
  'CrCl',
  'CAPD',
  'PJP (PcP)',
  'FDA',
  'EMA',
  'SmPC',
  'emc',
  'A–D, I–III',
]

/** The abbreviations of the treatment-related immunodeficiency section. */
export const IMMUNODEFICIENCY_ABBREVIATIONS = [
  'AGIHO',
  'DGHO',
  'ESCMID',
  'ESGICH',
  'NHS',
  'PJP (PcP)',
  'HSV',
  'VZV',
  'CMV',
  'HBV',
  'HCV',
  'HBsAg',
  'anti-HBc',
  'PML',
  'IgG',
  'CD',
  'HSCT',
  'CAR-T',
  'BTK',
  'PI3K',
  'JAK',
  'BCL2',
  'A–D, I–III',
]
