/**
 * Febrile neutropenia in adults: risk, the first-line empirical treatment and how it goes on,
 * after the AGIHO/DGHO guideline of 2024 (Sandherr et al., Lancet Reg Health Eur 2025), read in
 * full with its four algorithm figures on 2026-10-11. The wording is ours; the branches, thresholds
 * and grades are the guideline's. The guideline names drugs but gives no doses: those come from the
 * labels, each for its own febrile-neutropenia indication, and a drug whose label was not read for
 * it stands without a dose.
 */

import type { Text2 } from '../irradiated/indications'

const t = (uk: string, en: string): Text2 => ({ uk, en })

export const GUIDELINE = {
  name: 'Sandherr M et al. 2024 update of the AGIHO guideline on diagnosis and empirical treatment of fever of unknown origin (FUO) in adult neutropenic patients with solid tumours and hematological malignancies. Lancet Reg Health Eur 2025;51:101214',
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11836497/',
}

export const NEUTROPENIA_DEFINITION = {
  text: t(
    'Нейтропенія — нейтрофіли < 500/мкл або < 1000/мкл з очікуваним падінням нижче 500/мкл протягом 2 днів; якщо нейтрофілів не визначено — лейкоцити < 1000/мкл.',
    'Neutropenia: neutrophils < 500/µL, or < 1000/µL expected to fall below 500/µL within 2 days; with no neutrophil count, leukocytes < 1000/µL.',
  ),
  source: {
    name: 'Classen AY et al. AGIHO/DGHO 2020 guideline on antibacterial and PcP prophylaxis. Ann Hematol 2021;100:1603–20',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8116237/',
  },
}

export interface Step {
  text: Text2
  grade?: string
}

/** A box of the algorithm: a heading and what is done there. */
export interface Stage {
  id: string
  title: Text2
  steps: Step[]
  /** Where the box comes from, when it is not the AGIHO 2024 guideline of the whole algorithm. */
  sources?: { name: string; url: string }[]
}

export const RISK: Stage = {
  id: 'risk',
  title: t('1. Оцінка ризику', '1. Risk'),
  steps: [
    {
      text: t(
        'Високий ризик: очікувана нейтропенія > 7 днів',
        'High risk: neutropenia expected for > 7 days',
      ),
      grade: 'AI',
    },
    {
      text: t(
        'Високий ризик і при нейтропенії ≤ 7 днів, якщо є клінічні чинники: діагноз і стадія хвороби, вид і доза хіміотерапії, перший цикл, серцева чи ниркова недостатність, лейкопенія до лікування, підвищені лужна фосфатаза й білірубін, поганий загальний стан',
        'High risk also with neutropenia ≤ 7 days when clinical factors are present: the disease and its stage, the type and dose of chemotherapy, the first cycle, heart or kidney failure, leukopenia before treatment, raised alkaline phosphatase and bilirubin, poor performance status',
      ),
      grade: 'BII',
    },
    {
      text: t(
        'Стандартний ризик: нейтропенія ≤ 7 днів без клінічних чинників',
        'Standard risk: neutropenia ≤ 7 days with no clinical factors',
      ),
      grade: 'AI',
    },
    {
      text: t(
        'MASCC < 21 бала — гірший перебіг (бактеріємія, ВРІТ, смерть); MASCC разом з прокальцитоніном точніше виявляє високий ризик. qSOFA для скринінгу не використовувати',
        'MASCC < 21 points means a worse course (bacteraemia, ICU, death); MASCC with procalcitonin finds high risk better. qSOFA is not to be used for screening',
      ),
      grade: 'AIIu · qSOFA DIIu',
    },
    {
      text: t(
        'Прокальцитонін передбачає бактеріємію краще, ніж СРБ; повторні вимірювання допомагають рано помітити ускладнення',
        'Procalcitonin predicts bacteraemia better than CRP; repeated measurements help to catch complications early',
      ),
      grade: 'AIIu · BIIu',
    },
  ],
}

