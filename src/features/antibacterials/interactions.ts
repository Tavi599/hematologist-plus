/**
 * Interactions between antibacterials and the drugs of haematological therapy, one pair a row:
 * the antibacterial (or class) on one side, the haematological drug (or group) on the other, what
 * happens and what the source says to do. Every row is cut out of the sources it names — the
 * Ukrainian labels from the State Register (drlz.com.ua) and MSD Manual Professional (Ukrainian
 * edition) — and written as our own terse points. Where the source gives no concrete instruction,
 * `action` is left out and the page says so; nothing is added from outside the source.
 *
 * Facts the class cards of `classes.ts` already hold are not repeated here: `classId` points at
 * that card instead.
 */

export interface InteractionSource {
  name: string
  url: string
  /** Registration certificate and register version, for a label. */
  version?: string
  checkedOn: string
}

export interface Interaction {
  id: string
  /** The antibacterial or class, as the row names it. */
  antibacterial: string
  /** Drug cards in `data/drugs` on the antibacterial side. */
  antibacterialIds: string[]
  /** The haematological drug or group, as the row names it. */
  partner: string
  /** Drug cards in `data/drugs` on the haematological side. */
  partnerIds: string[]
  /** What happens. */
  effect: string
  /** What the source says to do; absent when it gives no concrete instruction. */
  action?: string
  sources: InteractionSource[]
  /** A class card of `classes.ts` that holds related facts. */
  classId?: string
}

const CHECKED = '2026-11-20'
const DRLZ = 'https://www.drlz.com.ua/ibp/lz_www.nsf/id'
const MSD =
  'https://www.msdmanuals.com/uk/professional/infectious-diseases/bacteria-and-antibacterial-medications'

const label = (trade: string, file: string, version: string): InteractionSource => ({
  name: `Інструкція для медичного застосування: ${trade} (Державний реєстр лікарських засобів України)`,
  url: `${DRLZ}/${file}`,
  version,
  checkedOn: CHECKED,
})

const msd = (title: string, page: string): InteractionSource => ({
  name: `MSD Manual Professional (українська версія): ${title}`,
  url: `${MSD}/${page}`,
  checkedOn: '2026-11-14',
})

const VENCLEXTA = label(
  'Венклексто (венетоклакс)',
  'EC2B456AACCCADE942258E7C003BA248/$file/UA166670103_8B6E.mht',
  'РП UA/16667/01/03, версія реєстру від 11.09.2026',
)
const IMBRUVICA = label(
  'Імбрувіка (ібрутиніб)',
  '480C60FE52303F0242258D3F00514DD1/$file/UA142200101_FA12.mht',
  'РП UA/14220/01/01, версія реєстру від 30.10.2025',
)
const RIFAMPIN = label(
  'Рифампін (рифампіцин)',
  '07515C155BBE0B02422588E7003FDEB3/$file/UA115480101_A508.mht',
  'РП UA/11548/01/01, наказ МОЗ №1886 від 19.10.2022',
)
const SANDIMMUN = label(
  'Сандімун Неорал (циклоспорин)',
  '2D24B570E37B988842258E1F004ACA01/$file/UA31650104_B40E.mht',
  'РП UA/3165/01/04, версія реєстру від 19.06.2026',
)
const VORICONAZOLE = label(
  'Вориконазол Зентіва',
  '192576176EF683BD42258E5E00472554/$file/UA155240101_A6E8.mht',
  'РП UA/15524/01/01, версія реєстру від 13.08.2026',
)
const KLAR = label(
  'Клар (кларитроміцин)',
  '2DDEBEA0561FC3AB42258DA1004AFFD0/$file/UA193180102_652B.mht',
  'РП UA/19318/01/02, версія реєстру від 10.02.2026',
)
const LAEN = label(
  'Лаен (лінезолід)',
  'D7BBBE8E12B66A5742258E7C003DA8BD/$file/UA147680101_0BFF.mht',
  'РП UA/14768/01/01, версія реєстру від 11.09.2026',
)
const METHOTREXATE = label(
  'Метотрексат «Ебеве», розчин для ін’єкцій',
  '9511ED158F3D6EBE42258DCD0046514C/$file/UA05130201_BD60.mht',
  'РП UA/0513/02/01, версія реєстру від 23.03.2026',
)
const ARIS = label(
  'Аріс (меропенем)',
  '23158AF8DDF7649842258DFF0053ADFB/$file/UA122350102_B16A.mht',
  'РП UA/12235/01/02, версія реєстру від 13.05.2026',
)
const LEVAXELA = label(
  'Леваксела (левофлоксацин), розчин для інфузій',
  'DCAA8ED237E5C2F442258E6100695346/$file/UA155960101_518A.mht',
  'РП UA/15596/01/01, версія реєстру від 21.08.2026',
)
const VANCOBACID = label(
  'Ванкобацид (ванкоміцин)',
  '8F63D8B3E3527AD6C2258EAE00614DF4/$file/UA202500102_D2FC.mht',
  'РП UA/20250/01/02, версія реєстру від 10.11.2026',
)
const GENTAMICIN = label(
  'Гентаміцин-Здоров’я',
  '2922B53BDD83936042258DA1004BD557/$file/UA72730101_1526.mht',
  'РП UA/7273/01/01, наказ МОЗ №155 від 09.02.2026',
)

