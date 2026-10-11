/**
 * What comes after the first empirical line: fever with negative cultures, when a combination is
 * worth it and when it is not, documented infections by site, and resistant pathogens. Read in
 * full on 2026-10-11 from ECIL-4 (empirical and targeted, figures and tables), the AGIHO guidelines
 * on sepsis, catheter infections, lung infiltrates and gastrointestinal complications, ESCMID 2021
 * on C. difficile and the IDSA 2026 guidance on resistant Gram-negatives; then compared with UpToDate
 * (ECIL-10, which replaces ECIL-4, known only by its summary). The wording is ours; the
 * branches and grades are the guidelines'. Where two of them disagree, the step says so.
 */

import type { Text2 } from '../irradiated/indications'
import type { Stage } from './algorithm'

const t = (uk: string, en: string): Text2 => ({ uk, en })

export const ECIL4_EMPIRICAL = {
  name: 'Averbuch D et al. European guidelines for empirical antibacterial therapy for febrile neutropenic patients in the era of growing resistance: ECIL-4. Haematologica 2013;98:1826–35',
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3856957/',
}
export const ECIL4_TARGETED = {
  name: 'Averbuch D et al. Targeted therapy against multi-resistant bacteria in leukemic and HSCT recipients: ECIL-4. Haematologica 2013;98:1836–47',
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3856958/',
}
export const AGIHO_SEPSIS = {
  name: 'Kochanek M et al. Management of sepsis in neutropenic cancer patients: 2018 guidelines from AGIHO and iCHOP. Ann Hematol 2019;98:1051–69',
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6469653/',
}
export const AGIHO_CATHETER = {
  name: 'Böll B et al. Central venous catheter-related infections in hematology and oncology: 2020 updated AGIHO guidelines. Ann Hematol 2021;100:239–59',
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7782365/',
}
export const AGIHO_LUNG = {
  name: 'Maschmeyer G et al. Diagnosis and antimicrobial therapy of lung infiltrates in febrile neutropenic patients (allogeneic SCT excluded): AGIHO. Ann Oncol 2015;26:21–33',
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4269340/',
}
export const AGIHO_GI = {
  name: 'Schmidt-Hieber M et al. Diagnosis and management of gastrointestinal complications in adult cancer patients: 2017 AGIHO guidelines. Ann Hematol 2018;97:31–49',
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5748412/',
}
export const ESCMID_CDI = {
  name: 'van Prehn J et al. ESCMID 2021 update on the treatment guidance document for Clostridioides difficile infection in adults. Clin Microbiol Infect 2021;27 Suppl 2:S1–21',
  url: 'https://elibrary.escmid.org/download/16382185018656_66.pdf',
}
export const IDSA_AMR = {
  name: 'IDSA 2026 Guidance on the Treatment of Antimicrobial-Resistant Gram-Negative Infections, v4.0 (30.07.2026)',
  url: 'https://www.idsociety.org/practice-guideline/amr-guidance/',
}

export const UPTODATE_FN = {
  name: 'UpToDate: Wingard JR. Treatment of neutropenic fever syndromes in adults with hematologic malignancies and HCT recipients (high-risk patients), topic 1400 v73, оновл. 12.03.2026',
  url: 'https://www.uptodate.com/contents/treatment-of-neutropenic-fever-syndromes-in-adults-with-hematologic-malignancies-and-hematopoietic-cell-transplant-recipients-high-risk-patients',
}
export const UPTODATE_CDI = {
  name: 'UpToDate: Clostridioides difficile infection in adults: Treatment and prevention (key points, 2026)',
  url: 'https://www.uptodate.com/contents/clostridioides-difficile-infection-in-adults-treatment-and-prevention',
}
export const ECIL10 = {
  name: 'Averbuch D et al. Empirical and targeted antimicrobial therapy in febrile neutropenia: ECIL-10. Lancet Infect Dis 2026;26:e232–47 (переглянуто лише резюме)',
  url: 'https://doi.org/10.1016/S1473-3099(25)00619-X',
}

