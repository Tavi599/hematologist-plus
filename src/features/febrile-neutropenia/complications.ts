/**
 * What comes after the first empirical line: fever with negative cultures, when a combination is
 * worth it and when it is not, documented infections by site, and resistant pathogens. Read in
 * full on 2026-10-11 from ECIL-4 (empirical and targeted, figures and tables), the AGIHO guidelines
 * on sepsis, catheter infections, lung infiltrates and gastrointestinal complications, ESCMID 2021
 * on C. difficile and the IDSA 2026 guidance on resistant Gram-negatives. The wording is ours; the
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
        'C. difficile (ESCMID 2021): фідаксоміцин 200 мг двічі на добу 10 днів; якщо недоступний — ванкоміцин 125 мг перорально 4 рази на добу 10 днів (можна вміст флакона для в/в); метронідазол 500 мг 3 рази — лише коли обидва недоступні і не при тяжкому перебігу. Ванкоміцин 500 мг 4 рази не рекомендовано. Рутинно додавати в/в метронідазол до перорального лікування тяжкого CDI не радять; якщо перорально неможливо — ванкоміцин чи фідаксоміцин у просвіт кишки і, можливо, в/в метронідазол 500 мг 3 рази на добу (слабка рекомендація). Розбіжність: AGIHO 2017 ще допускала метронідазол як рівноцінний варіант. Фідаксоміцин в Україні не зареєстрований',
        'C. difficile (ESCMID 2021): fidaxomicin 200 mg twice daily for 10 days; if unavailable, oral vancomycin 125 mg four times daily for 10 days (the IV vial may be used); metronidazole 500 mg three times only when both are unavailable and never in severe disease. Vancomycin 500 mg four times is not recommended. IV metronidazole is not added routinely to oral treatment of severe CDI; when oral is impossible, intraluminal vancomycin or fidaxomicin and possibly IV metronidazole 500 mg three times daily (weak recommendation). Discrepancy: AGIHO 2017 still allowed metronidazole as an equal option. Fidaxomicin is not registered in Ukraine',
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

export const COMPLICATION_STAGES: Stage[] = [NEGATIVE_CULTURES, COMBINATIONS, BY_SITE, RESISTANT]
