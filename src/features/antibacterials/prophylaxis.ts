/**
 * Antimicrobial prophylaxis in haematology: a fluoroquinolone through long deep neutropenia,
 * co-trimoxazole against Pneumocystis jirovecii, and what the sources say about asplenia and
 * hypogammaglobulinaemia. Every point is cut out of the sources it names — MSD Manual
 * Professional (Ukrainian edition), the supportive-care pages of the NCCN disease guidelines the
 * department holds, and the Ukrainian labels from the State Register (drlz.com.ua) — and written
 * as our own terse points, never as copied text.
 *
 * A dose appears only where a source states it, with that source; where none does, the point says
 * so. Where the sources disagree, a `discrepancy` point shows each side and decides nothing.
 *
 * NCCN Prevention and Treatment of Cancer-Related Infections was not read: it opens only after a
 * sign-in. Its place is taken by the infection pages of the NCCN CLL, Multiple Myeloma, B-Cell
 * Lymphomas and ALL guidelines.
 */

export interface ProphylaxisSource {
  /** Short label shown after every point. */
  short: string
  name: string
  url: string
  /** Registration certificate and register version for a label, guideline version for NCCN. */
  version?: string
  checkedOn: string
}

export type ProphylaxisTopic = 'who' | 'timing' | 'dose' | 'alternative' | 'caution' | 'discrepancy'

export const PROPHYLAXIS_TOPICS: ProphylaxisTopic[] = [
  'who',
  'timing',
  'dose',
  'alternative',
  'caution',
  'discrepancy',
]

export interface ProphylaxisPoint {
  topic: ProphylaxisTopic
  text: string
  sources: ProphylaxisSource[]
}

export interface ProphylaxisSection {
  id: string
  title: string
  /** Drug cards in `data/drugs` that this prophylaxis uses. */
  drugIds: string[]
  /** Drug cards in `data/drugs` of the therapy that creates the risk. */
  riskDrugIds: string[]
  /** A class card of `classes.ts` that holds related facts. */
  classId?: string
  points: ProphylaxisPoint[]
}

const CHECKED = '2026-11-21'
const MSD = 'https://www.msdmanuals.com/uk/professional'
const NCCN = 'https://www.nccn.org/professionals/physician_gls/pdf'
const DRLZ = 'https://www.drlz.com.ua/ibp/lz_www.nsf/id'

const msd = (short: string, title: string, page: string): ProphylaxisSource => ({
  short: `MSD: ${short}`,
  name: `MSD Manual Professional (українська версія): ${title}`,
  url: `${MSD}/${page}`,
  checkedOn: CHECKED,
})

const nccn = (short: string, title: string, file: string, version: string): ProphylaxisSource => ({
  short: `NCCN ${short}`,
  name: `NCCN Guidelines: ${title}`,
  url: `${NCCN}/${file}`,
  version,
  checkedOn: CHECKED,
})

const label = (trade: string, file: string, version: string): ProphylaxisSource => ({
  short: `Інструкція ${trade}`,
  name: `Інструкція для медичного застосування: ${trade} (Державний реєстр лікарських засобів України)`,
  url: `${DRLZ}/${file}`,
  version,
  checkedOn: CHECKED,
})

const MSD_NEUTROPENIA = msd('Нейтропенія', 'Нейтропенія', 'hematology/leukopenias/neutropenia')
const MSD_PJP = msd(
  'Пневмоцистна пневмонія',
  'Pneumocystis jirovecii пневмонія',
  'pulmonary-disorders/pneumonia/pneumocystis-jirovecii-pneumonia',
)
const MSD_IMMUNODEFICIENCY = msd(
  'Підозра на імунодефіцит',
  'Підхід до пацієнта з підозрою на імунодефіцит',
  'immunology-allergic-disorders/immunodeficiency-disorders/approach-to-the-patient-with-suspected-immunodeficiency',
)
const MSD_SPLEEN = msd(
  'Селезінка',
  'Загальні відомості про селезінку',
  'hematology/spleen-disorders/overview-of-the-spleen',
)
const MSD_CLL = msd(
  'ХЛЛ',
  'Хронічний лімфолейкоз (ХЛЛ)',
  'oncology/leukemias/chronic-lymphocytic-leukemia-cll',
)

