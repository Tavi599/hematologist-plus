/**
 * Secondary immunodeficiency caused by the treatment of haematological malignancies: which
 * therapies raise which infections, and what the guidelines advise against them. Each measure keeps
 * the source's own grade (ESCMID SoR/QoE in AGIHO, the panel's level in the bispecific consensus);
 * the wording is ours. ESGICH 2018 is read from its abstracts only (the full text is not open), so
 * its statements carry no grade.
 */

import type { Text2 } from '../irradiated/indications'

const t = (uk: string, en: string): Text2 => ({ uk, en })

/** The disease whose page carries this section. */
export const SECONDARY_IMMUNODEFICIENCY = 'secondary-immunodeficiency'

export type SourceKey =
  | 'agihoPjp'
  | 'agihoHerpes'
  | 'esgichLymphoid1'
  | 'esgichLymphoid2'
  | 'esgichKinase'
  | 'esgichProteasome'
  | 'bsabMyeloma'
  | 'nhsIg'

export const SOURCES: Record<SourceKey, { name: string; short: string; url: string; read: Text2 }> =
  {
    agihoPjp: {
      short: 'AGIHO 2021',
      name: 'Classen AY et al. Primary prophylaxis of bacterial infections and Pneumocystis jirovecii pneumonia in patients with hematologic malignancies and solid tumors: 2020 updated guidelines of the AGIHO/DGHO. Ann Hematol 2021;100:1603–20',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8116237/',
      read: t('Повний текст, таблиці 7–9', 'Full text, tables 7–9'),
    },
    agihoHerpes: {
      short: 'AGIHO 2022',
      name: 'Sandherr M et al. Management of herpesvirus reactivations in patients with solid tumours and hematologic malignancies: update of the AGIHO/DGHO guidelines. Ann Hematol 2022;101:1163–78',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8810475/',
      read: t('Повний текст, таблиці 5–7', 'Full text, tables 5–7'),
    },
    esgichLymphoid1: {
      short: 'ESGICH 2018',
      name: 'Mikulska M et al. ESGICH Consensus Document on the safety of targeted and biological therapies (CD19, CD20 and CD52). Clin Microbiol Infect 2018;24 Suppl 2:S71–82',
      url: 'https://pubmed.ncbi.nlm.nih.gov/29447988/',
      read: t('Лише реферат', 'Abstract only'),
    },
    esgichLymphoid2: {
      short: 'ESGICH 2018',
      name: 'Drgona L et al. ESGICH Consensus Document (CD22, CD30, CD33, CD38, CD40, SLAMF-7 and CCR4). Clin Microbiol Infect 2018;24 Suppl 2:S83–94',
      url: 'https://pubmed.ncbi.nlm.nih.gov/29572070/',
      read: t('Лише реферат', 'Abstract only'),
    },
    esgichKinase: {
      short: 'ESGICH 2018',
      name: 'Reinwald M et al. ESGICH Consensus Document (tyrosine kinase and mTOR inhibitors). Clin Microbiol Infect 2018;24 Suppl 2:S53–70',
      url: 'https://pubmed.ncbi.nlm.nih.gov/29454849/',
      read: t('Лише реферат', 'Abstract only'),
    },
    esgichProteasome: {
      short: 'ESGICH 2018',
      name: 'Redelman-Sidi G et al. ESGICH Consensus Document (checkpoint, cell adhesion, S1P and proteasome inhibitors). Clin Microbiol Infect 2018;24 Suppl 2:S95–107',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5971148/',
      read: t('Реферат', 'Abstract'),
    },
    bsabMyeloma: {
      short: 'Raje 2023',
      name: 'Raje N et al. Monitoring, prophylaxis, and treatment of infections in patients with MM receiving bispecific antibody therapy: consensus recommendations from an expert panel. Blood Cancer J 2023;13:116',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10394080/',
      read: t('Повний текст, таблиця рекомендацій', 'Full text, table of recommendations'),
    },
    nhsIg: {
      short: 'NHS England',
      name: 'NHS England: Immunoglobulin commissioning guidance (PSS9, 2019/20) and the change form of 02.2025 to the commissioning criteria policy',
      url: 'https://www.england.nhs.uk/wp-content/uploads/2021/12/ccp-for-the-use-of-Ig-feb-2025-change-form.pdf',
      read: t('Повний текст', 'Full text'),
    },
  }