export const NEGATIVE_CULTURES: Stage = {
  id: 'negative-cultures',
  title: t(
    '7. Гарячка триває, посіви негативні: наступний крок',
    '7. Fever goes on, cultures negative: the next step',
  ),
  steps: [
    {
      text: t(
        'Стабільний хворий: сама гарячка не є причиною розширювати антибіотики. Продовжувати пошук: повторні гемокультури й посіви з будь-якого вогнища, галактоманан або β-D-глюкан, КТ легень, далі — черева, пазух, головного мозку; шукати гриби й віруси',
        'A stable patient: fever alone is no reason to broaden the antibiotics. Keep searching: repeat blood cultures and cultures from any focus, galactomannan or β-D-glucan, lung CT, then abdomen, sinuses and brain; look for fungi and viruses',
      ),
      grade: 'BII',
    },
    {
      text: t(
        'Погіршення на ескалаційній схемі (піперацилін/тазобактам, цефепім): думати про резистентні грамнегативні — перейти на карбапенем ± аміноглікозид, хінолон чи колістин',
        'Deterioration on an escalation regimen (piperacillin/tazobactam, cefepime): think of resistant Gram-negatives — switch to a carbapenem ± an aminoglycoside, a quinolone or colistin',
      ),
      grade: 'BII',
    },
    {
      text: t(
        'При погіршенні — також резистентні грампозитивні (додати відповідний засіб, якщо стартували з цефалоспорину III покоління) і грибкові, вірусні чи інші причини',
        'On deterioration, also resistant Gram-positives (add an agent if the start was a 3rd-generation cephalosporin) and fungal, viral or other causes',
      ),
      grade: 'BII',
    },
    {
      text: t(
        'Погіршення на деескалаційній схемі (карбапенем, комбінація): залежно від анамнезу й колонізації — додати колістин чи інший засіб проти грамнегативних; грампозитивні — при клінічно документованій інфекції',
        'Deterioration on a de-escalation regimen (carbapenem, combination): depending on the history and colonisation, add colistin or another anti-Gram-negative agent; Gram-positives with a clinically documented infection',
      ),
      grade: 'BIII',
    },
    {
      text: t(
        'Початково тяжкий стан (септичний шок), що стабілізувався, — схему не змінювати навіть за негативних посівів',
        'Severely ill at presentation (septic shock) and now stable: keep the regimen even with negative cultures',
      ),
      grade: 'BIII',
    },
    {
      text: t(
        'Деескалаційна схема через колонізацію, стан стабільний: відмінити аміноглікозид, хінолон, колістин чи засіб проти грампозитивних; карбапенем при гарячці невідомого походження — замінити вужчим (цефепім, піперацилін/тазобактам)',
        'De-escalation for colonisation, the patient stable: stop the aminoglycoside, quinolone, colistin or anti-Gram-positive agent; a carbapenem in fever of unknown origin — switch to a narrower agent (cefepime, piperacillin/tazobactam)',
      ),
      grade: 'BIII',
    },
    {
      text: t(
        'Через 72–96 год без гарячки щонайменше 48 год і зі стабільною гемодинамікою від початку — антибіотики можна відмінити незалежно від нейтрофілів; ще 24–48 год спостереження в стаціонарі',
        'After 72–96 h, afebrile for at least 48 h and haemodynamically stable since presentation: the antibiotics may stop whatever the neutrophils; 24–48 h more of observation in hospital',
      ),
      grade: 'BII',
    },
    {
      text: t(
        'Високий ризик без протигрибкової профілактики і гарячка понад 72–96 год — протиплісеневий антимікотик (див. п. 5); легеневі інфільтрати, нетипові для PcP чи лобарної пневмонії, — вориконазол або ліпосомальний амфотерицин B',
        'High risk without antifungal prophylaxis and fever beyond 72–96 h: a mould-active antifungal (see step 5); lung infiltrates not typical of PcP or lobar pneumonia: voriconazole or liposomal amphotericin B',
      ),
      grade: 'A-II',
    },
  ],
  sources: [ECIL4_EMPIRICAL, AGIHO_LUNG],
}

