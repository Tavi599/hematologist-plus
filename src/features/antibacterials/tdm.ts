/**
 * Therapeutic drug monitoring of antibacterials: vancomycin, the aminoglycosides (gentamicin,
 * amikacin, tobramycin) and teicoplanin, whose label also tells to measure trough levels. For each
 * drug: when to draw the sample, the target for the indication and regimen, what to do outside
 * the range, how often to repeat, and the kidney and hearing checks.
 *
 * Every point is cut out of the sources it names — MSD Manual Professional (Ukrainian edition)
 * and the Ukrainian labels from the State Register (drlz.com.ua) — and written as our own terse
 * points, never as copied text. Where a drug card of `data/drugs` already holds a level, the card's
 * own source (an emc SmPC) is shown as the catalog's side. A target or a dose appears only where a
 * source states it; where the sources differ, a `discrepancy` point names each side and decides
 * nothing. The NCCN guidelines the department holds say nothing about antibacterial levels (their
 * only drug-level advice is on asparaginase), so none is cited here.
 *
 * The differences `DISCREPANCIES` of `classes.ts` already lists are not repeated: `discrepancyIds`
 * points at them, and the points here add only what the Ukrainian label brings to them.
 */

export interface TdmSource {
  /** Short label shown after every point. */
  short: string
  name: string
  url: string
  /** Registration certificate and register version for a label, edition for an SmPC. */
  version?: string
  checkedOn: string
}

export type TdmTopic = 'sampling' | 'target' | 'outOfRange' | 'repeat' | 'toxicity' | 'discrepancy'

export const TDM_TOPICS: TdmTopic[] = [
  'sampling',
  'target',
  'outOfRange',
  'repeat',
  'toxicity',
  'discrepancy',
]

export interface TdmPoint {
  topic: TdmTopic
  text: string
  sources: TdmSource[]
}

export interface TdmSection {
  id: string
  title: string
  /** Drug cards in `data/drugs` this section is about. */
  drugIds: string[]
  /** A class card of `classes.ts` that holds related facts. */
  classId?: string
  /** Items of `DISCREPANCIES` in `classes.ts` that this section adds to. */
  discrepancyIds?: string[]
  points: TdmPoint[]
}

const CHECKED = '2026-11-21'
const MSD =
  'https://www.msdmanuals.com/uk/professional/infectious-diseases/bacteria-and-antibacterial-medications'
const DRLZ = 'https://www.drlz.com.ua/ibp/lz_www.nsf/id'

const msd = (short: string, title: string, page: string): TdmSource => ({
  short: `MSD: ${short}`,
  name: `MSD Manual Professional (українська версія): ${title}`,
  url: `${MSD}/${page}`,
  checkedOn: CHECKED,
})

const label = (trade: string, file: string, version: string): TdmSource => ({
  short: `Інструкція ${trade}`,
  name: `Інструкція для медичного застосування: ${trade} (Державний реєстр лікарських засобів України)`,
  url: `${DRLZ}/${file}`,
  version,
  checkedOn: CHECKED,
})

const MSD_AMINOGLYCOSIDES = msd('аміноглікозиди', 'Аміноглікозиди', 'aminoglycosides')
const MSD_VANCOMYCIN = msd('ванкоміцин', 'Ванкоміцин', 'vancomycin')

const VANCOBACID = label(
  'Ванкобацид',
  '8F63D8B3E3527AD6C2258EAE00614DF4/$file/UA202500102_D2FC.mht',
  'РП UA/20250/01/02, версія реєстру від 10.11.2026',
)
const GENTAMICIN = label(
  'Гентаміцин-Здоров’я',
  '2922B53BDD83936042258DA1004BD557/$file/UA72730101_1526.mht',
  'РП UA/7273/01/01, наказ МОЗ №155 від 09.02.2026',
)
const AMIKACID = label(
  'Амікацид (амікацин)',
  'FB3CD7A1F35AFB7CC2258ADF004D2D1A/$file/UA154520101_ACF6.mht',
  'РП UA/15452/01/01, наказ МОЗ №374 від 05.03.2024',
)
const FLEXELIT = label(
  'Флекселіт (амікацин)',
  'AFF0C02F3F1E4D8F42258CAF00435B4B/$file/UA04360101_FD7B.mht',
  'РП UA/0436/01/01, наказ МОЗ №964 від 12.06.2025',
)
const BRAXON = label(
  'Браксон (тобраміцин)',
  '7895A716B7910D5242258940002BB6B1/$file/UA140260101_F6A9.mht',
  'РП UA/14026/01/01, наказ МОЗ №68 від 12.01.2023',
)
const TEICOPLANIN = label(
  'Тейкопланін-Фармекс',
  'C8DF93813ADD6BE842258B3F004239FC/$file/UA137650101_D787.mht',
  'РП UA/13765/01/01, наказ МОЗ №979 від 06.06.2024',
)