/** What the therapy puts at risk; each is a badge and a filter. */
export type RiskKind = 'hypogamma' | 'pjp' | 'herpes' | 'hbv' | 'cmv' | 'fungal' | 'bacterial'

/** Badge colour of each risk. */
export const RISK_COLOR: Record<RiskKind, string> = {
  hypogamma: 'grape',
  pjp: 'red',
  herpes: 'orange',
  hbv: 'yellow',
  cmv: 'pink',
  fungal: 'teal',
  bacterial: 'blue',
}

/** Short forms for a one-line mark under a regimen. */
export const RISK_SHORT: Record<RiskKind, Text2> = {
  hypogamma: t('↓IgG', '↓IgG'),
  pjp: t('ПЦП', 'PJP'),
  herpes: t('HSV/VZV', 'HSV/VZV'),
  hbv: t('HBV', 'HBV'),
  cmv: t('CMV', 'CMV'),
  fungal: t('мікози', 'fungal'),
  bacterial: t('бактерії', 'bacterial'),
}

export const RISK_LABELS: Record<RiskKind, Text2> = {
  hypogamma: t('Гіпогамаглобулінемія', 'Hypogammaglobulinaemia'),
  pjp: t('Пневмоцистна пневмонія', 'Pneumocystis pneumonia'),
  herpes: t('HSV / VZV', 'HSV / VZV'),
  hbv: t('Реактивація HBV', 'HBV reactivation'),
  cmv: t('CMV', 'CMV'),
  fungal: t('Грибкові', 'Fungal'),
  bacterial: t('Бактеріальні', 'Bacterial'),
}

export interface Measure {
  text: Text2
  /** The source's own grade; null where only the abstract was read. */
  grade: string | null
  source: SourceKey
}

export interface TherapyRisk {
  id: string
  therapy: Text2
  /**
   * Catalog drugs whose presence as a main drug of a course marks it with this entry. Steroids
   * and cytarabine mark nothing: nearly every regimen has them, and their risk lies in the dose
   * and duration, which the regimen alone does not tell.
   */
  markDrugIds: string[]
  risks: RiskKind[]
  why: Text2
  measures: Measure[]
}