export const COMBINATIONS: Stage = {
  id: 'combinations',
  title: t('8. Комбінації: коли виправдані, а коли ні', '8. Combinations: when they are worth it'),
  steps: [
    {
      text: t(
        'Карбапенем першою лінією: септичний шок; колонізація чи попередня інфекція ESBL-E або грамнегативними, резистентними до вужчих бета-лактамів; відділення з високою частотою ESBL',
        'A carbapenem first line: septic shock; colonisation or a previous infection with ESBL-E or Gram-negatives resistant to narrower beta-lactams; a unit where ESBL is frequent',
      ),
      grade: 'BII',
    },
    {
      text: t(
        'Бета-лактам + аміноглікозид першою лінією: тяжкий сепсис чи септичний шок; ймовірна резистентна синьогнійна паличка чи ацинетобактер (місцева епідеміологія, колонізація, карбапенем за останній місяць). Аміноглікозид відмінити, щойно стан стабілізувався або збудник чутливий до бета-лактаму',
        'A beta-lactam + an aminoglycoside first line: severe sepsis or septic shock; a likely resistant Pseudomonas or Acinetobacter (local epidemiology, colonisation, a carbapenem in the past month). Stop the aminoglycoside once stable or the pathogen is beta-lactam-susceptible',
      ),
      grade: 'BIII',
    },
    {
      text: t(
        'Засіб проти резистентних грампозитивних (ванкоміцин, тейкопланін, лінезолід) на старті — лише при нестабільності чи пневмонії, колонізації MRSA чи VRE, підозрі на тяжку катетерну інфекцію (озноб під час інфузії через катетер, целюліт навколо виходу) або інфекції шкіри й м’яких тканин',
        'An agent against resistant Gram-positives (vancomycin, teicoplanin, linezolid) at the start only with instability or pneumonia, MRSA or VRE colonisation, a suspected serious catheter infection (rigors with infusion through the line, cellulitis at the exit site) or a skin and soft-tissue infection',
      ),
      grade: 'CIII',
    },
    {
      text: t(
        'Синьогнійна пневмонія: бета-лактам + аміноглікозид, якщо місцева чутливість до бета-лактамів недостатня; без аміноглікозиду — бета-лактам + ципрофлоксацин; адекватна монотерапія бета-лактамом теж прийнятна',
        'Pseudomonas pneumonia: a beta-lactam + an aminoglycoside when local beta-lactam susceptibility is poor; without an aminoglycoside, a beta-lactam + ciprofloxacin; adequate beta-lactam monotherapy is acceptable too',
      ),
      grade: 'B-II',
    },
    {
      text: t(
        'Колістин, тигециклін, фосфоміцин, аміноглікозиди проти карбапенем-резистентних — переважно в комбінації з іншим активним in vitro засобом (ECIL-4)',
        'Colistin, tigecycline, fosfomycin and aminoglycosides against carbapenem-resistant organisms preferably combined with another agent active in vitro (ECIL-4)',
      ),
    },
    {
      text: t(
        'Розбіжність: IDSA 2026 не радить рутинної комбінації при CRE та при синьогнійній з утрудненою резистентністю, якщо підтверджено чутливість до нового бета-лактаму (цефтазидим/авібактам, цефтолозан/тазобактам тощо); комбінація потрібна при карбапенем-резистентному ацинетобактері',
        'Discrepancy: IDSA 2026 advises no routine combination for CRE or difficult-to-treat Pseudomonas once susceptibility to a new beta-lactam is confirmed (ceftazidime/avibactam, ceftolozane/tazobactam and the like); a combination is needed for carbapenem-resistant Acinetobacter',
      ),
    },
    {
      text: t(
        'Не призначати: глікопептид емпірично при катетерній інфекції (DI) чи при легеневих інфільтратах без збудника (D-III); аміноглікозид чи флуцитозин до інфільтратів без мікробіологічного показання (E-I); даптоміцин при пневмонії — інактивується сурфактантом (E-I); метронідазол при тяжкому C. difficile (DI)',
        'Do not give: an empirical glycopeptide for a catheter infection (DI) or for lung infiltrates without a pathogen (D-III); an aminoglycoside or flucytosine added for infiltrates without a microbiological reason (E-I); daptomycin for pneumonia — surfactant inactivates it (E-I); metronidazole in severe C. difficile (DI)',
      ),
    },
    {
      text: t(
        'IDSA 2026: піперацилін/тазобактам і цефепім — не для ESBL-E поза сечовими шляхами навіть за чутливості; піперацилін/тазобактам — не для інвазивних AmpC-ентеробактерій; тигециклін при CRE — не для бактеріємії та сечової інфекції',
        'IDSA 2026: piperacillin/tazobactam and cefepime not for ESBL-E outside the urinary tract even when susceptible; piperacillin/tazobactam not for invasive AmpC Enterobacterales; tigecycline for CRE not in bacteraemia or urinary infection',
      ),
    },
  ],
  sources: [ECIL4_EMPIRICAL, AGIHO_SEPSIS, AGIHO_LUNG, AGIHO_CATHETER, IDSA_AMR],
}