export const HIGH_RISK: Stage = {
  id: 'high',
  title: t('2. Високий ризик: перша лінія (стаціонар)', '2. High risk: first line (in hospital)'),
  steps: [
    {
      text: t(
        'Огляд, анамнез; 2–3 набори гемокультур (з периферичної вени і з центрального катетера); далі — за клінічними ознаками',
        'Examination and history; 2–3 sets of blood cultures (peripheral vein and central line); further tests by the clinical signs',
      ),
    },
    {
      text: t(
        'Емпіричний антибіотик — негайно, з активністю проти ентеробактерій, синьогнійної палички, S. aureus і стрептококів. Антибактеріальну профілактику при цьому припинити',
        'The empirical antibiotic at once, active against Enterobacterales, Pseudomonas aeruginosa, S. aureus and streptococci. Antibacterial prophylaxis stops with it',
      ),
    },
    {
      text: t(
        'Без відомої колонізації, а також при VRE чи CRE — антисиньогнійний бета-лактам (піперацилін/тазобактам, цефепім, меропенем, іміпенем)',
        'No known colonisation, and also VRE or CRE: an antipseudomonal beta-lactam (piperacillin/tazobactam, cefepime, meropenem, imipenem)',
      ),
    },
    {
      text: t(
        'Колонізація MRSA — антисиньогнійний бета-лактам + тейкопланін або ванкоміцин',
        'MRSA colonisation: an antipseudomonal beta-lactam + teicoplanin or vancomycin',
      ),
    },
    {
      text: t('Колонізація ESBL-E — карбапенем', 'ESBL-E colonisation: a carbapenem'),
    },
    {
      text: t(
        'Тяжкий стан із CRE — можна додати аміноглікозид або колістин; комбінація при септичному шоці чи тяжкій інфекції з високим ризиком MDR — розглянути',
        'Severely ill with CRE: an aminoglycoside or colistin may be added; a combination may be considered in septic shock or severe infection at high MDR risk',
      ),
      grade: 'CIII',
    },
    {
      text: t(
        'Резервні антибіотики (цефтазидим/авібактам, цефтолозан/тазобактам, цефідерокол тощо) емпірично не застосовують; додавання ванкоміцину, тейкопланіну чи лінезоліду переваги не дає',
        'Reserve antibiotics (ceftazidime/avibactam, ceftolozane/tazobactam, cefiderocol and the like) are not given empirically; adding vancomycin, teicoplanin or linezolid brings no benefit',
      ),
    },
    {
      text: t(
        'Подовжена інфузія бета-лактаму (до 4 год) — можна розглянути',
        'An extended beta-lactam infusion (up to 4 h) may be considered',
      ),
      grade: 'CIII',
    },
    {
      text: t(
        'Респіраторні симптоми, інфекція центрального катетера, сепсис чи поліорганна недостатність — лікувати за окремими настановами (легеневі інфільтрати, катетерні інфекції, сепсис); інакше — емпірична терапія 96 год із щоденною переоцінкою',
        'Respiratory symptoms, a central-line infection, sepsis or multiple organ failure: treat by the guidelines of their own (lung infiltrates, catheter infection, sepsis); otherwise empirical therapy for 96 h with daily reassessment',
      ),
    },
  ],
}

export const STANDARD_RISK: Stage = {
  id: 'standard',
  title: t(
    '3. Стандартний ризик: амбулаторно чи в стаціонар',
    '3. Standard risk: outpatient or admission',
  ),
  steps: [
    {
      text: t(
        'Обстеження за симптомами: КТ грудної клітки чи УЗД черева, гемо-, копро-, урокультура. Бактеріємія чи сепсис, пневмонія, діарея, інфекція ЦНС, метаболічна декомпенсація, органна недостатність, потреба у в/в регідратації — госпіталізація',
        'Tests by the symptoms: chest CT or abdominal ultrasound, blood, stool and urine cultures. Bacteraemia or sepsis, pneumonia, diarrhoea, CNS infection, metabolic decompensation, organ failure, a need for IV fluids: admission',
      ),
    },
    {
      text: t(
        'MASCC < 21 — госпіталізація і лікування як при високому ризику',
        'MASCC < 21: admission and treatment as high risk',
      ),
    },
    {
      text: t(
        'MASCC ≥ 21 і всі умови: медична допомога гарантована; хворий не сам і на зв’язку; клініка з гематологічним досвідом — до 1 год; пероральні ліки з високим комплаєнсом; хворий при свідомості й розуміє ризик; немає профілактики фторхінолонами; гемодинаміка стабільна, ознак органної недостатності немає',
        'MASCC ≥ 21 and every condition: medical care guaranteed; the patient is not alone and can be reached; a clinic with haematological expertise within 1 h; oral drugs with high compliance; the patient is conscious and understands the risk; no fluoroquinolone prophylaxis; haemodynamically stable with no sign of organ failure',
      ),
    },
    {
      text: t(
        'Тоді — амбулаторно: амоксицилін/клавуланат + ципрофлоксацин; при протипоказаннях — моксифлоксацин (не діє на синьогнійну паличку). Щоденний огляд обов’язковий',
        'Then outpatient: amoxicillin/clavulanate + ciprofloxacin; with contraindications, moxifloxacin (not active against Pseudomonas). A daily review is mandatory',
      ),
      grade: 'AI',
    },
    {
      text: t(
        'Нестабільність, гарячка понад 96 год чи втрата комплаєнсу — негайно в стаціонар. Після 2–3 днів в/в терапії зі швидким покращенням хворого стандартного ризику можна перевести на амбулаторне лікування',
        'Instability, fever beyond 96 h or lost compliance: admit at once. After 2–3 days of IV therapy with quick improvement, a standard-risk patient may continue as an outpatient',
      ),
    },
  ],
}

