/**
 * When cellular blood components are to be irradiated, after the British Society for Haematology
 * guideline (Foukaneli et al., Br J Haematol 2020;191:704–24), read in full on 2026-10-11. Each
 * entry keeps the guideline's own grade; the wording is ours, the thresholds and durations are the
 * guideline's.
 */

export interface Text2 {
  uk: string
  en: string
}

const t = (uk: string, en: string): Text2 => ({ uk, en })

export interface Indication {
  who: Text2
  duration: Text2
  /** GRADE strength and evidence, as the guideline gives it. */
  grade: string
}

export const SOURCE = {
  name: 'Foukaneli T et al. Guidelines on the use of irradiated blood components (British Society for Haematology). Br J Haematol 2020;191:704–24',
  url: 'https://onlinelibrary.wiley.com/doi/full/10.1111/bjh.17015',
  checkedOn: '2026-10-11',
}

export const INDICATIONS: { group: Text2; items: Indication[] }[] = [
  {
    group: t('Захворювання', 'Diseases'),
    items: [
      {
        who: t(
          'Лімфома Ходжкіна — будь-яка стадія, дорослі й діти',
          'Hodgkin lymphoma at any stage, adults and children',
        ),
        duration: t('Довічно (еритроцити й тромбоцити)', 'Indefinitely (red cells and platelets)'),
        grade: '2C',
      },
      {
        who: t(
          'Тяжкі вроджені Т-клітинні імунодефіцити; при підозрі — до завершення обстеження',
          'Severe congenital T-lymphocyte immunodeficiency; when suspected, while the tests are under way',
        ),
        duration: t(
          'За діагнозом; при підозрі — до виключення',
          'By the diagnosis; when suspected, until excluded',
        ),
        grade: '1B / 1C',
      },
    ],
  },
  {
    group: t('Лікування', 'Treatment'),
    items: [
      {
        who: t(
          'Пуринові аналоги — флударабін, кладрибін, бендамустин, пентостатин — за будь-якого діагнозу',
          'Purine analogues (fludarabine, cladribine, bendamustine, pentostatin), whatever the diagnosis',
        ),
        duration: t('Довічно', 'Indefinitely'),
        grade: '2C',
      },
      {
        who: t(
          'Алемтузумаб при ХЛЛ чи іншому гематологічному діагнозі',
          'Alemtuzumab for CLL or another haematological diagnosis',
        ),
        duration: t('Тривалість настанова не визначає', 'The guideline sets no duration'),
        grade: '2C',
      },
      {
        who: t(
          'Апластична анемія з лікуванням АТГ чи алемтузумабом',
          'Aplastic anaemia treated with ATG or alemtuzumab',
        ),
        duration: t(
          'Доцільно, поки хворий після АТГ приймає циклоспорин',
          'Reasonably while the patient is still on ciclosporin after ATG',
        ),
        grade: '2C',
      },
      {
        who: t(
          'АТГ чи інша Т-деплеційна серотерапія при рідкісних імунних дисфункціях (наприклад, сімейний ГЛГ)',
          'ATG or other T-cell depleting serotherapy for rare immune dysfunction (e.g. familial HLH)',
        ),
        duration: t(
          'До відновлення імунітету (оцінює імунолог)',
          'Until immune reconstitution (immunology review)',
        ),
        grade: '2C',
      },
    ],
  },
  {
    group: t('Трансплантація і клітинна терапія', 'Transplantation and cell therapy'),
    items: [
      {
        who: t(
          'Алогенна ТГСК — усі реципієнти, за будь-якого діагнозу',
          'Allogeneic HSCT, every recipient, whatever the diagnosis',
        ),
        duration: t(
          'З початку кондиціювання, доки не виконано все: понад 6 міс після ТГСК, лімфоцити > 1,0 ×10⁹/л, немає активної хронічної РТПХ, імуносупресію скасовано. При хронічній РТПХ чи тривалій імуносупресії — безстроково',
          'From the start of conditioning until all are met: over 6 months from transplant, lymphocytes > 1.0 ×10⁹/L, no active chronic GvHD, off all immunosuppression. With chronic GvHD or continued immunosuppression, indefinitely',
        ),
        grade: '1B / 2C',
      },
      {
        who: t(
          'Донори кісткового мозку чи стовбурових клітин крові (будь-якого віку)',
          'Bone marrow or blood stem cell donors of any age',
        ),
        duration: t(
          'Алогенні клітинні компоненти за 7 днів до та під час збору',
          'Allogeneic cellular components within 7 days before and during the harvest',
        ),
        grade: '2C',
      },
      {
        who: t(
          'Збір стовбурових клітин для аутотрансплантації',
          'Stem cell collection for autologous reinfusion',
        ),
        duration: t('За 7 днів до та під час збору', 'For 7 days before and during the harvest'),
        grade: '1C',
      },
      {
        who: t(
          'Аутологічна ТГСК — за будь-якого діагнозу',
          'Autologous HSCT, whatever the diagnosis',
        ),
        duration: t(
          'Від початку кондиціювання до 3 міс після трансплантації (6 міс, якщо було тотальне опромінення тіла)',
          'From the start of conditioning to 3 months after transplant (6 months after total body irradiation)',
        ),
        grade: '1C',
      },
      {
        who: t('CAR-T-клітинна терапія', 'CAR-T cell therapy'),
        duration: t(
          'За 7 днів до та під час збору лімфоцитів і до 3 міс після інфузії CAR-T',
          'For 7 days before and during the lymphocyte collection and until 3 months after the CAR-T infusion',
        ),
        grade: '1C',
      },
    ],
  },
  {
    group: t('Особливі компоненти й донори', 'Particular components and donors'),
    items: [
      {
        who: t(
          'Компоненти від родичів 1-го чи 2-го ступеня — навіть імунокомпетентним',
          'Components from first- or second-degree relatives, even to the immunocompetent',
        ),
        duration: t('Кожна така трансфузія', 'Every such transfusion'),
        grade: '1B',
      },
      {
        who: t('HLA-підібрані тромбоцити', 'HLA-selected platelets'),
        duration: t('Кожна така трансфузія', 'Every such transfusion'),
        // Named in the aplastic anaemia (1B) and the leukaemia and lymphoma (2C) recommendations.
        grade: '1B / 2C',
      },
      {
        who: t(
          'Гранулоцити — усі, переливати якомога швидше',
          'Granulocytes, all of them, transfused with minimum delay',
        ),
        duration: t('Кожна така трансфузія', 'Every such transfusion'),
        grade: '1C',
      },
    ],
  },
  {
    group: t('Плід і новонароджені', 'Fetus and newborn'),
    items: [
      {
        who: t(
          'Внутрішньоутробні трансфузії еритроцитів і тромбоцитів',
          'Intrauterine red cell and platelet transfusions',
        ),
        duration: t(
          'Еритроцити — перелити протягом 24 год після опромінення',
          'Red cells transfused within 24 hours of irradiation',
        ),
        grade: '1C',
      },
      {
        who: t('Обмінне переливання крові в новонароджених', 'Neonatal exchange transfusion'),
        duration: t(
          'Перелити протягом 24 год після опромінення',
          'Transfused within 24 hours of irradiation',
        ),
        grade: '1C',
      },
      {
        who: t(
          'Новонароджені й немовлята після внутрішньоутробної трансфузії',
          'Neonates and infants after an intrauterine transfusion',
        ),
        duration: t(
          'До 6 міс після очікуваної дати пологів (40 тижнів)',
          'Until 6 months after the expected delivery date (40 weeks)',
        ),
        grade: '2C',
      },
    ],
  },
]