const NCCN_CLL = nccn(
  'CLL',
  'Chronic Lymphocytic Leukemia/Small Lymphocytic Lymphoma',
  'cll.pdf',
  'Version 1.2027 від 20.08.2026, Supportive Care (CSLL-C) і Discussion',
)
const NCCN_MM = nccn(
  'Myeloma',
  'Multiple Myeloma',
  'myeloma.pdf',
  'Version 1.2027 від 09.09.2026, Management of Infections (MYEL-K)',
)
const NCCN_BCELL = nccn(
  'B-Cell',
  'B-Cell Lymphomas',
  'b-cell.pdf',
  'Version 4.2026 від 20.05.2026, Supportive Care (NHODG-B)',
)
const NCCN_ALL = nccn(
  'ALL',
  'Acute Lymphoblastic Leukemia',
  'all.pdf',
  'Version 3.2026 від 17.09.2026, Discussion (Supportive Care)',
)

const BISEPTOL = label(
  'Бісептол® 400 мг/80 мг',
  '099F21252E48AB3F42258E5E00468E98/$file/UA30270102_4B01.mht',
  'РП UA/3027/01/02, версія реєстру від 13.08.2026',
)
const LEVAXELA = label(
  'Леваксела® 500 мг (левофлоксацин)',
  '2C9A4FE884E19C1A42258E9E004CED67/$file/UA155960202_8135.mht',
  'РП UA/15596/02/02, версія реєстру від 22.10.2026',
)

const p = (
  topic: ProphylaxisTopic,
  text: string,
  ...sources: ProphylaxisSource[]
): ProphylaxisPoint => ({ topic, text, sources })