/** The SmPC a drug card of `data/drugs` cites for its level: the catalog's side of a difference. */
const CARD_VANCOMYCIN: TdmSource = {
  short: 'Картка каталогу (SmPC hameln)',
  name: 'SmPC Vancomycin 1000 mg powder for concentrate for solution for infusion (hameln, emc), 4.2, 4.4 — джерело картки data/drugs/vancomycin',
  url: 'https://www.medicines.org.uk/emc/product/15737/smpc',
  version: 'ред. 19.01.2026',
  checkedOn: '2026-10-13',
}
const CARD_AMIKACIN: TdmSource = {
  short: 'Картка каталогу (SmPC Hospira)',
  name: 'SmPC Amikacin 250 mg/ml Injection (Hospira, emc), 4.2, 4.4 — джерело картки data/drugs/amikacin',
  url: 'https://www.medicines.org.uk/emc/product/3784/smpc',
  version: 'ред. 03/2024',
  checkedOn: '2026-10-13',
}

const p = (topic: TdmTopic, text: string, ...sources: TdmSource[]): TdmPoint => ({
  topic,
  text,
  sources,
})

export const TDM: TdmSection[] = [
  {
    id: 'vancomycin',
    title: 'Ванкоміцин',
    drugIds: ['vancomycin'],
    classId: 'glycopeptides',
    discrepancyIds: ['vancomycin-tdm'],
    points: [
      p(
        'sampling',
        'Для розрахунку AUC — два рівні: через 1–2 год після закінчення інфузії та мінімальний; AUC — за кінетикою першого порядку або байєсівською програмою з 1–2 рівнів',
        MSD_VANCOMYCIN,
      ),
      p(
        'sampling',
        'При нормальній функції нирок — мінімальний рівень на 2-й день лікування, безпосередньо перед наступною дозою; на періодичному гемодіалізі — перед початком сеансу',
        VANCOBACID,
      ),
      p(
        'sampling',
        'Рівень показаний при високих дозах і тривалому курсі, особливо при порушенні функції нирок чи слуху або разом з нефро- чи ототоксичними засобами; також після прийому всередину при запальних хворобах кишечнику',
        VANCOBACID,
      ),
      p(
        'target',
        'Підтверджена чи підозрювана інвазивна MRSA-інфекція: AUC 400–600. Ці цілі — лише для MRSA, для інших грампозитивних дозу за ними не коригують',
        MSD_VANCOMYCIN,
      ),
      p(
        'target',
        'Безперервна інфузія: титрувати до рівноважної концентрації 17–25 мкг/мл',
        MSD_VANCOMYCIN,
      ),
      p(
        'target',
        'Мінімальний рівень зазвичай 10–20 мг/л залежно від вогнища й чутливості збудника; лабораторії частіше радять 15–20 мг/л, щоб охопити збудники з МІК ≥ 1 мг/л. Ціль ФК/ФД — AUC/МІК 400',
        VANCOBACID,
      ),
      p(
        'outOfRange',
        'Подальші дози — за концентрацією в сироватці; модельні (байєсівські) методи допомагають підібрати дозу під потрібну AUC — і стартову, і після кожного рівня',
        VANCOBACID,
      ),
      p(
        'outOfRange',
        'КК < 20 мл/хв або замісна ниркова терапія: час і величина наступних доз — за мінімальним рівнем і залишковою функцією нирок; наступну дозу можна відкласти до результату. Навантажувальну дозу у важкохворих з нирковою недостатністю не зменшують',
        VANCOBACID,
      ),
      p(
        'outOfRange',
        'S. aureus з МІК ≥ 2 мкг/мл може погано відповідати навіть при AUC 400–600: при слабкій клінічній відповіді поріг переходу на альтернативу — низький',
        MSD_VANCOMYCIN,
      ),
      p(
        'repeat',
        'Частота — індивідуальна: від щоденних проб у гемодинамічно нестабільних до щонайменше 1 разу на тиждень у стабільних із відповіддю на лікування',
        VANCOBACID,
      ),
      p(
        'toxicity',
        'Нефротоксичність рідка — при високих дозах або з нефротоксичними засобами (аміноглікозиди; за повідомленнями, піперацилін/тазобактам). Ототоксичність дозозалежна, рідка, частіша з іншими ототоксичними',
        MSD_VANCOMYCIN,
      ),
      p(
        'toxicity',
        'Функцію нирок — послідовно при нирковій недостатності та з аміноглікозидами чи іншими нефротоксичними; усім — регулярно аналіз крові, сечі, печінкові й ниркові проби; лейкоцити — періодично при тривалому курсі',
        VANCOBACID,
      ),
      p(
        'toxicity',
        'Щоб зменшити ототоксичність — періодично рівень ванкоміцину й слух; у літніх — слухову й вестибулярну функцію під час і після лікування. Попередня втрата слуху — уникати ванкоміцину',
        VANCOBACID,
      ),
      p(
        'discrepancy',
        'MSD: мінімальна концентрація 15–20 мг/л як сурогат AUC/МІК ≥ 400 більше не рекомендована, мета — AUC. Українська інструкція й картка каталогу: контроль за мінімальним рівнем 10–20 мг/л (15–20 при МІК ≥ 1), AUC — лише як можливість модельних методів',
        MSD_VANCOMYCIN,
        VANCOBACID,
        CARD_VANCOMYCIN,
      ),
    ],
  },
  {
    id: 'aminoglycosides',
    title: 'Аміноглікозиди: загальні правила (MSD)',
    drugIds: ['gentamicin', 'amikacin', 'tobramycin'],
    classId: 'aminoglycosides',
    points: [
      p(
        'sampling',
        'У критичному стані — пік після першої дози. У всіх — пік і мінімум після 2-ї чи 3-ї дози (якщо добову дозу розділено), при терапії > 3 днів і після кожної зміни дози',
        MSD_AMINOGLYCOSIDES,
      ),
      p(
        'sampling',
        'Пік — через 60 хв після в/м ін’єкції або через 30 хв після закінчення 30-хвилинної інфузії; мінімум — у межах 30 хв перед наступною дозою',
        MSD_AMINOGLYCOSIDES,
      ),
      p(
        'sampling',
        'На тлі високих доз бета-лактаму зразок треба аналізувати одразу або заморозити: бета-лактам інактивує аміноглікозид у пробірці й занижує результат',
        MSD_AMINOGLYCOSIDES,
      ),
      p(
        'target',
        'Режим раз на добу: пік щонайменше в 10 разів вищий за МІК; дозу підбирають під терапевтичний пік і нетоксичний мінімум',
        MSD_AMINOGLYCOSIDES,
      ),
      p(
        'outOfRange',
        'Ниркова недостатність при періодичному введенні: навантажувальна доза — як при нормальній функції, далі зазвичай подовжують інтервал, а не знижують дозу. Розрахунки за креатиніном неточні — перевага за вимірюванням рівнів',
        MSD_AMINOGLYCOSIDES,
      ),
      p(
        'outOfRange',
        'Перші ознаки ото- чи вестибулотоксичності — припинити (якщо можливо) або скоригувати дозу',
        MSD_AMINOGLYCOSIDES,
      ),
      p(
        'repeat',
        'Креатинін — кожні 2–3 дні; якщо він стабільний, повторно рівні аміноглікозиду визначати не потрібно',
        MSD_AMINOGLYCOSIDES,
      ),
      p(
        'toxicity',
        'Токсичність залежить радше від тривалості терапевтичних рівнів, ніж від піку. Ризик: часте введення чи дуже високі дози, високі рівні, > 3 днів, старший вік, порушення функції нирок, ванкоміцин, циклоспорин, амфотерицин B, контрасти; для слуху — ще петльові діуретики',
        MSD_AMINOGLYCOSIDES,
      ),
      p(
        'toxicity',
        'Аудіометрія періодично — при курсі > 2 тижнів або ризику ото- й вестибулотоксичності',
        MSD_AMINOGLYCOSIDES,
      ),
    ],
  },
  {
    id: 'gentamicin',
    title: 'Гентаміцин',
    drugIds: ['gentamicin'],
    classId: 'aminoglycosides',
    points: [
      p(
        'sampling',
        'Перед призначенням — кліренс креатиніну; рівень у сироватці — при кожній можливості, через 30–60 хв після в/м введення',
        GENTAMICIN,
      ),
      p(
        'target',
        'Раз на добу: пік 15–20 мкг/мл, у критичному стані 16–24 мкг/мл; мінімум < 1 мкг/мл через 18–24 год після першої дози. Традиційне періодичне введення: мінімум 1–2 мкг/мл',
        MSD_AMINOGLYCOSIDES,
      ),
      p('target', 'Через 30–60 хв після в/м введення — 5–10 мкг/мл', GENTAMICIN),
      p(
        'outOfRange',
        'Клубочкова фільтрація знизилась на 50 % — відмінити. Симптоми ураження нирок, слуху чи вестибулярного апарату — припинити, лише у виняткових випадках — скоригувати дозу',
        GENTAMICIN,
      ),
      p(
        'repeat',
        'Клубочкова фільтрація — кожні 3 дні; функція нирок — 1–2 рази на тиждень, щодня при великих дозах або курсі > 10 днів; слух на високих частотах чи вестибулярна функція — 1–2 рази на тиждень',
        GENTAMICIN,
      ),
      p(
        'toxicity',
        'Токсичність проявляється після > 10 діб застосування, порушення слуху — іноді вже після курсу. Мутація мтДНК (1555 A→G у гені 12S рРНК) — ризик ототоксичності навіть при рівнях у межах цілі',
        GENTAMICIN,
      ),
      p(
        'discrepancy',
        'Ці цілі стосуються різних режимів і прямо не порівнюються. MSD: раз на добу, пік 15–20 мкг/мл. Інструкція: доза до 5 мг/кг/добу на 3–4 введення, після в/м — 5–10 мкг/мл; усю добову дозу разом не радить при опіках > 20 %, муковісцидозі, асциті, ендокардиті, сепсисі, гемодіалізі. Картка каталогу повторює інструкцію',
        MSD_AMINOGLYCOSIDES,
        GENTAMICIN,
      ),
    ],
  },
  {
    id: 'amikacin',
    title: 'Амікацин',
    drugIds: ['amikacin'],
    classId: 'aminoglycosides',
    discrepancyIds: ['amikacin-levels', 'amikacin-dose', 'aminoglycoside-duration'],
    points: [
      p(
        'target',
        'Раз на добу в критичному стані: пік 56–64 мкг/мл; цільового мінімуму для амікацину MSD не наводить',
        MSD_AMINOGLYCOSIDES,
      ),
      p(
        'target',
        'Числових цільових рівнів інструкція не дає. Вказує: одноразова доза 15 мг/кг при помірному зниженні функції нирок дає 82–95 мкг/мл — тому при КК < 50 мл/хв раз на добу не вводити',
        AMIKACID,
      ),
      p(
        'outOfRange',
        'Ознаки ото- (запаморочення, шум у вухах, зниження слуху) чи нефротоксичності (падіння кліренсу креатиніну, олігурія) — припинити або зменшити дозу; азотемія чи наростання олігурії — зупинити',
        AMIKACID,
      ),
      p(
        'outOfRange',
        'Ознаки подразнення нирок (циліндри, альбумінурія, мікрогематурія, падіння питомої ваги сечі, ріст креатиніну) — більше рідини й менша доза. Незадовільні аудіограми — знизити дозу або припинити',
        AMIKACID,
      ),
      p(
        'repeat',
        'Функцію нирок, слухового нерва й вестибулярного апарату — не рідше 1 разу на тиждень; щодня — при нирковій недостатності, високих дозах і тривалому курсі; креатинін — часто',
        AMIKACID,
      ),
      p(
        'repeat',
        'Аудіограма до лікування й повторно, якщо курс ≥ 7 днів при порушенні функції нирок або ≥ 10 днів без нього',
        AMIKACID,
      ),
      p(
        'repeat',
        'Важкі чи ускладнені інфекції: через 10 діб оцінити лікування; перед наступним курсом перевірити нирки, слух, вестибулярний апарат і концентрацію в сироватці',
        FLEXELIT,
      ),
      p(
        'toxicity',
        'Ризик ототоксичності зростає зі стійко високими піковими чи загалом високими концентраціями в сироватці; високочастотна глухота виявляється лише аудіометрією й буває без симптомів',
        AMIKACID,
      ),
      p(
        'discrepancy',
        'Три різні відповіді. MSD: пік 56–64 мкг/мл (раз на добу, критичні). Картка каталогу: пік (30–90 хв) не вище 35, мінімум не вище 10 мкг/мл. Українська інструкція: числових рівнів немає, звичайний режим 5 мг/кг кожні 8 год або 7,5 мг/кг кожні 12 год, максимум 15 мг/кг/добу',
        MSD_AMINOGLYCOSIDES,
        CARD_AMIKACIN,
        AMIKACID,
      ),
    ],
  },
  {
    id: 'tobramycin',
    title: 'Тобраміцин',
    drugIds: ['tobramycin'],
    classId: 'aminoglycosides',
    points: [
      p(
        'target',
        'Як гентаміцин. Раз на добу: пік 15–20 мкг/мл, у критичному стані 16–24 мкг/мл; мінімум < 1 мкг/мл через 18–24 год після першої дози. Традиційне періодичне введення: мінімум 1–2 мкг/мл',
        MSD_AMINOGLYCOSIDES,
      ),
      p(
        'target',
        'Концентрація в сироватці не повинна перевищувати 8 мкг/мл; ризик ото- й нефротоксичності значно росте, якщо вона тривало вища за 12 мкг/мл',
        BRAXON,
      ),
      p(
        'outOfRange',
        'Незадовільні аудіометричні тести — знизити дозу або припинити лікування',
        BRAXON,
      ),
      p(
        'repeat',
        'Функцію нирок, печінки, вестибулярного апарату й слуху — не рідше 1 разу на тиждень; нирки щодня — при порушенні їхньої функції, високих дозах чи тривалому курсі; курс > 10 днів — із контролем нирок, слуху й вестибулярного апарату',
        BRAXON,
      ),
      p(
        'toxicity',
        'Мутація мтДНК (1555 A→G у гені 12S рРНК) — ризик ототоксичності навіть при рівнях у межах рекомендованих',
        BRAXON,
      ),
      p(
        'discrepancy',
        'MSD: пік 15–20 мкг/мл при введенні раз на добу. Інструкція: концентрація не вище 8 мкг/мл при дробному введенні. У картці каталогу цільових рівнів немає',
        MSD_AMINOGLYCOSIDES,
        BRAXON,
      ),
    ],
  },
  {
    id: 'teicoplanin',
    title: 'Тейкопланін',
    drugIds: ['teicoplanin'],
    points: [
      p(
        'sampling',
        'Мінімальна (залишкова) концентрація в рівноважному стані — після завершення навантажувальних доз; цілі таблиці інструкції — на 3–5-ту добу й під час підтримувальної терапії',
        TEICOPLANIN,
      ),
      p(
        'target',
        'Більшість грампозитивних інфекцій: щонайменше 10 мг/л (ВЕРХ) або 15 мг/л (ФПІА). Ендокардит та інші тяжкі: 15–30 мг/л (ВЕРХ) або 30–40 мг/л (ФПІА)',
        TEICOPLANIN,
      ),
      p(
        'target',
        'За показанням (ФПІА): шкіра й м’які тканини, пневмонія, сечові шляхи > 15 мг/л; кістки й суглоби > 20 мг/л; ендокардит 30–40 мг/л на 3–5-ту добу, > 30 мг/л під час підтримувальної терапії',
        TEICOPLANIN,
      ),
      p(
        'outOfRange',
        'Ниркова недостатність: до 4-ї доби дозу не коригують, мінімальна концентрація має триматися не нижче 10 мг/л; далі дозу зменшують за кліренсом креатиніну',
        TEICOPLANIN,
      ),
      p(
        'repeat',
        'Під час підтримувальної терапії — щонайменше 1 раз на тиждень, щоб переконатися в стабільності',
        TEICOPLANIN,
      ),
      p(
        'toxicity',
        'Слух — ретельно оцінювати при ознаках ураження, тривалому курсі й нирковій недостатності; з нефро- чи ототоксичними засобами (аміноглікозиди, колістин, амфотерицин B, циклоспорин, цисплатин) — регулярно аналіз крові, печінкові й ниркові проби, слухові тести',
        TEICOPLANIN,
      ),
    ],
  },
]

/** All the text of a point the search box looks through. */
function pointText(point: TdmPoint): string {
  return [point.text, ...point.sources.map((source) => source.short)].join(' ')
}

/**
 * The sections with only the points that contain the lower-cased query; a section whose title
 * matches stays whole. All of them for an empty query.
 */
export function findTdm(needle: string): TdmSection[] {
  if (needle === '') return TDM
  return TDM.flatMap((section) => {
    if (section.title.toLowerCase().includes(needle)) return [section]
    const points = section.points.filter((point) => pointText(point).toLowerCase().includes(needle))
    return points.length > 0 ? [{ ...section, points }] : []
  })
}