export const BY_SITE: Stage = {
  id: 'by-site',
  title: t('9. Документовані інфекції за локалізацією', '9. Documented infections by site'),
  steps: [
    {
      text: t(
        'Сепсис і септичний шок: антисиньогнійний бета-лактам негайно, у першу годину (AIIrt) — піперацилін/тазобактам, меропенем або іміпенем (AIII); при шоці можна додати аміноглікозид (BIII). Видалити, по змозі, всі судинні катетери при підозрі на їх інфекцію (AIIt); контроль вогнища якнайшвидше. Антимікотик — при чинниках ризику грибкової інфекції',
        'Sepsis and septic shock: an antipseudomonal beta-lactam at once, within the first hour (AIIrt) — piperacillin/tazobactam, meropenem or imipenem (AIII); an aminoglycoside may be added in shock (BIII). Remove, if possible, every vascular line suspected of infection (AIIt); source control as soon as possible. An antifungal with risk factors for fungal infection',
      ),
    },
    {
      text: t(
        'Катетерна інфекція: видалити катетер, коли можливо (AIIt); обов’язково — при S. aureus і Candida (AIIt), тунельній чи кишеньковій інфекції (BIII), за 48–72 год — при грамнегативних (BIIt). Спробувати зберегти можна при коагулазонегативних стафілококах у стабільного хворого (BIIt). Тривалість ≥ 7 днів від першого стерильного посіву; при імуносупресії — щонайменше 2 тижні',
        'Catheter infection: remove the line whenever possible (AIIt); always with S. aureus and Candida (AIIt), a tunnel or pocket infection (BIII), within 48–72 h with Gram-negatives (BIIt). The line may be kept at first with coagulase-negative staphylococci in a stable patient (BIIt). At least 7 days from the first sterile culture; in immunosuppression at least 2 weeks',
      ),
    },
    {
      text: t(
        'Катетерна інфекція за збудником: MSSA — антистафілококовий пеніцилін ≥ 2 тижні; MRSA — глікопептид, лінезолід чи даптоміцин ≥ 2 тижні (4–6 тижнів при ускладненні); коагулазонегативні — за чутливістю, глікопептид лише при метицилін-резистентності; ентерокок — амінопеніцилін, при резистентності — глікопептид + аміноглікозид, при VRE — лінезолід; S. maltophilia — ко-тримоксазол ≥ 2 тижні; Candida — ехінокандин чи ліпосомальний амфотерицин B, після стабілізації — флуконазол, ≥ 2 тижні',
        'Catheter infection by pathogen: MSSA, an antistaphylococcal penicillin ≥ 2 weeks; MRSA, a glycopeptide, linezolid or daptomycin ≥ 2 weeks (4–6 weeks if complicated); coagulase-negative, by susceptibility, a glycopeptide only with methicillin resistance; enterococcus, an aminopenicillin, if resistant a glycopeptide + an aminoglycoside, VRE linezolid; S. maltophilia, co-trimoxazole ≥ 2 weeks; Candida, an echinocandin or liposomal amphotericin B, after stabilisation fluconazole, ≥ 2 weeks',
      ),
    },
    {
      text: t(
        'Легеневі інфільтрати в глибокій нейтропенії: антисиньогнійний бета-лактам з покриттям стрептококів (A-II) + протиплісеневий засіб, якщо картина нетипова для PcP чи лобарної пневмонії (A-II): вориконазол в/в 6 мг/кг кожні 12 год у день 1, далі 4 мг/кг, або ліпосомальний амфотерицин B 3 мг/кг; при мукормікозі — амфотерицин ≥ 5 мг/кг. На тлі профілактики вориконазолом чи позаконазолом — ліпосомальний амфотерицин B (C-III). Контрольна КТ — не раніше ніж за 7 днів',
        'Lung infiltrates in deep neutropenia: an antipseudomonal beta-lactam covering streptococci (A-II) + a mould-active agent when the picture is not typical of PcP or lobar pneumonia (A-II): IV voriconazole 6 mg/kg every 12 h on day 1, then 4 mg/kg, or liposomal amphotericin B 3 mg/kg; mucormycosis, amphotericin ≥ 5 mg/kg. On voriconazole or posaconazole prophylaxis, liposomal amphotericin B (C-III). Follow-up CT no sooner than 7 days',
      ),
    },
    {
      text: t(
        'Пневмоцистна пневмонія: при підозрі за КТ і зростанні ЛДГ — лікувати ще до бронхоскопії (B-II): ко-тримоксазол ТМП 15–20 мг/кг + СМК 75–100 мг/кг на добу (A-II), щонайменше 2 тижні, далі вторинна профілактика. Альтернатива — кліндаміцин 600 мг 4 рази чи 900 мг 3 рази в/в + примахін 30 мг (перед тим виключити дефіцит Г-6-ФД)',
        'Pneumocystis pneumonia: when suspected on CT with a rising LDH, treat before bronchoscopy (B-II): co-trimoxazole TMP 15–20 mg/kg + SMX 75–100 mg/kg a day (A-II), at least 2 weeks, then secondary prophylaxis. The alternative is clindamycin 600 mg four times or 900 mg three times IV + primaquine 30 mg (rule out G6PD deficiency first)',
      ),
    },
    {
      text: t(
        'MRSA-пневмонія — ванкоміцин, якщо немає тяжкої ниркової недостатності (B-II); лінезолід — альтернатива (B-II), але тромбоцитопенія. S. maltophilia-пневмонія — ко-тримоксазол у дозі як при PcP (A-II)',
        'MRSA pneumonia: vancomycin unless renal failure is severe (B-II); linezolid is the alternative (B-II), but thrombocytopenia. S. maltophilia pneumonia: co-trimoxazole at the PcP dose (A-II)',
      ),
    },
    {
      text: t(
        'Нейтропенічний ентероколіт: консервативно — щадна дієта, гідратація, знеболення (BIII); піперацилін/тазобактам, іміпенем/циластатин або меропенем (BIII). Посіви крові, калу і токсин C. difficile; ендоскопія протипоказана через ризик перфорації',
        'Neutropenic enterocolitis: conservative — a bland diet, fluids, pain relief (BIII); piperacillin/tazobactam, imipenem/cilastatin or meropenem (BIII). Blood and stool cultures and C. difficile toxin; endoscopy is discouraged for the risk of perforation',
      ),
    },
    {
      text: t(
        'C. difficile (ESCMID 2021): фідаксоміцин 200 мг двічі на добу 10 днів; якщо недоступний — ванкоміцин 125 мг перорально 4 рази на добу 10 днів (можна вміст флакона для в/в); метронідазол 500 мг 3 рази — лише коли обидва недоступні і не при тяжкому перебігу. Ванкоміцин 500 мг 4 рази не рекомендовано. Рутинно додавати в/в метронідазол до перорального лікування тяжкого CDI не радять; якщо перорально неможливо — ванкоміцин чи фідаксоміцин у просвіт кишки і, можливо, в/в метронідазол 500 мг 3 рази на добу (слабка рекомендація). Розбіжність: AGIHO 2017 ще допускала метронідазол як рівноцінний варіант; UpToDate при фульмінантному перебігу радить ванкоміцин 500 мг 4 рази + в/в метронідазол (див. п. 11). Фідаксоміцин в Україні не зареєстрований',
        'C. difficile (ESCMID 2021): fidaxomicin 200 mg twice daily for 10 days; if unavailable, oral vancomycin 125 mg four times daily for 10 days (the IV vial may be used); metronidazole 500 mg three times only when both are unavailable and never in severe disease. Vancomycin 500 mg four times is not recommended. IV metronidazole is not added routinely to oral treatment of severe CDI; when oral is impossible, intraluminal vancomycin or fidaxomicin and possibly IV metronidazole 500 mg three times daily (weak recommendation). Discrepancy: AGIHO 2017 still allowed metronidazole as an equal option; for fulminant disease UpToDate advises vancomycin 500 mg four times + IV metronidazole (see step 11). Fidaxomicin is not registered in Ukraine',
      ),
    },
  ],
  sources: [AGIHO_SEPSIS, AGIHO_CATHETER, AGIHO_LUNG, AGIHO_GI, ESCMID_CDI],
}