export const THERAPY_RISKS: TherapyRisk[] = [
  {
    id: 'anti-cd20',
    therapy: t('Анти-CD20: ритуксимаб, обінутузумаб', 'Anti-CD20: rituximab, obinutuzumab'),
    markDrugIds: ['rituximab', 'obinutuzumab'],
    risks: ['hypogamma', 'hbv', 'herpes', 'pjp'],
    why: t(
      'Виснаження В-клітин; тяжкі респіраторні інфекції, реактивація HBV і VZV. Ризик герпесвірусів триває місяцями після лікування, особливо з бендамустином і на підтримці анти-CD20.',
      'B-cell depletion; severe respiratory infections, HBV and VZV reactivation. The herpesvirus risk lasts for months after treatment, above all with bendamustine and on anti-CD20 maintenance.',
    ),
    measures: [
      {
        text: t(
          'Перед лікуванням — HBsAg і анти-HBc; противірусна профілактика 12–18 міс. при HBsAg+ чи HBsAg−/анти-HBc+',
          'Before treatment, HBsAg and anti-HBc; antiviral prophylaxis for 12–18 months if HBsAg+ or HBsAg−/anti-HBc+',
        ),
        grade: null,
        source: 'esgichLymphoid1',
      },
      {
        text: t(
          'Ацикловір (валацикловір) при імунохіміотерапії НХЛ і ХЛЛ',
          'Aciclovir (valaciclovir) with immunochemotherapy for NHL and CLL',
        ),
        grade: 'B-IIu',
        source: 'agihoHerpes',
      },
      {
        text: t(
          'Профілактика пневмоцистозу — розглянути при супутній хіміотерапії, особливо зі стероїдами; FCR — значний ризик, R-CHOP14 — проміжний',
          'Pneumocystis prophylaxis to be considered with concomitant chemotherapy, above all with steroids; FCR carries a significant risk, R-CHOP14 an intermediate one',
        ),
        grade: 'FCR A-I · R-CHOP14 C-III',
        source: 'agihoPjp',
      },
      {
        text: t(
          'Імуноглобулін при IgG < 4 г/л і повторних тяжких інфекціях',
          'Immunoglobulin at IgG < 4 g/L with recurrent severe infections',
        ),
        grade: null,
        source: 'nhsIg',
      },
    ],
  },
  {
    id: 'purine-analogues',
    therapy: t(
      'Аналоги пуринів і бендамустин: флударабін, кладрибін, бендамустин',
      'Purine analogues and bendamustine: fludarabine, cladribine, bendamustine',
    ),
    markDrugIds: ['fludarabine', 'cladribine', 'bendamustine'],
    risks: ['pjp', 'herpes'],
    why: t(
      'Тривала Т-лімфопенія. Потрібні й опромінені компоненти крові (вкладка на сторінці захворювань).',
      'Lasting T-cell lymphopenia. Irradiated blood components are needed as well (a tab on the diseases page).',
    ),
    measures: [
      {
        text: t(
          'Профілактика пневмоцистозу: нуклеозидні аналоги — проміжний ризик; флударабін + циклофосфамід + ритуксимаб — значний',
          'Pneumocystis prophylaxis: nucleoside analogues carry an intermediate risk; fludarabine + cyclophosphamide + rituximab a significant one',
        ),
        grade: 'C-III · FCR A-I',
        source: 'agihoPjp',
      },
      {
        text: t(
          'Бендамустин — окремий чинник ризику HSV/VZV; ацикловір за індивідуальним ризиком',
          'Bendamustine is a risk factor of its own for HSV/VZV; aciclovir by individual risk',
        ),
        grade: 'B-IIu',
        source: 'agihoHerpes',
      },
    ],
  },
  {
    id: 'steroids',
    therapy: t('Тривалі кортикостероїди', 'Long-term corticosteroids'),
    markDrugIds: [],
    risks: ['pjp', 'herpes'],
    why: t(
      'Преднізолон > 20 мг/добу понад 4 тижні — значний ризик пневмоцистозу; ≥ 10 мг/добу понад 14 днів підвищує ризик VZV; кумулятивна доза > 2500 мг/м² — чинник ризику герпесвірусів при лімфомах.',
      'Prednisone > 20 mg a day for over 4 weeks is a significant Pneumocystis risk; ≥ 10 mg a day for over 14 days raises the VZV risk; a cumulative dose > 2500 mg/m² is a herpesvirus risk factor in lymphoma.',
    ),
    measures: [
      {
        text: t(
          'Профілактика пневмоцистозу при > 20 мг преднізолону на добу понад 4 тижні',
          'Pneumocystis prophylaxis at > 20 mg prednisone a day for over 4 weeks',
        ),
        grade: 'A-I',
        source: 'agihoPjp',
      },
      {
        text: t(
          'Ацикловір при високих дозах тривало, особливо з іншими імуносупресорами; можна продовжити до 6 міс. після відміни',
          'Aciclovir with long high doses, above all with other immunosuppressants; may continue for up to 6 months after stopping',
        ),
        grade: 'C-IIu',
        source: 'agihoHerpes',
      },
    ],
  },
  {
    id: 'proteasome',
    therapy: t(
      'Інгібітори протеасом: бортезоміб, карфілзоміб, іксазоміб',
      'Proteasome inhibitors: bortezomib, carfilzomib, ixazomib',
    ),
    markDrugIds: ['bortezomib', 'carfilzomib', 'ixazomib'],
    risks: ['herpes', 'pjp'],
    why: t(
      'Різко підвищують ризик оперізувального герпесу (VISTA: 13% проти 4%; з профілактикою — 3%).',
      'Sharply raise the risk of herpes zoster (VISTA: 13% against 4%; 3% with prophylaxis).',
    ),
    measures: [
      {
        text: t(
          'Ацикловір на весь час лікування (бортезоміб — A-IIu, валацикловір B-IIu; карфілзоміб A-IIu; іксазоміб A-IIh)',
          'Aciclovir for the whole treatment (bortezomib A-IIu, valaciclovir B-IIu; carfilzomib A-IIu; ixazomib A-IIh)',
        ),
        grade: 'A-II',
        source: 'agihoHerpes',
      },
      {
        text: t(
          'Профілактику пневмоцистозу можна розглянути при мієломі з додатковими чинниками (високі дози стероїдів)',
          'Pneumocystis prophylaxis may be considered in myeloma with added risk factors (high-dose steroids)',
        ),
        grade: null,
        source: 'esgichProteasome',
      },
    ],
  },
  {
    id: 'anti-cd38',
    therapy: t('Анти-CD38 (даратумумаб) та елотузумаб', 'Anti-CD38 (daratumumab) and elotuzumab'),
    markDrugIds: ['daratumumab', 'elotuzumab'],
    risks: ['herpes', 'hypogamma'],
    why: t(
      'Даратумумаб підвищує ризик VZV; елотузумаб спричиняє лімфопенію й інфекції, особливо VZV. Даратумумаб — серед причин вторинної гіпогамаглобулінемії за NHS England.',
      'Daratumumab raises the VZV risk; elotuzumab causes lymphopenia and infections, above all VZV. NHS England lists daratumumab among the causes of secondary hypogammaglobulinaemia.',
    ),
    measures: [
      {
        text: t('Ацикловір (даратумумаб, елотузумаб)', 'Aciclovir (daratumumab, elotuzumab)'),
        grade: 'C-IIt',
        source: 'agihoHerpes',
      },
      {
        text: t(
          'Імуноглобулін при IgG < 4 г/л і повторних тяжких інфекціях',
          'Immunoglobulin at IgG < 4 g/L with recurrent severe infections',
        ),
        grade: null,
        source: 'nhsIg',
      },
    ],
  },
  {
    id: 'lenalidomide',
    therapy: t('Леналідомід', 'Lenalidomide'),
    markDrugIds: ['lenalidomide'],
    risks: ['herpes'],
    why: t(
      'Помірне підвищення ризику оперізувального герпесу при мієломі.',
      'A moderate rise in the herpes zoster risk in myeloma.',
    ),
    measures: [
      {
        text: t('Ацикловір за індивідуальним ризиком', 'Aciclovir by individual risk'),
        grade: 'C-IIh',
        source: 'agihoHerpes',
      },
    ],
  },
  {
    id: 'bispecific-mm',
    therapy: t(
      'Біспецифічні антитіла при мієломі: теклістамаб, елранатамаб, талкветамаб',
      'Bispecific antibodies in myeloma: teclistamab, elranatamab, talquetamab',
    ),
    markDrugIds: ['teclistamab', 'elranatamab', 'talquetamab'],
    risks: ['hypogamma', 'herpes', 'pjp', 'hbv', 'cmv', 'bacterial'],
    why: t(
      'Глибока гіпогамаглобулінемія (MajesTEC-1: 74,5%), цитопенії; частіші тяжкі інфекції, ніж при звичайному лікуванні мієломи.',
      'Deep hypogammaglobulinaemia (MajesTEC-1: 74.5%) and cytopenias; severe infections more often than with standard myeloma treatment.',
    ),
    measures: [
      {
        text: t(
          'Імуноглобулін щомісяця при IgG < 400 мг/дл, ≥ 2 тяжких інфекціях інкапсульованими бактеріями чи загрозливій для життя інфекції — доки IgG ≥ 400 мг/дл; IgG контролювати щомісяця',
          'Monthly immunoglobulin at IgG < 400 mg/dL, ≥ 2 severe infections by encapsulated bacteria or a life-threatening infection, until IgG ≥ 400 mg/dL; IgG checked monthly',
        ),
        grade: 'IIC',
        source: 'bsabMyeloma',
      },
      {
        text: t(
          'NHS England: профілактичний імуноглобулін, якщо IgG < 4 г/л на початку біспецифічного антитіла',
          'NHS England: prophylactic immunoglobulin if IgG < 4 g/L when the bispecific antibody starts',
        ),
        grade: null,
        source: 'nhsIg',
      },
      {
        text: t(
          'Ацикловір чи валацикловір усім, на весь час лікування мієломи',
          'Aciclovir or valaciclovir for all, for the whole of the myeloma treatment',
        ),
        grade: 'III',
        source: 'bsabMyeloma',
      },
      {
        text: t(
          'Профілактика пневмоцистозу всім: ко-тримоксазол; при алергії — дапсон чи атоваквон',
          'Pneumocystis prophylaxis for all: co-trimoxazole; dapsone or atovaquone in sulfonamide allergy',
        ),
        grade: 'III · IIC',
        source: 'bsabMyeloma',
      },
      {
        text: t(
          'HBsAg і анти-HBc до лікування; при анти-HBc+ — профілактика або моніторинг ДНК HBV',
          'HBsAg and anti-HBc before treatment; with anti-HBc+, prophylaxis or HBV DNA monitoring',
        ),
        grade: 'III',
        source: 'bsabMyeloma',
      },
      {
        text: t(
          'Левофлоксацин лише при тривалій нейтропенії чи повторних бактеріальних інфекціях; протигрибкова профілактика рутинно не потрібна',
          'Levofloxacin only in prolonged neutropenia or recurrent bacterial infections; routine antifungal prophylaxis is not needed',
        ),
        grade: 'IIC',
        source: 'bsabMyeloma',
      },
    ],
  },
  {
    id: 'car-t',
    therapy: t(
      'CAR-T проти В- чи плазмоклітинних антигенів',
      'CAR-T against B-cell or plasma-cell antigens',
    ),
    markDrugIds: [],
    risks: ['hypogamma'],
    why: t(
      'В-клітинна аплазія після CAR-T; при В-лімфомах потреба в імуноглобуліні 31–64%.',
      'B-cell aplasia after CAR-T; in B-cell lymphoma 31–64% need immunoglobulin.',
    ),
    measures: [
      {
        text: t(
          'Профілактичний імуноглобулін при В-клітинній аплазії — навіть без тяжких інфекцій і вакцинного тесту',
          'Prophylactic immunoglobulin in B-cell aplasia, even without severe infections or a vaccine challenge',
        ),
        grade: null,
        source: 'nhsIg',
      },
    ],
  },
  {
    id: 'btk-bcl2',
    therapy: t(
      'Інгібітори BTK і BCL2: ібрутиніб, акалабрутиніб, занубрутиніб, венетоклакс',
      'BTK and BCL2 inhibitors: ibrutinib, acalabrutinib, zanubrutinib, venetoclax',
    ),
    markDrugIds: ['ibrutinib', 'acalabrutinib', 'zanubrutinib', 'venetoclax'],
    risks: ['hypogamma', 'herpes', 'pjp', 'fungal'],
    why: t(
      'Ібрутиніб знижує гамаглобуліни; поодинокі пневмоцистоз, інвазивні мікози, ПМЛ. Венетоклакс сам по собі частоти інфекцій не підвищує, але з обінутузумабом дає нейтропенію.',
      'Ibrutinib lowers gamma globulins; occasional Pneumocystis, invasive fungal infection, PML. Venetoclax alone does not raise the infection rate, but with obinutuzumab it brings neutropenia.',
    ),
    measures: [
      {
        text: t(
          'Ацикловір за індивідуальним ризиком (вік, пізні лінії)',
          'Aciclovir by individual risk (age, later lines)',
        ),
        grade: 'C-IIu',
        source: 'agihoHerpes',
      },
    ],
  },
  {
    id: 'idelalisib',
    therapy: t('Інгібітори PI3K: іделалісиб', 'PI3K inhibitors: idelalisib'),
    markDrugIds: ['idelalisib'],
    risks: ['pjp', 'cmv', 'herpes'],
    why: t(
      'Смертельні опортуністичні інфекції, часта реактивація CMV.',
      'Fatal opportunistic infections, frequent CMV reactivation.',
    ),
    measures: [
      {
        text: t(
          'Профілактика пневмоцистозу (за інструкцією)',
          'Pneumocystis prophylaxis (per label)',
        ),
        grade: 'A-IIu,t',
        source: 'agihoPjp',
      },
      {
        text: t('Ацикловір', 'Aciclovir'),
        grade: 'B-III',
        source: 'agihoHerpes',
      },
      {
        text: t(
          'Профілактика пневмоцистозу і заходи проти CMV',
          'Pneumocystis prophylaxis and CMV prevention',
        ),
        grade: null,
        source: 'esgichKinase',
      },
    ],
  },
  {
    id: 'alemtuzumab',
    therapy: t('Алемтузумаб (анти-CD52)', 'Alemtuzumab (anti-CD52)'),
    markDrugIds: ['alemtuzumab'],
    risks: ['pjp', 'cmv', 'hbv'],
    why: t(
      'Глибока лімфопенія, опортуністичні інфекції.',
      'Deep lymphopenia, opportunistic infections.',
    ),
    measures: [
      {
        text: t('Профілактика пневмоцистозу', 'Pneumocystis prophylaxis'),
        grade: 'A-IIu,t',
        source: 'agihoPjp',
      },
      {
        text: t(
          'Профілактика CMV; скринінг HBV, HCV і туберкульозу; при HBsAg+ — противірусна профілактика щонайменше 6–12 міс.',
          'CMV prevention; HBV, HCV and tuberculosis screening; with HBsAg+, antiviral prophylaxis for at least 6–12 months',
        ),
        grade: null,
        source: 'esgichLymphoid1',
      },
    ],
  },
  {
    id: 'brentuximab',
    therapy: t('Брентуксимаб ведотин (анти-CD30)', 'Brentuximab vedotin (anti-CD30)'),
    markDrugIds: ['brentuximab-vedotin'],
    risks: ['pjp', 'cmv'],
    why: t('Опортуністичні інфекції.', 'Opportunistic infections.'),
    measures: [
      {
        text: t(
          'Профілактика пневмоцистозу і моніторинг CMV',
          'Pneumocystis prophylaxis and CMV monitoring',
        ),
        grade: null,
        source: 'esgichLymphoid2',
      },
    ],
  },
  {
    id: 'cd19-cd22',
    therapy: t(
      'Блінатумомаб (анти-CD19) та інотузумаб озогаміцин (анти-CD22)',
      'Blinatumomab (anti-CD19) and inotuzumab ozogamicin (anti-CD22)',
    ),
    markDrugIds: ['blinatumomab', 'inotuzumab-ozogamicin'],
    risks: ['hypogamma', 'bacterial'],
    why: t(
      'Блінатумомаб — гіпогамаглобулінемія, нейтропенія, катетер-асоційовані інфекції через тривалу інфузію. Інотузумаб — спектр інфекцій як при анти-CD20.',
      'Blinatumomab: hypogammaglobulinaemia, neutropenia, catheter-related infections from the long infusion. Inotuzumab: infections like those with anti-CD20.',
    ),
    measures: [
      {
        text: t(
          'Блінатумомаб — пильність щодо катетер-асоційованих інфекцій; інотузумаб — ризики як при анти-CD20',
          'Blinatumomab: watch for catheter-related infections; inotuzumab: risks as with anti-CD20',
        ),
        grade: null,
        source: 'esgichLymphoid2',
      },
    ],
  },
  {
    id: 'jak',
    therapy: t('Інгібітори JAK: руксолітиніб', 'JAK inhibitors: ruxolitinib'),
    markDrugIds: ['ruxolitinib'],
    risks: ['herpes', 'hbv', 'pjp'],
    why: t(
      'Помітно підвищують частоту інфекцій; оперізувальний герпес частіший (OR 5,2).',
      'Markedly raise the infection rate; herpes zoster more often (OR 5.2).',
    ),
    measures: [
      {
        text: t(
          'Скринінг HBV і латентного туберкульозу до лікування; профілактика пневмоцистозу — при додаткових чинниках ризику',
          'HBV and latent tuberculosis screening before treatment; Pneumocystis prophylaxis with added risk factors',
        ),
        grade: null,
        source: 'esgichKinase',
      },
      {
        text: t(
          'Користь противірусної профілактики не доведена: пильність і швидке лікування реактивацій',
          'Antiviral prophylaxis has no proven benefit: watchfulness and prompt treatment of reactivations',
        ),
        grade: null,
        source: 'agihoHerpes',
      },
    ],
  },
  {
    id: 'dasatinib',
    therapy: t('Дазатиніб', 'Dasatinib'),
    markDrugIds: ['dasatinib'],
    risks: ['cmv', 'hbv'],
    why: t(
      'Інгібітори BCR-ABL помірно підвищують ризик інфекцій; дазатиніб — реактивація CMV і HBV.',
      'BCR-ABL inhibitors modestly raise the infection risk; dasatinib brings CMV and HBV reactivation.',
    ),
    measures: [
      {
        text: t('Скринінг HBV до лікування', 'HBV screening before treatment'),
        grade: null,
        source: 'esgichKinase',
      },
    ],
  },
  {
    id: 'acute-leukaemia',
    therapy: t(
      'Інтенсивна хіміотерапія гострих лейкемій; триоксид арсену при ГПЛ',
      'Intensive chemotherapy of acute leukaemia; arsenic trioxide in APL',
    ),
    markDrugIds: ['arsenic-trioxide'],
    risks: ['herpes', 'pjp', 'bacterial'],
    why: t(
      'Герпетичний стоматит у 37–68% при інтенсивній хіміотерапії; при триоксиді арсену VZV у 17,5% без профілактики проти 4,1% з нею. ГЛЛ — значний ризик пневмоцистозу.',
      'Herpes stomatitis in 37–68% on intensive chemotherapy; with arsenic trioxide VZV in 17.5% without prophylaxis against 4.1% with it. ALL carries a significant Pneumocystis risk.',
    ),
    measures: [
      {
        text: t(
          'Ацикловір від початку індукції на час нейтропенії (ГМЛ); при ГЛЛ — на весь час лікування',
          'Aciclovir from the start of induction through neutropenia (AML); in ALL, for the whole treatment',
        ),
        grade: 'ГМЛ B-IIr · ГЛЛ B-I',
        source: 'agihoHerpes',
      },
      {
        text: t(
          'Триоксид арсену: ацикловір на час лікування і 6 міс. після',
          'Arsenic trioxide: aciclovir during treatment and for 6 months after',
        ),
        grade: 'B-IIr',
        source: 'agihoHerpes',
      },
      {
        text: t('ГЛЛ: профілактика пневмоцистозу', 'ALL: Pneumocystis prophylaxis'),
        grade: 'A-I',
        source: 'agihoPjp',
      },
    ],
  },
]