/** Where the guideline finds no routine need, so the request is not made out of habit. */
export const NOT_NEEDED: { who: Text2; grade: string }[] = [
  {
    who: t(
      'Гострі лейкози, неходжкінські лімфоми, ХЛЛ — рутинно ні, якщо немає лікування пуриновими аналогами, алемтузумабом, ТГСК, HLA-підібраних тромбоцитів, гранулоцитів чи донорства від родичів',
      'Acute leukaemia, non-Hodgkin lymphoma, CLL: not routinely, unless purine analogues, alemtuzumab, HSCT, HLA-selected platelets, granulocytes or donations from relatives',
    ),
    grade: '2C',
  },
  {
    who: t('Ритуксимаб сам по собі', 'Rituximab on its own'),
    grade: '1B',
  },
  {
    who: t(
      'Апластична анемія без АТГ, алемтузумабу чи ТГСК (крім HLA-підібраних тромбоцитів, гранулоцитів, донорства від родичів)',
      'Aplastic anaemia without ATG, alemtuzumab or HSCT (except HLA-selected platelets, granulocytes, donations from relatives)',
    ),
    grade: '1B',
  },
  {
    who: t(
      'ВІЛ-інфекція і СНІД; тимчасові вірусні дефекти Т-клітин у дітей',
      'HIV infection and AIDS; temporary viral T-cell defects in children',
    ),
    grade: '1B',
  },
  {
    who: t(
      'Алемтузумаб за схемою для розсіяного склерозу чи васкуліту; алемтузумаб чи АТГ при трансплантації солідних органів',
      'Alemtuzumab on the multiple sclerosis or vasculitis schedule; alemtuzumab or ATG in solid organ transplantation',
    ),
    grade: '1B',
  },
  {
    who: t(
      'Недоношені й доношені немовлята без попередньої внутрішньоутробної трансфузії',
      'Preterm and term infants without a previous intrauterine transfusion',
    ),
    grade: '2C',
  },
]