export const AFTER_96H: Stage = {
  id: 'second',
  title: t('4. Через 96 год: друга лінія', '4. After 96 h: second line'),
  steps: [
    {
      text: t(
        'Клінічно нестабільний, з гарячкою — змінити антибіотики + емпіричний протиплісеневий антимікотик',
        'Clinically unstable, febrile: change the antibiotics + an empirical mould-active antifungal',
      ),
      grade: 'AIIrt',
    },
    {
      text: t(
        'Стабільний, з гарячкою — продовжити антибіотики + КТ грудної клітки; протиплісеневий антимікотик превентивно (за даними КТ чи лабораторних тестів)',
        'Stable, febrile: continue the antibiotics + chest CT; a mould-active antifungal pre-emptively (on CT or laboratory findings)',
      ),
      grade: 'BI',
    },
    {
      text: t(
        'Стабільний, без гарячки — антибіотики відмінити незалежно від рівня нейтрофілів; щоденний ретельний огляд обов’язковий',
        'Stable, afebrile: stop the antibiotics whatever the neutrophil count; a close daily review is mandatory',
      ),
      grade: 'AI',
    },
    {
      text: t(
        'Сама лише тривалість гарячки без погіршення не є причиною міняти антибіотик: медіана до зниження температури — 3–5 днів',
        'The length of fever alone, without deterioration, is no reason to change the antibiotic: the median time to defervescence is 3–5 days',
      ),
      grade: 'DIIr',
    },
    {
      text: t(
        'Емпіричне додавання ванкоміцину, тейкопланіну чи тигецикліну при стійкій гарячці переваги не довело',
        'Empirically adding vancomycin, teicoplanin or tigecycline in persistent fever has shown no benefit',
      ),
    },
  ],
}

export const ANTIFUNGAL: Stage = {
  id: 'antifungal',
  title: t('5. Протигрибкова терапія', '5. Antifungal therapy'),
  steps: [
    {
      text: t(
        'Високий ризик без системної протигрибкової профілактики: гарячка понад 72–96 год або повторна попри адекватні антибіотики — емпірично протиплісеневий антимікотик',
        'High risk without systemic antifungal prophylaxis: fever beyond 72–96 h or recurring despite adequate antibiotics: an empirical mould-active antifungal',
      ),
      grade: 'AI',
    },
    {
      text: t(
        'Превентивний підхід (лише за позитивним тестом чи КТ) — альтернатива профілактиці чи емпіричній терапії, якщо швидко доступні лабораторія і КТ',
        'The pre-emptive approach (only on a positive test or CT) is an alternative to prophylaxis or empirical therapy when laboratory and CT are quickly available',
      ),
      grade: 'BI',
    },
    {
      text: t(
        'Стандартний ризик — емпіричної протигрибкової терапії не призначати',
        'Standard risk: no empirical antifungal therapy',
      ),
      grade: 'DIII',
    },
    {
      text: t(
        'Ехінокандини (каспофунгін, мікафунгін) — найкращі дані щодо смертності й зниження температури; амфотерицин B — лише ліпосомальний',
        'Echinocandins (caspofungin, micafungin) have the best data on mortality and defervescence; amphotericin B only as the liposomal form',
      ),
    },
  ],
}