export const RESISTANT: Stage = {
  id: 'resistant',
  title: t(
    '10. Резистентні збудники: цільова терапія за чутливістю',
    '10. Resistant pathogens: targeted therapy by susceptibility',
  ),
  steps: [
    {
      text: t(
        'Загальне правило: лікувати виділений збудник найвужчим активним засобом за антибіотикограмою (AI); пеніциліни з інгібітором — перевага над цефалоспоринами й карбапенемами за однакової активності (BII). Щонайменше 7 днів, без гарячки ≥ 4 дні (BIII)',
        'The rule: treat the isolated pathogen with the narrowest active agent by susceptibility (AI); a penicillin with an inhibitor over a cephalosporin or carbapenem at equal activity (BII). At least 7 days, afebrile for ≥ 4 days (BIII)',
      ),
    },
    {
      text: t(
        'ESBL-E поза сечовими шляхами — карбапенем (меропенем, іміпенем; ертапенем — не в критичному стані). Після відповіді — перорально ципрофлоксацин, левофлоксацин чи ко-тримоксазол за чутливістю',
        'ESBL-E outside the urinary tract: a carbapenem (meropenem, imipenem; ertapenem not in the critically ill). After a response, oral ciprofloxacin, levofloxacin or co-trimoxazole by susceptibility',
      ),
    },
    {
      text: t(
        'AmpC-ентеробактерії (E. cloacae, K. aerogenes, C. freundii) — цефепім, якщо МІК ≤ 8; не цефтріаксон і не піперацилін/тазобактам при інвазивній інфекції',
        'AmpC Enterobacterales (E. cloacae, K. aerogenes, C. freundii): cefepime if the MIC is ≤ 8; not ceftriaxone and not piperacillin/tazobactam in invasive infection',
      ),
    },
    {
      text: t(
        'CRE: KPC — цефтазидим/авібактам (в Україні — Завіцефта), меропенем/ваборбактам, іміпенем/релебактам; OXA-48 — цефтазидим/авібактам; NDM — азтреонам/авібактам (в Україні — Емблавео) або цефтазидим/авібактам + азтреонам, цефідерокол. Тому визначати тип карбапенемази',
        'CRE: KPC — ceftazidime/avibactam (Zavicefta in Ukraine), meropenem/vaborbactam, imipenem/relebactam; OXA-48 — ceftazidime/avibactam; NDM — aztreonam/avibactam (Emblaveo in Ukraine) or ceftazidime/avibactam + aztreonam, cefiderocol. So the carbapenemase type is worth knowing',
      ),
    },
    {
      text: t(
        'Синьогнійна з утрудненою резистентністю: цефтолозан/тазобактам (перевага при пневмонії), цефтазидим/авібактам, іміпенем/релебактам; цефідерокол — альтернатива. Якщо чутлива до звичайних бета-лактамів — вони кращі за карбапенем, у високій дозі й подовженою інфузією',
        'Difficult-to-treat Pseudomonas: ceftolozane/tazobactam (preferred in pneumonia), ceftazidime/avibactam, imipenem/relebactam; cefiderocol the alternative. If susceptible to the usual beta-lactams, they beat a carbapenem, at a high dose and by extended infusion',
      ),
    },
    {
      text: t(
        'Карбапенем-резистентний ацинетобактер: сульбактам/дурлобактам + карбапенем; без нього тимчасово — високі дози ампіциліну/сульбактаму + ще один засіб (цефідерокол, колістин). ECIL-4 (2013): колістин чи тигециклін, переважно в комбінації',
        'Carbapenem-resistant Acinetobacter: sulbactam/durlobactam + a carbapenem; meanwhile, high-dose ampicillin/sulbactam + another agent (cefiderocol, colistin). ECIL-4 (2013): colistin or tigecycline, preferably in combination',
      ),
    },
    {
      text: t(
        'S. maltophilia — розбіжність: ECIL-4 — ко-тримоксазол (AI), фторхінолон (BII); IDSA 2026 — перевага цефідероколу, а ко-тримоксазол, левофлоксацин, міноциклін — лише в комбінації',
        'S. maltophilia — discrepancy: ECIL-4, co-trimoxazole (AI), a fluoroquinolone (BII); IDSA 2026 prefers cefiderocol, with co-trimoxazole, levofloxacin or minocycline only in combination',
      ),
    },
    {
      text: t(
        'VRE — лінезолід (AII); E. faecalis — також даптоміцин (BII). MRSA зі зниженою чутливістю до ванкоміцину — лінезолід (AII), даптоміцин (BII, не при пневмонії)',
        'VRE: linezolid (AII); E. faecalis, daptomycin too (BII). MRSA with reduced vancomycin susceptibility: linezolid (AII), daptomycin (BII, not in pneumonia)',
      ),
    },
    {
      text: t(
        'В Україні зареєстровані: цефтазидим/авібактам, азтреонам/авібактам, азтреонам, тигециклін, даптоміцин, фосфоміцин, іміпенем/циластатин. Не зареєстровані: цефтолозан/тазобактам, цефідерокол, меропенем/ваборбактам, іміпенем/релебактам, сульбактам/дурлобактам, фідаксоміцин (Держреєстр, вивантаження data.gov.ua)',
        'Registered in Ukraine: ceftazidime/avibactam, aztreonam/avibactam, aztreonam, tigecycline, daptomycin, fosfomycin, imipenem/cilastatin. Not registered: ceftolozane/tazobactam, cefiderocol, meropenem/vaborbactam, imipenem/relebactam, sulbactam/durlobactam, fidaxomicin (State Register, data.gov.ua export)',
      ),
    },
  ],
  sources: [ECIL4_TARGETED, IDSA_AMR],
}