const AMINOGLYCOSIDES = ['gentamicin', 'amikacin', 'tobramycin']
const MACROLIDES = ['clarithromycin', 'erythromycin', 'azithromycin']
const FLUOROQUINOLONES = ['ciprofloxacin', 'levofloxacin', 'moxifloxacin']
const CARBAPENEMS = ['meropenem', 'ertapenem', 'imipenem-cilastatin']
const CALCINEURIN_MTOR = ['ciclosporin', 'tacrolimus', 'sirolimus']

export const INTERACTIONS: Interaction[] = [
  {
    id: 'rifampicin-venetoclax',
    antibacterial: 'Рифампіцин',
    antibacterialIds: ['rifampicin'],
    partner: 'Венетоклакс',
    partnerIds: ['venetoclax'],
    effect:
      'Сильний індуктор CYP3A: рифампіцин 600 мг на добу 13 днів знижував Cmax венетоклаксу на 42 %, AUC — на 71 %. Разова доза 600 мг (інгібування P-gp), навпаки, підвищувала Cmax на 106 %, AUC — на 78 %',
    action:
      'Уникати поєднання із сильними й помірними індукторами CYP3A; розглянути засоби з меншою індукцією. Інгібіторів P-gp уникати на початку й під час титрування, інакше — ретельно стежити за токсичністю',
    sources: [VENCLEXTA],
    classId: 'rifamycins',
  },
  {
    id: 'rifampicin-ibrutinib',
    antibacterial: 'Рифампіцин',
    antibacterialIds: ['rifampicin'],
    partner: 'Ібрутиніб',
    partnerIds: ['ibrutinib'],
    effect: 'Потужний індуктор CYP3A4: Cmax і AUC ібрутинібу знижувались на 92 % і 90 %',
    action: 'Уникати поєднання з потужними й помірними індукторами CYP3A4',
    sources: [IMBRUVICA],
    classId: 'rifamycins',
  },
  {
    id: 'rifampicin-calcineurin',
    antibacterial: 'Рифампіцин',
    antibacterialIds: ['rifampicin'],
    partner: 'Циклоспорин, такролімус, сиролімус',
    partnerIds: CALCINEURIN_MTOR,
    effect:
      'Індукує CYP3A4, інші CYP, UGT і P-gp — знижує експозицію й дію імуносупресантів. Для циклоспорину може знадобитися доза у 3–5 разів більша',
    action:
      'Корекція дози на початку застосування рифампіцину й після його відміни, якщо на це вказує клінічний стан',
    sources: [RIFAMPIN, SANDIMMUN],
    classId: 'rifamycins',
  },
  {
    id: 'rifampicin-azoles',
    antibacterial: 'Рифампіцин',
    antibacterialIds: ['rifampicin'],
    partner: 'Азоли (вориконазол, флуконазол)',
    partnerIds: ['voriconazole', 'fluconazole'],
    effect:
      'Знижує концентрації протигрибкових азолів (флуконазол, ітраконазол, кетоконазол, вориконазол). Вориконазол: Cmax ↓ 93 %, AUC ↓ 96 %',
    action:
      'Вориконазол із рифампіцином протипоказаний. Для інших азолів — корекція дози, якщо на це вказує клінічний стан',
    sources: [VORICONAZOLE, RIFAMPIN],
    classId: 'rifamycins',
  },
  {
    id: 'rifampicin-other-heme',
    antibacterial: 'Рифампіцин',
    antibacterialIds: ['rifampicin'],
    partner: 'Іматиніб та інші цитостатики, ондансетрон, кортикостероїди',
    partnerIds: ['imatinib', 'ondansetron', 'dexamethasone'],
    effect:
      'Як індуктор ферментів знижує концентрацію й активність цитостатиків (приклад в інструкції — іматиніб), антагоністів 5-HT3 (ондансетрон), кортикостероїдів',
    action:
      'Корекція дози на початку застосування рифампіцину й після його відміни, якщо на це вказує клінічний стан',
    sources: [RIFAMPIN],
    classId: 'rifamycins',
  },
  {
    id: 'macrolides-venetoclax',
    antibacterial: 'Кларитроміцин, еритроміцин',
    antibacterialIds: ['clarithromycin', 'erythromycin'],
    partner: 'Венетоклакс',
    partnerIds: ['venetoclax'],
    effect:
      'Кларитроміцин — сильний, еритроміцин — помірний інгібітор CYP3A: зростає експозиція венетоклаксу (з сильними інгібіторами AUC прогнозовано в 5,8–7,8 раза)',
    action:
      'ХЛЛ: сильні інгібітори CYP3A на початку й під час титрування протипоказані, помірних — уникати. Стабільна доза: із сильним інгібітором — 100 мг або менше (або щонайменше на 75 %, якщо доза вже змінена), з помірним — щонайменше на 50 % менше. ГМЛ із сильним інгібітором: дні 1–4 — 10, 20, 50, ≤ 100 мг. Попередню дозу — через 2–3 дні після відміни інгібітора',
    sources: [VENCLEXTA],
    classId: 'clindamycin-macrolides',
  },
  {
    id: 'macrolides-ibrutinib',
    antibacterial: 'Кларитроміцин, еритроміцин',
    antibacterialIds: ['clarithromycin', 'erythromycin'],
    partner: 'Ібрутиніб',
    partnerIds: ['ibrutinib'],
    effect:
      'Кларитроміцин (потужний інгібітор CYP3A4) за моделюванням підвищує AUC ібрутинібу в 14 разів; еритроміцин (помірний) — Cmax у 3,4, AUC у 3,0 раза',
    action:
      'Кларитроміцину уникати; якщо користь переважає ризик — ібрутиніб 140 мг або перерва до 7 днів. Еритроміцину уникати; якщо призначено — ібрутиніб 280 мг на час інгібітора. Стежити за токсичністю',
    sources: [IMBRUVICA],
    classId: 'clindamycin-macrolides',
  },
  {
    id: 'macrolides-calcineurin',
    antibacterial: 'Макроліди (кларитроміцин, еритроміцин, азитроміцин)',
    antibacterialIds: MACROLIDES,
    partner: 'Циклоспорин, такролімус, сиролімус',
    partnerIds: CALCINEURIN_MTOR,
    effect:
      'Еритроміцин підвищує експозицію циклоспорину в 4–7 разів (іноді — нефротоксичність), кларитроміцин — удвічі, азитроміцин — приблизно на 20 %. Такролімус і сиролімус — у переліку субстратів CYP3A, рівні яких кларитроміцин підвищує',
    action:
      'Кларитроміцин: корекція дози й, якщо можливо, контроль концентрацій субстрату. Циклоспорин з інгібіторами: часта оцінка функції нирок і побічних ефектів',
    sources: [KLAR, SANDIMMUN],
    classId: 'clindamycin-macrolides',
  },
  {
    id: 'linezolid-myelosuppression',
    antibacterial: 'Лінезолід',
    antibacterialIds: ['linezolid'],
    partner: 'Мієлосупресивні засоби, наявні цитопенії',
    partnerIds: [],
    effect:
      'Мієлосупресія (анемія, лейкопенія, тромбоцитопенія, панцитопенія), залежна від тривалості; понад 28 днів — частіша тяжка анемія з потребою в переливанні. Група ризику: наявні анемія, гранулоцитопенія, тромбоцитопенія; супутні засоби, що знижують гемоглобін, кількість клітин крові чи функцію тромбоцитів; курс понад 10–14 днів',
    action:
      'У групі ризику — ретельний контроль гемоглобіну, загального аналізу крові, тромбоцитів; усім — загальний аналіз крові щотижня. При значній мієлосупресії лінезолід припинити, крім випадків, коли продовження абсолютно необхідне',
    sources: [LAEN],
    classId: 'oxazolidinones',
  },
  {
    id: 'linezolid-serotonergic',
    antibacterial: 'Лінезолід',
    antibacterialIds: ['linezolid'],
    partner: 'Серотонінергічні засоби (СІЗЗС, ТЦА, триптани, петидин, буспірон), вазопресори',
    partnerIds: [],
    effect:
      'Оборотний неселективний інгібітор МАО: ризик серотонінового синдрому й підвищення артеріального тиску',
    action:
      'Інгібітори МАО (зокрема протягом 2 тижнів після них) — протипоказано. СІЗЗС, ТЦА, триптани, симпатоміметики, вазопресори, дофамінергічні, петидин, буспірон — не призначати без можливості ретельного спостереження й контролю АТ',
    sources: [LAEN],
    classId: 'oxazolidinones',
  },
  {
    id: 'cotrimoxazole-methotrexate',
    antibacterial: 'Ко-тримоксазол',
    antibacterialIds: ['co-trimoxazole'],
    partner: 'Метотрексат',
    partnerIds: ['methotrexate'],
    effect:
      'Дефіцит фолатів посилює токсичність метотрексату; разом із засобами, що діють на кістковий мозок, — виразніші гематологічні порушення, поодиноко гостра панцитопенія. Ко-тримоксазол підвищує рівні метотрексату',
    sources: [
      METHOTREXATE,
      msd('Триметоприм і сульфаметоксазол', 'trimethoprim-and-sulfamethoxazole'),
    ],
    classId: 'sulfonamides',
  },
  {
    id: 'carbapenems-valproate',
    antibacterial: 'Карбапенеми',
    antibacterialIds: CARBAPENEMS,
    partner: 'Вальпроєва кислота',
    partnerIds: [],
    effect:
      'Рівень вальпроєвої кислоти в крові падає на 60–100 % приблизно за два дні; зниження швидке й не піддається корекції',
    action: 'Уникати поєднання',
    sources: [ARIS],
    classId: 'carbapenems',
  },
  {
    id: 'qt-fluoroquinolones-macrolides-azoles',
    antibacterial: 'Фторхінолони, макроліди',
    antibacterialIds: [...FLUOROQUINOLONES, 'clarithromycin', 'erythromycin'],
    partner: 'Азоли (вориконазол) та інші засоби, що подовжують QT',
    partnerIds: ['voriconazole'],
    effect:
      'Кожен подовжує інтервал QT; разом — сумація ризику аритмії, зокрема torsades de pointes. Вориконазол: «пірует» рідко, у пацієнтів із кардіотоксичною хіміотерапією в анамнезі, кардіоміопатією, гіпокаліємією',
    action:
      'Фторхінолони й вориконазол з іншими QT-подовжувальними (зокрема макролідами) — з обережністю. Кларитроміцин протипоказаний при подовженому QT, гіпокаліємії, гіпомагніємії. Частоту ЕКГ ці джерела не наводять',
    sources: [LEVAXELA, KLAR, VORICONAZOLE, msd('Фторхінолони', 'fluoroquinolones')],
    classId: 'fluoroquinolones',
  },
  {
    id: 'aminoglycosides-nephrotoxic',
    antibacterial: 'Аміноглікозиди',
    antibacterialIds: AMINOGLYCOSIDES,
    partner: 'Цисплатин, амфотерицин B, циклоспорин, ванкоміцин, колістин, петльові діуретики',
    partnerIds: [
      'cisplatin',
      'amphotericin-b-liposomal',
      'ciclosporin',
      'vancomycin',
      'colistimethate',
      'furosemide',
    ],
    effect:
      'Сумація нефро- й нейротоксичності; петльові діуретики посилюють ото- й нефротоксичність. З циклофосфамідом і цефалоспоринами зростає ризик для нирок',
    action:
      'Гентаміцин: одночасного й послідовного застосування з іншими нефро- й нейротоксичними засобами уникати; з циклофосфамідом і цефалоспоринами — контроль функції нирок',
    sources: [GENTAMICIN, msd('Аміноглікозиди', 'aminoglycosides')],
    classId: 'aminoglycosides',
  },
  {
    id: 'vancomycin-nephrotoxic',
    antibacterial: 'Ванкоміцин',
    antibacterialIds: ['vancomycin'],
    partner: 'Амфотерицин B, аміноглікозиди, цисплатин, колістин, петльові діуретики',
    partnerIds: [
      'amphotericin-b-liposomal',
      ...AMINOGLYCOSIDES,
      'cisplatin',
      'colistimethate',
      'furosemide',
      'piperacillin-tazobactam',
    ],
    effect:
      'При одночасному або послідовному застосуванні ото- й нефротоксичних засобів (також поліміксин B, піперацилін/тазобактам, НПЗЗ) токсичність ванкоміцину може зростати',
    action: 'Такі комбінації — з обережністю й відповідним моніторингом',
    sources: [VANCOBACID],
    classId: 'glycopeptides',
  },
  {
    id: 'ciclosporin-nephrotoxic-antibacterials',
    antibacterial: 'Аміноглікозиди, ванкоміцин, ципрофлоксацин, ко-тримоксазол',
    antibacterialIds: [...AMINOGLYCOSIDES, 'vancomycin', 'ciprofloxacin', 'co-trimoxazole'],
    partner: 'Циклоспорин',
    partnerIds: ['ciclosporin'],
    effect:
      'Синергічна нефротоксичність (у тому ж переліку — амфотерицин B, метотрексат, мелфалан, такролімус)',
    action:
      'Ретельний моніторинг функції нирок; при вираженому порушенні — зменшити дозу супутнього засобу або розглянути альтернативу',
    sources: [SANDIMMUN],
    classId: 'aminoglycosides',
  },
]

/** All the text of a row the search box looks through. */
export function interactionText(row: Interaction): string {
  return [row.antibacterial, row.partner, row.effect, row.action ?? ''].join(' ')
}

/** The rows whose text contains the lower-cased query; all of them for an empty one. */
export function findInteractions(needle: string): Interaction[] {
  if (needle === '') return INTERACTIONS
  return INTERACTIONS.filter((row) => interactionText(row).toLowerCase().includes(needle))
}