/** Risk factors that add up across therapies (AGIHO herpes table 7, footnote a; PJP table 7). */
export const GENERAL_FACTORS: Text2[] = [
  t('Вік > 60 років', 'Age > 60 years'),
  t(
    'Кумулятивна доза стероїдів > 2500 мг/м² (у перерахунку на преднізолон)',
    'Cumulative steroids > 2500 mg/m² (prednisone equivalent)',
  ),
  t('Пізні лінії лікування', 'Later lines of treatment'),
  t('Бендамустин; підтримка анти-CD20', 'Bendamustine; anti-CD20 maintenance'),
  t('Фебрильна нейтропенія в анамнезі', 'A history of febrile neutropenia'),
  t('Реактивація HSV/VZV в анамнезі', 'A history of HSV/VZV reactivation'),
  t(
    'CD4 < 200/мкл — проміжний ризик пневмоцистозу',
    'CD4 < 200/µL: an intermediate Pneumocystis risk',
  ),
  t(
    'Алогенна ТГСК — значний ризик пневмоцистозу',
    'Allogeneic HSCT: a significant Pneumocystis risk',
  ),
]

/** The agents and doses the guidelines give for the prophylaxis named above. */
export const PROPHYLAXIS_AGENTS: Measure[] = [
  {
    text: t(
      'Ацикловір 400 мг 2 чи 4 рази на добу або валацикловір 500 мг 2 рази на добу (при нормальній функції нирок)',
      'Aciclovir 400 mg twice or four times a day, or valaciclovir 500 mg twice a day (normal renal function)',
    ),
    grade: null,
    source: 'agihoHerpes',
  },
  {
    text: t(
      'Ко-тримоксазол 80/400 мг щодня, 160/800 мг щодня або 160/800 мг тричі на тиждень',
      'Co-trimoxazole 80/400 mg daily, 160/800 mg daily or 160/800 mg three times a week',
    ),
    grade: 'B-IIt',
    source: 'agihoPjp',
  },
  {
    text: t(
      'Альтернативи: атоваквон 1500 мг 1 раз на добу з жирною їжею (A-IIt); дапсон 100 мг/добу після перевірки на дефіцит Г6ФД (A-IIt); пентамідин інгаляційно 300 мг раз на місяць (B-IIt)',
      'Alternatives: atovaquone 1500 mg once a day with a fatty meal (A-IIt); dapsone 100 mg a day after G6PD testing (A-IIt); inhaled pentamidine 300 mg once a month (B-IIt)',
    ),
    grade: null,
    source: 'agihoPjp',
  },
]

/** The entries a course or a regimen falls under, by its main drugs, in the order listed above. */
export function therapyRisksFor(drugIds: Iterable<string>): TherapyRisk[] {
  const given = new Set(drugIds)
  return THERAPY_RISKS.filter((entry) => entry.markDrugIds.some((id) => given.has(id)))
}

/** Every risk of the entries, once each, in the order of RISK_LABELS. */
export function risksOf(entries: readonly TherapyRisk[]): RiskKind[] {
  const all = new Set(entries.flatMap((entry) => entry.risks))
  return (Object.keys(RISK_LABELS) as RiskKind[]).filter((risk) => all.has(risk))
}