export const PROPHYLAXIS: ProphylaxisSection[] = [
  {
    id: 'fluoroquinolone-neutropenia',
    title: 'Фторхінолон при очікуваній тривалій глибокій нейтропенії',
    drugIds: ['levofloxacin', 'ciprofloxacin', 'amoxicillin-clavulanate'],
    riskDrugIds: ['venetoclax'],
    classId: 'fluoroquinolones',
    points: [
      p(
        'who',
        'Афебрильна нейтропенія: профілактику можна розглянути; частина центрів дає левофлоксацин або ципрофлоксацин, якщо режим хіміотерапії зазвичай знижує нейтрофіли до ≤ 0,1 × 10⁹/л довше 7 днів',
        MSD_NEUTROPENIA,
      ),
      p(
        'who',
        'Без факторів ризику й з очікуваною нейтропенією < 7 днів антибактеріальна (і протигрибкова) профілактика рутинно не рекомендована',
        MSD_NEUTROPENIA,
      ),
      p(
        'who',
        'Мієлома: CAR-T і біспецифічні антитіла — левофлоксацин при АКН < 0,5 × 10⁹/л або на розсуд лікаря; вперше діагностована мієлома — розглянути левофлоксацин на 12 тижнів від діагнозу',
        NCCN_MM,
      ),
      p(
        'who',
        'ХЛЛ, нейтропенія від венетоклаксу: контроль крові, розглянути Г-КСФ і антибактеріальну та/або протигрибкову профілактику',
        NCCN_CLL,
      ),
      p(
        'timing',
        'Зазвичай починає онколог, який лікує; продовжують, доки нейтрофіли не перевищать 1,5 × 10⁹/л',
        MSD_NEUTROPENIA,
      ),
      p(
        'timing',
        'Мієлома (CAR-T, біспецифічні антитіла): від АКН < 0,5 × 10⁹/л до відновлення нейтрофілів',
        NCCN_MM,
      ),
      p(
        'dose',
        'Левофлоксацин 500 мг перорально 1 раз на добу (NCCN, мієлома). MSD дози профілактики не наводить',
        NCCN_MM,
        MSD_NEUTROPENIA,
      ),
      p(
        'alternative',
        'Мієлома: цефдинір 300 мг перорально 2 рази на добу (у каталозі немає) або амоксицилін/клавуланат («аугментин») 875 мг перорально 2 рази на добу',
        NCCN_MM,
      ),
      p(
        'caution',
        'Профілактики при нейтропенії серед показань інструкції немає — це застосування поза інструкцією',
        LEVAXELA,
      ),
      p(
        'caution',
        'Зміна мікробіому кишечника від профілактики може сповільнити відновлення кісткового мозку',
        MSD_NEUTROPENIA,
      ),
      p(
        'caution',
        'Резистентність: для MRSA дуже висока ймовірність корезистентності до фторхінолонів, зокрема левофлоксацину',
        LEVAXELA,
      ),
      p(
        'caution',
        'C. difficile: тяжка, стійка чи кривава діарея під час курсу або впродовж тижнів після нього — підозра на C. difficile; левофлоксацин негайно відмінити, засоби, що пригнічують перистальтику, протипоказані',
        LEVAXELA,
      ),
      p(
        'caution',
        'QT: обережно при вродженому чи набутому подовженні QT, разом з іншими засобами, що його подовжують (антиаритміки IA і III класів, трициклічні антидепресанти, макроліди, антипсихотики), при гіпокаліємії, гіпомагніємії, серцевій недостатності, інфаркті, брадикардії; чутливіші літні та молодші жінки',
        LEVAXELA,
      ),
      p(
        'caution',
        'Можливе пригнічення кісткового мозку (лейкопенія, нейтропенія, тромбоцитопенія, агранулоцитоз, апластична анемія) — при підозрі контролювати аналіз крові',
        LEVAXELA,
      ),
      p(
        'caution',
        'Протипоказання: епілепсія, ушкодження сухожиль від фторхінолонів в анамнезі, вік до 18 років, вагітність і годування груддю',
        LEVAXELA,
      ),
    ],
  },
  {
    id: 'pneumocystis',
    title: 'Pneumocystis jirovecii: ко-тримоксазол',
    drugIds: ['co-trimoxazole'],
    riskDrugIds: [
      'fludarabine',
      'cladribine',
      'bendamustine',
      'alemtuzumab',
      'idelalisib',
      'ibrutinib',
      'dexamethasone',
      'methotrexate',
    ],
    classId: 'sulfonamides',
    points: [
      p(
        'who',
        'Ризик: реципієнти трансплантатів органів; хворі на кортикостероїдах чи інших імуносупресантах. Профілактика показана багатьом ВІЛ-негативним хворим із ризиком',
        MSD_PJP,
      ),
      p(
        'who',
        'ХЛЛ: під час лікування й після нього (якщо переноситься) — інгібітори PI3K (іделалісиб), хіміоімунотерапія на основі пуринових аналогів чи бендамустину, алемтузумаб, кортикостероїди; разом із профілактикою герпесвірусів (ацикловір або еквівалент)',
        NCCN_CLL,
      ),
      p(
        'who',
        'ХЛЛ на інгібіторах BTK — розглянути профілактику PJP і VZV, якщо ризик опортуністичних інфекцій підвищений',
        NCCN_CLL,
      ),
      p(
        'who',
        'ГЛЛ на інтенсивній хіміотерапії або після алогенної ТГСК — висока сприйнятливість до інфекцій, серед опортуністичних — P. jirovecii, особливо при тривалій нейтропенії; конкретну профілактику NCCN ALL відсилає до настанови NCCN з інфекцій',
        NCCN_ALL,
      ),
      p(
        'who',
        'Т-клітинні порушення (первинні імунодефіцити) — профілактика P. jirovecii антибіотиком',
        MSD_IMMUNODEFICIENCY,
      ),
      p(
        'timing',
        'Мієлома, CAR-T і біспецифічні антитіла: почати разом із терапією; продовжувати щонайменше 6 міс після інфузії або до CD4 ≥ 200/мм³ — що довше',
        NCCN_MM,
      ),
      p(
        'timing',
        'Мієлома, авто-ТГСК та інші ситуації: коли еквівалент дексаметазону > 40 мг/добу 4 дні на тиждень, або за клінічною потребою й протоколом установи',
        NCCN_MM,
      ),
      p(
        'timing',
        'ГЛЛ: на час високодозового метотрексату ко-тримоксазол призупинити (посилює токсичність метотрексату) і відновити після його виведення',
        NCCN_ALL,
      ),
      p(
        'dose',
        'Профілактика, дорослі й діти від 12 років: 960 мг ко-тримоксазолу (2 таблетки по 480 мг) 1 раз на добу, «протягом 7 днів» — так у тексті інструкції; при поганій переносимості можна розглянути 480 мг на добу',
        BISEPTOL,
      ),
      p(
        'dose',
        'Первинні імунодефіцити (ризик серйозних чи специфічних інфекцій): ко-тримоксазол 5 мг/кг перорально 2 рази на добу',
        MSD_IMMUNODEFICIENCY,
      ),
      p('dose', 'NCCN CLL і Multiple Myeloma доз ко-тримоксазолу не наводять', NCCN_CLL, NCCN_MM),
      p(
        'alternative',
        'При непереносимості ко-тримоксазолу — дапсон або інгаляційний пентамідин (у каталозі немає жодного)',
        MSD_PJP,
      ),
      p(
        'alternative',
        'Мієлома: ко-тримоксазол, або пентамідин, або атоваквон (у каталозі немає ні пентамідину, ні атоваквону)',
        NCCN_MM,
      ),
      p(
        'caution',
        'Фолінова кислота знижує протимікробну ефективність ко-тримоксазолу — описано саме при профілактиці й лікуванні PJP',
        BISEPTOL,
      ),
      p(
        'caution',
        'Гіперкаліємія: обережно разом з іАПФ, блокаторами рецепторів ангіотензину, калійзберігаючими діуретиками (спіронолактон)',
        BISEPTOL,
      ),
      p(
        'discrepancy',
        'Доза: інструкція Бісептолу — 960 мг 1 раз на добу (або 480 мг при поганій переносимості); MSD (первинні імунодефіцити) — 5 мг/кг 2 рази на добу без уточнення, за яким компонентом рахувати; NCCN дози не дає. Котру застосувати — вирішує лікар',
        BISEPTOL,
        MSD_IMMUNODEFICIENCY,
        NCCN_CLL,
      ),
    ],
  },
  {
    id: 'asplenia',
    title: 'Аспленія',
    drugIds: [],
    riskDrugIds: [],
    classId: 'penicillins',
    points: [
      p(
        'who',
        'Аспленія будь-якої причини (спленектомія, функціональна) значно підвищує ризик тяжкого сепсису від інкапсульованих бактерій: передусім S. pneumoniae, інколи Hib чи N. meningitidis; також бабезіозу',
        MSD_SPLEEN,
      ),
      p(
        'who',
        'Часто призначають щоденну антибіотикопрофілактику пеніциліном або амоксициліном, особливо при регулярному контакті з дітьми',
        MSD_SPLEEN,
      ),
      p(
        'who',
        'Ризик серйозних інфекцій (зокрема аспленія) — профілактичні антибіотики, наприклад ко-тримоксазол',
        MSD_IMMUNODEFICIENCY,
      ),
      p(
        'timing',
        'Оптимальна тривалість не визначена: з часом печінка частково перебирає на себе очищення крові від мікробів',
        MSD_SPLEEN,
      ),
      p(
        'dose',
        'Пеніцилін чи амоксицилін — дози MSD не наводить: без розрахунку. Перорального пеніциліну й амоксициліну без клавуланату в каталозі немає',
        MSD_SPLEEN,
      ),
      p(
        'caution',
        'Вакцинація: пневмококова, менінгококова, Hib; грип, COVID-19 та інші — за клінічною ситуацією',
        MSD_SPLEEN,
      ),
      p(
        'caution',
        'Гарячка при аспленії — емпіричні антибіотики часто починають ще під час пошуку джерела',
        MSD_SPLEEN,
      ),
    ],
  },
  {
    id: 'hypogammaglobulinemia',
    title: 'Гіпогамаглобулінемія: замісна терапія імуноглобуліном',
    drugIds: ['immunoglobulin-human-iv'],
    riskDrugIds: ['rituximab', 'obinutuzumab'],
    points: [
      p(
        'who',
        'ХЛЛ: гіпогамаглобулінемія розвивається до ⅔ хворих; імуноглобулін — при рефрактерних інфекціях або профілактично, якщо за 6 міс було ≥ 2 тяжкі інфекції',
        MSD_CLL,
      ),
      p(
        'who',
        'ХЛЛ: IgG < 500 мг/дл і рецидивні синопульмональні інфекції, що потребують в/в антибіотиків чи госпіталізації',
        NCCN_CLL,
      ),
      p(
        'who',
        'Мієлома: IgG < 400 мг/дл (при IgG-мієломі віднімати М-градієнт — рахується лише поліклональний IgG); при CAR-T і біспецифічних антитілах — з початку терапії незалежно від рівня IgG',
        NCCN_MM,
      ),
      p(
        'who',
        'B-клітинні лімфоми: анти-CD20 антитіла й CD19 CAR-T можуть спричинити гіпогамаглобулінемію; при рецидивних інфекціях може допомогти замісна терапія ВВІГ',
        NCCN_BCELL,
      ),
      p(
        'dose',
        'ХЛЛ: ВВІГ 0,3–0,5 г/кг щомісяця (або підшкірний імуноглобулін щотижня в еквівалентній дозі); дозу й інтервал підбирати під мінімальний рівень IgG ≈ 500 мг/дл',
        NCCN_CLL,
      ),
      p(
        'dose',
        'Первинний дефіцит антитіл: ВВІГ зазвичай 400 мг/кг щомісяця, з повільною початковою швидкістю; при недостатній відповіді — 800 мг/кг щомісяця; підшкірний — 100–150 мг/кг щотижня',
        MSD_IMMUNODEFICIENCY,
      ),
      p(
        'caution',
        'ВВІГ знижує частоту інфекцій при ХЛЛ, але не покращує загальну виживаність',
        NCCN_CLL,
      ),
      p(
        'caution',
        'Хворі на ВВІГ можуть мати позитивний HBcAb через саму інфузію',
        NCCN_CLL,
        NCCN_BCELL,
      ),
      p(
        'discrepancy',
        'Поріг і ціль: NCCN CLL — IgG < 500 мг/дл з рецидивними інфекціями, мінімум ≈ 500 мг/дл; NCCN Myeloma — IgG < 400 мг/дл; MSD CLL — критерій за інфекціями, без порогу IgG; MSD (первинні) — ціль мінімального IgG > 600 мг/дл',
        NCCN_CLL,
        NCCN_MM,
        MSD_CLL,
        MSD_IMMUNODEFICIENCY,
      ),
    ],
  },
]

/** All the text of a point the search box looks through. */
function pointText(point: ProphylaxisPoint): string {
  return [point.text, ...point.sources.map((source) => source.short)].join(' ')
}

/**
 * The sections with only the points that contain the lower-cased query; a section whose title
 * matches stays whole. All of them for an empty query.
 */
export function findProphylaxis(needle: string): ProphylaxisSection[] {
  if (needle === '') return PROPHYLAXIS
  return PROPHYLAXIS.flatMap((section) => {
    if (section.title.toLowerCase().includes(needle)) return [section]
    const points = section.points.filter((point) => pointText(point).toLowerCase().includes(needle))
    return points.length > 0 ? [{ ...section, points }] : []
  })
}