export const COMPONENT_NOTES: Text2[] = [
  t(
    'Опромінюють еритроцити, тромбоцити й гранулоцити (крім розморожених деглицеролізованих еритроцитів). Свіжозаморожену плазму, кріопреципітат і препарати плазми опромінювати не потрібно (1B).',
    'Red cells, platelets and granulocytes are irradiated (except deglycerolised cryopreserved red cells). Fresh frozen plasma, cryoprecipitate and fractionated plasma need no irradiation (1B).',
  ),
  t(
    'Еритроцити можна опромінити до 14 днів після заготівлі й зберігати ще до 14 днів після опромінення; тромбоцити — будь-коли, зі звичайним терміном придатності (1C, 1A).',
    'Red cells may be irradiated up to 14 days after collection and stored a further 14 days; platelets at any time, with their normal shelf life (1C, 1A).',
  ),
  t(
    'Лейкодеплеція сама по собі не замінює опромінення (1C).',
    'Leucocyte depletion alone does not replace irradiation (1C).',
  ),
  t(
    'Невідкладно трансфузію не відкладають через відсутність опромінених компонентів: дають лейкодеплетовані (бажано еритроцити старші за 14 днів), записують це й спостерігають щодо РТПХ 6 тижнів (1C, 2C).',
    'In an emergency the transfusion is not delayed for irradiated components: leucocyte-depleted ones are given (older red cells, over 14 days, where possible), this is recorded and the patient watched for GvHD for 6 weeks (1C, 2C).',
  ),
  t(
    'Потребу в опромінених компонентах вказують у кожному замовленні й перевіряють біля ліжка; хворому варто мати картку з цією вимогою (1C).',
    'The need is written on every request and checked at the bedside; the patient should carry a card saying so (1C).',
  ),
]

/** Drugs after which components stay irradiated, for the marks on regimens. */
export const IRRADIATION_DRUGS: Record<string, Text2> = {
  fludarabine: t('довічно (пуриновий аналог)', 'indefinitely (purine analogue)'),
  cladribine: t('довічно (пуриновий аналог)', 'indefinitely (purine analogue)'),
  bendamustine: t('довічно (як пуринові аналоги)', 'indefinitely (as purine analogues)'),
  pentostatin: t('довічно (пуриновий аналог)', 'indefinitely (purine analogue)'),
  alemtuzumab: t(
    'при гематологічному діагнозі; тривалість не визначена',
    'with a haematological diagnosis; duration not set',
  ),
  'anti-thymocyte-globulin-rabbit': t(
    'при апластичній анемії, поки триває циклоспорин',
    'in aplastic anaemia, while on ciclosporin',
  ),
}

/** Diseases that need irradiated components in themselves. */
export const IRRADIATION_DISEASES: Record<string, Text2> = {
  'hodgkin-lymphoma': t(
    'Хворі на лімфому Ходжкіна будь-якої стадії потребують опромінених еритроцитів і тромбоцитів довічно (BSH 2020, 2C).',
    'Patients with Hodgkin lymphoma at any stage need irradiated red cells and platelets indefinitely (BSH 2020, 2C).',
  ),
}