export const UPTODATE_COMPARISON: Stage = {
  id: 'uptodate',
  title: t(
    '11. Звірка з UpToDate: що збігається і що інакше',
    '11. Checked against UpToDate: what agrees and what differs',
  ),
  steps: [
    {
      text: t(
        'Перша лінія та сама: монотерапія піперациліном/тазобактамом, цефепімом, меропенемом чи іміпенемом (1B). Цефтазидим більшість центрів уже не застосовує через резистентність. Меропенем 1–2 г кожні 8 год (2 г — за ризику резистентних грамнегативних); піперацилін/тазобактам 4,5 г кожні 6–8 год, кожні 6 год — за підозри на синьогнійну. Подовжена інфузія — у тяжкому стані чи за ризику резистентних',
        'The first line is the same: piperacillin/tazobactam, cefepime, meropenem or imipenem alone (1B). Most centres no longer use ceftazidime because of resistance. Meropenem 1–2 g every 8 h (2 g with a risk of resistant Gram-negatives); piperacillin/tazobactam 4.5 g every 6–8 h, every 6 h if Pseudomonas is suspected. Extended infusion when seriously ill or at risk of resistant organisms',
      ),
      grade: '1B',
    },
    {
      text: t(
        'Анаеробне покриття (метронідазол до цефепіму) — лише за некротичного мукозиту, синуситу, періодонтального чи перианального целюліту, інтраабдомінальної інфекції (і нейтропенічного ентероколіту), тазової інфекції чи анаеробної бактеріємії',
        'Anaerobic cover (metronidazole with cefepime) only with necrotising mucositis, sinusitis, periodontal or perianal cellulitis, an intra-abdominal infection (neutropenic enterocolitis included), a pelvic infection or anaerobic bacteraemia',
      ),
    },
    {
      text: t(
        'Ванкоміцин рутинно не додавати (1A). Крім показань п. 8 — також грампозитивні коки в гемокультурі до ідентифікації і тяжкий мукозит на фторхінолоновій профілактиці, якщо стартували з цефтазидиму. Відмінити через 2–3 доби, якщо грампозитивну інфекцію не підтверджено. Ванкоміцин + піперацилін/тазобактам частіше уражають нирки: за потреби ванкоміцину краще цефепім, інакше — контроль креатиніну',
        'Do not add vancomycin routinely (1A). Besides the indications of step 8, also Gram-positive cocci in blood culture before identification and severe mucositis on fluoroquinolone prophylaxis when started on ceftazidime. Stop after 2–3 days if no Gram-positive infection is confirmed. Vancomycin with piperacillin/tazobactam injures the kidneys more often: when vancomycin is needed, prefer cefepime, otherwise watch creatinine',
      ),
      grade: '1A',
    },
    {
      text: t(
        'Алергія на пеніцилін: цефепім чи карбапенем зазвичай можна, інколи з тест-дозою. За тяжкої сповільненої реакції (синдром Стівенса–Джонсона, ТЕН, DRESS) — азтреонам + ванкоміцин (перевага) або ципрофлоксацин + кліндаміцин; фторхінолон — не після фторхінолонової профілактики',
        'Penicillin allergy: cefepime or a carbapenem is usually possible, sometimes with a test dose. After a severe delayed reaction (Stevens–Johnson syndrome, TEN, DRESS): aztreonam + vancomycin (preferred) or ciprofloxacin + clindamycin; no fluoroquinolone after fluoroquinolone prophylaxis',
      ),
    },
    {
      text: t(
        'Без вогнища і з негативними посівами UpToDate радить: після ≥ 72 год без гарячки і з клінічним покращенням відмінити емпіричні антибіотики незалежно від нейтрофілів і повернути пероральну профілактику фторхінолоном до відновлення нейтрофілів (загалом 7–8 днів в/в). Розбіжність: AGIHO — відміна після 3–5 днів без гарячки; ECIL — після ≥ 72 год терапії і ≥ 48 год без гарячки; IDSA 2010 — до нейтрофілів ≥ 500/мкл',
        'With no source and negative cultures UpToDate advises: after ≥ 72 h afebrile with clinical improvement, stop the empirical antibiotics whatever the neutrophils and resume oral fluoroquinolone prophylaxis until recovery (7–8 days IV in all). Discrepancy: AGIHO, stop after 3–5 afebrile days; ECIL, after ≥ 72 h of therapy and ≥ 48 h afebrile; IDSA 2010, until neutrophils ≥ 500/µL',
      ),
    },
    {
      text: t(
        'Документована інфекція: не коротше стандартного курсу для неї (бактеріємія 7–14 днів, довше при S. aureus чи ентероколіті) і щонайменше до нейтрофілів ≥ 500/мкл. Стабільного хворого з негативними повторними посівами ≥ 48 год можна перевести на пероральні, якщо дозволяє чутливість',
        'Documented infection: no shorter than its standard course (bacteraemia 7–14 days, longer with S. aureus or enterocolitis) and at least until neutrophils ≥ 500/µL. A stable patient with repeat cultures negative for ≥ 48 h may switch to oral drugs if susceptibility allows',
      ),
    },
    {
      text: t(
        'Катетер видаляти (1B): крім S. aureus і Candida, також при P. aeruginosa і швидкоростучих нетуберкульозних мікобактеріях, при інших грибах (1C), септичному тромбозі, ендокардиті, нестабільності, бактеріємії понад 72 год на адекватній терапії. Антибіотики ≥ 14 днів від видалення і стерильних посівів, 4–6 тижнів — при ускладненні. Розбіжність: AGIHO при грамнегативних — видалення за 48–72 год, синьогнійну окремо не виділяє',
        'Remove the line (1B): besides S. aureus and Candida, also with P. aeruginosa and rapidly growing non-tuberculous mycobacteria, other fungi (1C), septic thrombosis, endocarditis, instability, bacteraemia beyond 72 h on adequate therapy. Antibiotics ≥ 14 days from removal and sterile cultures, 4–6 weeks if complicated. Discrepancy: AGIHO, removal within 48–72 h for Gram-negatives, Pseudomonas not singled out',
      ),
      grade: '1B',
    },
    {
      text: t(
        'Емпіричний антимікотик — через 4–7 днів стійкої гарячки (1C); розбіжність: AGIHO — після 72–96 год. Без профілактики і без вогнищ у легенях — ехінокандин; вузли чи інфільтрати — протиплісеневий азол (вориконазол, позаконазол, ізавуконазол) або ліпідний амфотерицин B; на протиплісеневій профілактиці — інший клас (після вориконазолу чи позаконазолу — амфотерицин B) і рівень азолу в крові. На мукормікоз вориконазол не діє',
        'Empirical antifungal after 4–7 days of persistent fever (1C); discrepancy: AGIHO, after 72–96 h. No prophylaxis and no lung lesions: an echinocandin; nodules or infiltrates: a mould-active azole (voriconazole, posaconazole, isavuconazole) or lipid amphotericin B; on mould-active prophylaxis: another class (amphotericin B after voriconazole or posaconazole) and an azole blood level. Voriconazole does not act on mucormycosis',
      ),
      grade: '1C',
    },
    {
      text: t(
        'Дози UpToDate для антимікотиків: мікафунгін 100 мг 1 раз на добу; анідулафунгін 200 мг у день 1, далі 100 мг; ізавуконазол 200 мг кожні 8 год у дні 1–2, далі 200 мг 1 раз; позаконазол 300 мг двічі в день 1, далі 300 мг 1 раз; ліпосомальний амфотерицин B 3–5 мг/кг (в інструкції для емпіричної терапії — 3 мг/кг)',
        'UpToDate antifungal doses: micafungin 100 mg once a day; anidulafungin 200 mg on day 1, then 100 mg; isavuconazole 200 mg every 8 h on days 1–2, then 200 mg once; posaconazole 300 mg twice on day 1, then 300 mg once; liposomal amphotericin B 3–5 mg/kg (the label for empirical therapy, 3 mg/kg)',
      ),
    },
    {
      text: t(
        'Г-КСФ при вже наявній фебрильній нейтропенії UpToDate і IDSA не застосовують; ASCO і NCCN дозволяють розглянути за високого ризику ускладнень',
        'UpToDate and IDSA do not use G-CSF for established febrile neutropenia; ASCO and NCCN allow it to be considered at high risk of complications',
      ),
    },
    {
      text: t(
        'Фульмінантний C. difficile (гіпотензія чи шок, ілеус, мегаколон): UpToDate — ванкоміцин 500 мг 4 рази на добу перорально чи через зонд + метронідазол в/в 500 мг кожні 8 год (2C), при ілеусі — ще ванкоміцин ректально; фідаксоміцин — ні. Розбіжність з ESCMID 2021, яка не радить ванкоміцин 500 мг і рутинний в/в метронідазол (див. п. 9)',
        'Fulminant C. difficile (hypotension or shock, ileus, megacolon): UpToDate, vancomycin 500 mg four times a day orally or by tube + IV metronidazole 500 mg every 8 h (2C), with ileus also rectal vancomycin; no fidaxomicin. Discrepancy with ESCMID 2021, which advises against vancomycin 500 mg and routine IV metronidazole (see step 9)',
      ),
      grade: '2C',
    },
    {
      text: t(
        'UpToDate посилається на нові настанови ECIL-10 (2026), що замінюють ECIL-4 (п. 7–10). За резюме: стабільним без колонізації резистентними грамнегативними в регіонах з низькою резистентністю — монотерапія без карбапенему; у критичному стані, з колонізацією чи в регіоні з високою резистентністю — ширше (бета-лактам + аміноглікозид, карбапенем ± інгібітор бета-лактамаз, антисиньогнійний цефалоспорин з інгібітором, цефідерокол); деескалація, щойно резистентні виключено; відміна у стабільного без гарячки після запланованого курсу незалежно від нейтрофілів. Повний текст платний і не переглянутий',
        'UpToDate cites the new ECIL-10 (2026), which replaces ECIL-4 (steps 7–10). By the summary: stable, not colonised with resistant Gram-negatives, in low-resistance settings, carbapenem-sparing monotherapy; critically ill, colonised or in high-resistance settings, broader (beta-lactam + aminoglycoside, a carbapenem ± a beta-lactamase inhibitor, an antipseudomonal cephalosporin with an inhibitor, cefiderocol); de-escalate once resistant organisms are excluded; stop in a stable afebrile patient after the planned course whatever the neutrophils. The full text is paywalled and not reviewed',
      ),
    },
  ],
  sources: [UPTODATE_FN, UPTODATE_CDI, ECIL10],
}

export const COMPLICATION_STAGES: Stage[] = [
  NEGATIVE_CULTURES,
  COMBINATIONS,
  BY_SITE,
  RESISTANT,
  UPTODATE_COMPARISON,
]