export const DURATION: Stage = {
  id: 'duration',
  title: t('6. Коли зупинити антибіотики', '6. When to stop the antibiotics'),
  steps: [
    {
      text: t(
        'Після 3–5 днів без гарячки (< 38 °C без жарознижувальних) і клінічного одужання — незалежно від рівня нейтрофілів',
        'After 3–5 days without fever (< 38 °C without antipyretics) and clinical recovery, whatever the neutrophil count',
      ),
      grade: 'AI',
    },
    {
      text: t(
        'До відновлення нейтрофілів — ретельне спостереження. При стійкій гарячці антибіотики продовжують і за негативних посівів',
        'Close watch until the neutrophils recover. In persistent fever the antibiotics go on even with negative cultures',
      ),
    },
  ],
}

export const STAGES: Stage[] = [RISK, HIGH_RISK, STANDARD_RISK, AFTER_96H, ANTIFUNGAL, DURATION]

const IDSA_TABLE = {
  name: 'IDSA 2026 AMR Guidance v4.0, Table 1 (adults, normal renal and hepatic function)',
  url: 'https://www.idsociety.org/globalassets/idsa/practice-guidelines/amr-guidance/5.0/table-1.pdf',
}

const ECIL_TABLES = {
  name: 'ECIL-4 targeted therapy (Averbuch, Haematologica 2013), tables 2–3',
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3856958/',
}

/** Drugs the guideline names, with the dose of their own label for febrile neutropenia. */
export interface Agent {
  name: Text2
  dose: Text2 | null
  source: { name: string; url: string } | null
  /** The course the calculator writes for it. */
  regimenId?: string
}

export const AGENTS: { group: Text2; agents: Agent[] }[] = [
  {
    group: t(
      'Антисиньогнійні бета-лактами (перша лінія)',
      'Antipseudomonal beta-lactams (first line)',
    ),
    agents: [
      {
        name: t('Піперацилін/тазобактам', 'Piperacillin/tazobactam'),
        dose: t(
          '4 г/0,5 г в/в кожні 6 год (інфузія 30 хв)',
          '4 g/0.5 g IV every 6 h (30-minute infusion)',
        ),
        source: {
          name: 'SmPC Piperacillin 4 g/Tazobactam 500 mg (emc), 4.1–4.2: neutropenic adults with fever',
          url: 'https://www.medicines.org.uk/emc/product/8771/smpc',
        },
        regimenId: 'fn-piperacillin-tazobactam',
      },
      {
        name: t('Цефепім', 'Cefepime'),
        dose: t('2 г в/в кожні 8 год', '2 g IV every 8 h'),
        source: {
          name: 'FDA label: Cefepime for Injection, 2.1: empiric therapy for febrile neutropenic patients',
          url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=de477f37-40f6-4295-ae72-a2ee36a8922e',
        },
        regimenId: 'fn-cefepime',
      },
      {
        name: t('Меропенем', 'Meropenem'),
        dose: t(
          '1 г в/в кожні 8 год (інфузія 15–30 хв)',
          '1 g IV every 8 h (15–30-minute infusion)',
        ),
        source: {
          name: 'SmPC Meronem IV 1 g (emc, 03.2026), 4.1–4.2: febrile neutropenia',
          url: 'https://www.medicines.org.uk/emc/product/9834/smpc',
        },
        regimenId: 'fn-meropenem',
      },
      {
        name: t('Іміпенем/циластатин', 'Imipenem/cilastatin'),
        dose: t(
          '500 мг в/в кожні 6 год (інфузія 3 год, якщо можливо) або 1 г кожні 8 год (1 год); доза за іміпенемом',
          '500 mg IV every 6 h (a 3-hour infusion if feasible) or 1 g every 8 h (1 h); dosed as imipenem',
        ),
        source: IDSA_TABLE,
      },
    ],
  },
  {
    group: t(
      'Проти грампозитивних (MRSA, VRE) — лише за показаннями, див. п. 8',
      'Against Gram-positives (MRSA, VRE), only when indicated, see step 8',
    ),
    agents: [
      {
        name: t('Ванкоміцин', 'Vancomycin'),
        dose: t(
          '15–20 мг/кг кожні 8–12 год, не більше 2 г на введення; у тяжкому стані спершу 25–30 мг/кг; далі за рівнем у крові',
          '15–20 mg/kg every 8–12 h, no more than 2 g a dose; 25–30 mg/kg first when seriously ill; then by the blood level',
        ),
        source: {
          name: 'SmPC Vancomycin 1000 mg (hameln, emc, 19.01.2026), 4.2',
          url: 'https://www.medicines.org.uk/emc/product/15737/smpc',
        },
        regimenId: 'vancomycin',
      },
      {
        name: t('Тейкопланін', 'Teicoplanin'),
        dose: t(
          '6 мг/кг кожні 12 год × 3, далі 6 мг/кг 1 раз на добу; тяжкі інфекції — 12 мг/кг',
          '6 mg/kg every 12 h × 3, then 6 mg/kg once a day; severe infections 12 mg/kg',
        ),
        source: {
          name: 'SmPC Targocid (emc, 11.12.2025), 4.2',
          url: 'https://www.medicines.org.uk/emc/product/2926/smpc',
        },
        regimenId: 'teicoplanin',
      },
      {
        name: t('Лінезолід (MRSA, VRE)', 'Linezolid (MRSA, VRE)'),
        dose: t(
          '600 мг в/в чи перорально кожні 12 год, не довше 28 днів',
          '600 mg IV or orally every 12 h, no longer than 28 days',
        ),
        source: {
          name: 'SmPC Linezolid 2 mg/ml Solution for Infusion (emc), 4.2',
          url: 'https://www.medicines.org.uk/emc/product/7300/smpc',
        },
        regimenId: 'linezolid',
      },
      {
        name: t('Даптоміцин (не при пневмонії)', 'Daptomycin (not in pneumonia)'),
        dose: t(
          '4–6 мг/кг в/в 1 раз на добу; можна 10–12 мг/кг',
          '4–6 mg/kg IV once a day; 10–12 mg/kg may be considered',
        ),
        source: ECIL_TABLES,
      },
    ],
  },
  {
    group: t(
      'Додати до бета-лактаму: септичний шок, резистентні грамнегативні',
      'Added to a beta-lactam: septic shock, resistant Gram-negatives',
    ),
    agents: [
      {
        name: t('Амікацин', 'Amikacin'),
        dose: t(
          '7,5 мг/кг кожні 12 год (при нейтропенії — двічі на добу), не більше 1,5 г/добу. Розбіжність: IDSA 2026 — 15 мг/кг 1 раз на добу, далі за рівнем',
          '7.5 mg/kg every 12 h (twice daily in neutropenia), no more than 1.5 g a day. Discrepancy: IDSA 2026, 15 mg/kg once a day, then by level',
        ),
        source: {
          name: 'SmPC Amikacin 250 mg/ml (Hospira, emc, 03/2024), 4.2: febrile neutropenic patients',
          url: 'https://www.medicines.org.uk/emc/product/3784/smpc',
        },
        regimenId: 'amikacin-fn',
      },
      {
        name: t('Колістиметат натрію', 'Colistimethate sodium'),
        dose: t(
          'Навантажувальна 9 млн МО, далі 9 млн МО/добу у 2–3 введення',
          'A 9 MIU loading dose, then 9 MIU a day in 2–3 doses',
        ),
        source: {
          name: 'SmPC Colomycin 1 million IU (emc, 19.04.2023), 4.2',
          url: 'https://www.medicines.org.uk/emc/product/1094/smpc',
        },
        regimenId: 'colistimethate',
      },
    ],
  },
  {
    group: t(
      'Резервні — лише за чутливістю (дози IDSA 2026, інфузія 3 год)',
      'Reserve, by susceptibility only (IDSA 2026 doses, 3-hour infusion)',
    ),
    agents: [
      {
        name: t('Меропенем у високій дозі', 'High-dose meropenem'),
        dose: t(
          '1–2 г кожні 8 год, інфузія 3 год; 2 г — ожиріння, ЦНС. Розбіжність: інструкція для ФН — 1 г за 15–30 хв',
          '1–2 g every 8 h over 3 h; 2 g in obesity and CNS infection. Discrepancy: the FN label gives 1 g over 15–30 min',
        ),
        source: IDSA_TABLE,
      },
      {
        name: t('Цефтазидим/авібактам (Завіцефта)', 'Ceftazidime/avibactam (Zavicefta)'),
        dose: t('2,5 г кожні 8 год', '2.5 g every 8 h'),
        source: IDSA_TABLE,
      },
      {
        name: t('Азтреонам/авібактам (Емблавео)', 'Aztreonam/avibactam (Emblaveo)'),
        dose: t('2,67 г одноразово, далі 2 г кожні 6 год', '2.67 g once, then 2 g every 6 h'),
        source: IDSA_TABLE,
      },
      {
        name: t(
          'Цефтолозан/тазобактам — в Україні не зареєстрований',
          'Ceftolozane/tazobactam: not registered in Ukraine',
        ),
        dose: t('3 г кожні 8 год', '3 g every 8 h'),
        source: IDSA_TABLE,
      },
      {
        name: t(
          'Цефідерокол — в Україні не зареєстрований',
          'Cefiderocol: not registered in Ukraine',
        ),
        dose: t('2 г кожні 8 год', '2 g every 8 h'),
        source: IDSA_TABLE,
      },
      {
        name: t('Тигециклін', 'Tigecycline'),
        dose: t(
          'IDSA 2026: 200 мг, далі 100 мг кожні 12 год. Розбіжність: ECIL-4 — 100 мг, далі 50 мг кожні 12 год',
          'IDSA 2026: 200 mg, then 100 mg every 12 h. Discrepancy: ECIL-4, 100 mg then 50 mg every 12 h',
        ),
        source: IDSA_TABLE,
      },
    ],
  },
  {
    group: t('Амбулаторно (стандартний ризик)', 'Outpatient (standard risk)'),
    agents: [
      {
        name: t(
          'Амоксицилін/клавуланат + ципрофлоксацин',
          'Amoxicillin/clavulanate + ciprofloxacin',
        ),
        dose: null,
        source: null,
      },
      {
        name: t('Моксифлоксацин — альтернатива', 'Moxifloxacin as the alternative'),
        dose: null,
        source: null,
      },
    ],
  },
  {
    group: t('Емпірична протигрибкова терапія', 'Empirical antifungal therapy'),
    agents: [
      {
        name: t('Каспофунгін', 'Caspofungin'),
        dose: t(
          '70 мг в/в у день 1, далі 50 мг 1 раз на добу — до відновлення нейтрофілів',
          '70 mg IV on day 1, then 50 mg once a day, until neutrophil recovery',
        ),
        source: {
          name: 'FDA label: CANCIDAS (caspofungin), 2.2: empirical therapy in febrile neutropenic patients',
          url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=3bad23a6-09a6-4194-9182-093ed61bc71c',
        },
        regimenId: 'fn-caspofungin',
      },
      {
        name: t('Амфотерицин B ліпосомальний', 'Liposomal amphotericin B'),
        dose: t('3 мг/кг в/в 1 раз на добу', '3 mg/kg IV once a day'),
        source: {
          name: 'FDA label: AmBisome (amphotericin B liposome), Dosage: empirical therapy 3 mg/kg/day',
          url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=f7be6506-4d20-401e-a0ff-02ad7c33158a',
        },
        regimenId: 'fn-liposomal-amphotericin',
      },
      { name: t('Мікафунгін', 'Micafungin'), dose: null, source: null },
    ],
  },
  {
    group: t('Документовані грибкові інфекції, PcP', 'Documented fungal infection, PcP'),
    agents: [
      {
        name: t('Вориконазол', 'Voriconazole'),
        dose: t(
          'Таблетки: 400 мг кожні 12 год першу добу, далі 200 мг двічі (≥ 40 кг); в/в — 6 мг/кг, далі 4 мг/кг кожні 12 год',
          'Tablets: 400 mg every 12 h on day 1, then 200 mg twice (≥ 40 kg); IV, 6 mg/kg then 4 mg/kg every 12 h',
        ),
        source: {
          name: 'SmPC Voriconazole Pfizer (emc, 07/2026), 4.2',
          url: 'https://www.medicines.org.uk/emc/product/7325/smpc',
        },
        regimenId: 'voriconazole-oral',
      },
      {
        name: t('Ко-тримоксазол (PcP, S. maltophilia)', 'Co-trimoxazole (PcP, S. maltophilia)'),
        dose: t(
          'Триметоприм 15–20 мг/кг + сульфаметоксазол 75–100 мг/кг на добу у 2 чи більше введення, 2 тижні',
          'Trimethoprim 15–20 mg/kg + sulfamethoxazole 75–100 mg/kg a day in 2 or more doses, 2 weeks',
        ),
        source: {
          name: 'SmPC Co-Trimoxazole 16 mg/80 mg per ml Solution for Infusion (emc, 16.09.2026), 4.2',
          url: 'https://www.medicines.org.uk/emc/product/102621/smpc',
        },
        regimenId: 'co-trimoxazole-pcp',
      },
    ],
  },
]

/** The catalog page whose tree holds the calculated courses; shown in this tab, not in the list. */
export const FEBRILE_NEUTROPENIA_DISEASE = 'febrile-neutropenia'
