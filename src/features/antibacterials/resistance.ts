/**
 * Targeted therapy by resistance type: ESBL, AmpC, carbapenem-resistant Enterobacterales by
 * mechanism (no carbapenemase, KPC, OXA-48-like, NDM/MBL), difficult-to-treat P. aeruginosa,
 * carbapenem-resistant A. baumannii, S. maltophilia, and MRSA/VRE. For each: what to choose, the
 * alternatives, what to avoid, and what the leukaemia guidelines add for neutropenic patients.
 *
 * Every point is cut out of the sources it names — the IDSA 2026 guidance on antimicrobial-
 * resistant Gram-negative infections and the two ECIL-4 guidelines (empirical and targeted
 * therapy in leukaemia and HSCT) — and written as our own terse points, never as copied text. A
 * dose appears only where a source states it, as a `dose` point with that source. ECIL-4 dates
 * from 2011, before the newer beta-lactam/beta-lactamase-inhibitor combinations; where it and
 * IDSA differ, a `discrepancy` point names each side and decides nothing.
 *
 * Agents with no drug card are listed in `notInCatalog`, with their registration status in the
 * State Register (drlz.com.ua API, current registrations, read on `CHECKED`).
 */

export interface ResistanceSource {
  /** Short label shown after every point. */
  short: string
  name: string
  url: string
  /** Edition, year or DOI. */
  version?: string
  checkedOn: string
}

export type ResistanceTopic =
  'preferred' | 'alternative' | 'avoid' | 'heme' | 'dose' | 'discrepancy'

export const RESISTANCE_TOPICS: ResistanceTopic[] = [
  'preferred',
  'alternative',
  'avoid',
  'heme',
  'dose',
  'discrepancy',
]

export interface ResistancePoint {
  topic: ResistanceTopic
  text: string
  sources: ResistanceSource[]
}

export interface NotInCatalog {
  name: string
  /** `registered`: a current registration exists; `unregistered`: none was found. */
  status: 'registered' | 'unregistered'
  /** Registration certificate and trade name, for a registered agent. */
  registration?: string
}

export interface ResistanceSection {
  id: string
  title: string
  /** Drug cards in `data/drugs` the section names. */
  drugIds: string[]
  notInCatalog: NotInCatalog[]
  /** Class cards of `classes.ts` that hold related facts. */
  classIds: string[]
  /** Items of `DISCREPANCIES` in `classes.ts` that this section touches. */
  discrepancyIds?: string[]
  points: ResistancePoint[]
}

const CHECKED = '2026-11-22'

const IDSA: ResistanceSource = {
  short: 'IDSA 2026',
  name: 'IDSA 2026 Guidance on the Treatment of Antimicrobial Resistant Gram-Negative Infections (Tamma PD et al.)',
  url: 'https://www.idsociety.org/practice-guideline/amr-guidance/',
  version: 'версія 5.0, опубл. 30.07.2026, doi 10.1093/cid/ciag481',
  checkedOn: CHECKED,
}

const ECIL_EMPIRICAL: ResistanceSource = {
  short: 'ECIL-4, емпірична',
  name: 'ECIL-4: European guidelines for empirical antibacterial therapy for febrile neutropenic patients in the era of growing resistance (Averbuch D et al., Haematologica 2013;98:1826–35)',
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3856957/',
  version: 'ECIL-4, 2011; doi 10.3324/haematol.2013.091025',
  checkedOn: CHECKED,
}

const ECIL_TARGETED: ResistanceSource = {
  short: 'ECIL-4, цільова',
  name: 'ECIL-4: Targeted therapy against multi-resistant bacteria in leukemic and hematopoietic stem cell transplant recipients (Averbuch D et al., Haematologica 2013;98:1836–47)',
  url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3856958/',
  version: 'ECIL-4, 2011; doi 10.3324/haematol.2013.091330',
  checkedOn: CHECKED,
}

const p = (
  topic: ResistanceTopic,
  text: string,
  ...sources: ResistanceSource[]
): ResistancePoint => ({ topic, text, sources })

const unregistered = (name: string): NotInCatalog => ({ name, status: 'unregistered' })

const CEFIDEROCOL = unregistered('цефідерокол')
const MEROPENEM_VABORBACTAM = unregistered('меропенем/ваборбактам')
const IMIPENEM_RELEBACTAM = unregistered('іміпенем/циластатин/релебактам')
const ERAVACYCLINE = unregistered('еравациклін')
const MINOCYCLINE = unregistered('міноциклін')
const CEFTOLOZANE_TAZOBACTAM = unregistered('цефтолозан/тазобактам')
const CEFEPIME_ENMETAZOBACTAM = unregistered('цефепім/енметазобактам')
const SULBACTAM_DURLOBACTAM = unregistered('сульбактам/дурлобактам')

export const RESISTANCE: ResistanceSection[] = [
  {
    id: 'principles',
    title: 'Загальні принципи цільової терапії в гематології',
    drugIds: [],
    notInCatalog: [],
    classIds: [],
    points: [
      p(
        'preferred',
        'Вибір — за чутливістю in vitro, найкращим препаратом для виду й фенотипу, ФК/ФД і співвідношенням користь/ризик; якщо активний вужчий препарат — переходити на нього (AI)',
        ECIL_TARGETED,
      ),
      p(
        'preferred',
        'За однакової активності й концентрації у вогнищі пеніциліни чи їх комбінації з інгібітором бета-лактамаз кращі за цефалоспорини й карбапенеми (BII)',
        ECIL_TARGETED,
      ),
      p(
        'heme',
        'Документована інфекція: щонайменше 7 днів, до ерадикації й клінічного розрішення та ≥4 днів без лихоманки (BIII); якщо на момент відміни нейтропенія триває — спостерігати 24–48 год, профілактику відновити (CIII)',
        ECIL_TARGETED,
      ),
      p(
        'heme',
        'Ризик резистентних збудників: колонізація чи інфекція ними в анамнезі (ESBL, карбапенемази, A. baumannii, P. aeruginosa, S. maltophilia, MRSA, VRE), недавні антибіотики широкого спектра (особливо за останній місяць), профілактика фторхінолонами',
        ECIL_EMPIRICAL,
      ),
      p(
        'heme',
        'Деескалаційна стратегія (одразу широкий режим, потім звуження) — при відомій колонізації резистентними, ускладненому перебігу чи високій частці резистентності у відділенні; вона не замінює інфекційного контролю',
        ECIL_EMPIRICAL,
      ),
      p(
        'heme',
        'У центрах з високою поширеністю резистентності — скринінг колонізації (ректальний мазок) при госпіталізації й далі 1–2 рази на тиждень',
        ECIL_EMPIRICAL,
      ),
      p(
        'heme',
        'Через 72–96 год без виділеного збудника: стабільному пацієнту не розширювати терапію лише через лихоманку; після стабілізації септичного шоку режим не змінювати навіть при негативних посівах',
        ECIL_EMPIRICAL,
      ),
    ],
  },
  {
    id: 'esbl',
    title: 'ESBL-продуценти Enterobacterales',
    drugIds: [
      'meropenem',
      'imipenem-cilastatin',
      'ertapenem',
      'ciprofloxacin',
      'levofloxacin',
      'co-trimoxazole',
      'amikacin',
      'gentamicin',
      'tobramycin',
      'fosfomycin',
      'piperacillin-tazobactam',
      'cefepime',
    ],
    notInCatalog: [CEFEPIME_ENMETAZOBACTAM],
    classIds: ['carbapenems', 'fluoroquinolones', 'sulfonamides', 'aminoglycosides'],
    points: [
      p(
        'preferred',
        'Поза сечовими шляхами (зокрема бактеріємія): меропенем, іміпенем або ертапенем; у критичному стані чи при гіпоальбумінемії — меропенем чи іміпенем, а не ертапенем',
        IDSA,
      ),
      p(
        'preferred',
        'Ускладнена ІСШ/пієлонефрит: ко-тримоксазол, ципрофлоксацин чи левофлоксацин за чутливості; карбапенем — коли ці не можна',
        IDSA,
      ),
      p(
        'preferred',
        'Пероральний перехід після стабілізації (адекватне всмоктування, чутливість): ципрофлоксацин, левофлоксацин або ко-тримоксазол',
        IDSA,
      ),
      p(
        'alternative',
        'Ускладнена ІСШ: аміноглікозиди, в/в фосфоміцин; піперацилін/тазобактам — лише не в критичному стані й без бактеріємії',
        IDSA,
      ),
      p(
        'avoid',
        'Піперацилін/тазобактам при інвазивній ESBL-інфекції: у дослідженні бактеріємії 30-денна виживаність нижча, ніж з меропенемом (88% проти 96%)',
        IDSA,
      ),
      p(
        'avoid',
        'Цефепім при ускладненій ІСШ та інвазивній інфекції навіть за формальної чутливості: ESBL його гідролізують, визначення МІК ненадійне',
        IDSA,
      ),
      p(
        'avoid',
        'При бактеріємії й інвазивній інфекції не підходять нітрофурантоїн, фосфоміцин, амоксицилін/клавуланат, доксициклін',
        IDSA,
      ),
      p(
        'avoid',
        'Нові комбінації (цефтазидим/авібактам, азтреонам/авібактам та ін.) — резерв для карбапенем-резистентних збудників, не для ESBL',
        IDSA,
      ),
    ],
  },
  {
    id: 'ampc',
    title: 'AmpC-продуценти Enterobacterales (індуцибельний AmpC)',
    drugIds: [
      'cefepime',
      'ceftriaxone',
      'cefotaxime',
      'ceftazidime',
      'piperacillin-tazobactam',
      'ciprofloxacin',
      'levofloxacin',
      'co-trimoxazole',
    ],
    notInCatalog: [],
    classIds: ['cephalosporins'],
    points: [
      p(
        'preferred',
        'Помірний ризик клінічно значущого AmpC: Enterobacter cloacae complex, Klebsiella aerogenes, Citrobacter freundii (і Hafnia alvei); Morganella, Providencia, Serratia — низький ризик, вибір за чутливістю',
        IDSA,
      ),
      p('preferred', 'Цефепім — препарат вибору, якщо МІК ≤8 мкг/мл і не виявлено гена ESBL', IDSA),
      p(
        'preferred',
        'Небета-лактами за чутливості: ускладнена ІСШ — ципрофлоксацин, левофлоксацин, ко-тримоксазол (з можливим переходом на пероральний прийом)',
        IDSA,
      ),
      p(
        'avoid',
        'Цефтріаксон, цефотаксим, цефтазидим при інвазивній інфекції: резистентність виникає під час лікування приблизно у 20%; виняток — нетяжка інфекція з явним покращенням і санованим вогнищем',
        IDSA,
      ),
      p(
        'avoid',
        'Піперацилін/тазобактам при інвазивній чи тяжкій інфекції — гірші результати в спостережних даних',
        IDSA,
      ),
    ],
  },
  {
    id: 'cre-non-cp',
    title: 'CRE без карбапенемази',
    drugIds: [
      'meropenem',
      'imipenem-cilastatin',
      'ertapenem',
      'ceftazidime-avibactam',
      'tigecycline',
      'aztreonam-avibactam',
    ],
    notInCatalog: [MEROPENEM_VABORBACTAM, IMIPENEM_RELEBACTAM, CEFIDEROCOL, ERAVACYCLINE],
    classIds: ['carbapenems', 'tetracyclines'],
    points: [
      p(
        'preferred',
        'Стійкість лише до ертапенему, МІК меропенему/іміпенему ≤1: меропенем чи іміпенем подовженою інфузією',
        IDSA,
      ),
      p(
        'preferred',
        'Нечутливі до всіх карбапенемів: цефтазидим/авібактам, іміпенем/релебактам, меропенем/ваборбактам, азтреонам/авібактам (трохи перевага цефтазидиму/авібактаму й іміпенему/релебактаму)',
        IDSA,
      ),
      p('alternative', 'Цефідерокол, еравациклін, тайгециклін', IDSA),
    ],
  },
  {
    id: 'cre-kpc',
    title: 'CRE: KPC',
    drugIds: [
      'ceftazidime-avibactam',
      'tigecycline',
      'meropenem',
      'colistimethate',
      'amikacin',
      'gentamicin',
      'aztreonam-avibactam',
    ],
    notInCatalog: [MEROPENEM_VABORBACTAM, IMIPENEM_RELEBACTAM, CEFIDEROCOL, ERAVACYCLINE],
    classIds: ['carbapenems', 'polypeptides', 'tetracyclines'],
    discrepancyIds: ['colistin-dose'],
    points: [
      p(
        'preferred',
        'Меропенем/ваборбактам, цефтазидим/авібактам, іміпенем/релебактам (панель трохи схиляється саме в такому порядку); резистентність під час лікування — близько 10% з цефтазидимом/авібактамом проти <3% з двома іншими',
        IDSA,
      ),
      p('alternative', 'Азтреонам/авібактам, цефідерокол', IDSA),
      p('alternative', 'Еравациклін, тайгециклін — лише поза кровотоком і сечовими шляхами', IDSA),
      p(
        'heme',
        'Карбапенем при KPC K. pneumoniae — лише якщо МІК ≤4 мг/л, у високій дозі подовженою інфузією і з другим активним препаратом; для KPC пропонувались комбінації колістину з аміноглікозидами та/або тайгецикліном',
        ECIL_TARGETED,
      ),
      p(
        'discrepancy',
        'ECIL-4 (2011, до появи нових інгібіторних комбінацій) за чутливості називає колістин/поліміксин B кращим варіантом для бета-лактам-резистентних Enterobacteriaceae й спирається на комбіновану терапію; IDSA 2026: перевага новим інгібіторним комбінаціям, комбінація не потрібна рутинно, коли підтверджено активний бета-лактам, а колістин — лише для неускладненої ІСШ: комбінація не потрібна рутинно, коли підтверджено активний бета-лактам, а поза сечовими шляхами поліміксин B кращий за колістин',
        ECIL_TARGETED,
        IDSA,
      ),
    ],
  },
  {
    id: 'cre-oxa48',
    title: 'CRE: OXA-48-подібні',
    drugIds: ['ceftazidime-avibactam', 'tigecycline', 'aztreonam-avibactam'],
    notInCatalog: [CEFIDEROCOL, ERAVACYCLINE, MEROPENEM_VABORBACTAM, IMIPENEM_RELEBACTAM],
    classIds: ['carbapenems'],
    points: [
      p(
        'preferred',
        'Цефтазидим/авібактам (>95% ізолятів чутливі in vitro; клінічні дані спостережні)',
        IDSA,
      ),
      p('alternative', 'Азтреонам/авібактам, цефідерокол, еравациклін, тайгециклін', IDSA),
      p(
        'avoid',
        'Меропенем/ваборбактам та іміпенем/релебактам — навіть якщо лабораторія повідомляє про чутливість',
        IDSA,
      ),
    ],
  },
  {
    id: 'cre-mbl',
    title: 'CRE: NDM та інші металобеталактамази',
    drugIds: [
      'ceftazidime-avibactam',
      'aztreonam',
      'fosfomycin',
      'tigecycline',
      'colistimethate',
      'aztreonam-avibactam',
      'polymyxin-b',
    ],
    notInCatalog: [CEFIDEROCOL, ERAVACYCLINE],
    classIds: ['monobactams', 'cephalosporins'],
    points: [
      p(
        'preferred',
        'Азтреонам/авібактам або цефідерокол (рівноцінні; панель трохи схиляється до азтреонаму/авібактаму)',
        IDSA,
      ),
      p('alternative', 'Цефтазидим/авібактам + азтреонам — коли азтреонам/авібактаму немає', IDSA),
      p(
        'alternative',
        'Стійкість і до азтреонаму/авібактаму, і до цефідероколу: індивідуальні комбінації (в/в фосфоміцин, поліміксин B, тайгециклін)',
        IDSA,
      ),
      p('avoid', 'Меропенем/ваборбактам та іміпенем/релебактам на NDM не діють', IDSA),
      p('heme', 'Продуценти NDM зазвичай резистентні й до аміноглікозидів', ECIL_TARGETED),
    ],
  },
  {
    id: 'dtr-pa',
    title: 'Pseudomonas aeruginosa з важкою резистентністю (DTR)',
    drugIds: [
      'cefepime',
      'ceftazidime',
      'aztreonam',
      'piperacillin-tazobactam',
      'ceftazidime-avibactam',
      'amikacin',
      'tobramycin',
      'colistimethate',
      'polymyxin-b',
      'aztreonam-avibactam',
    ],
    notInCatalog: [CEFTOLOZANE_TAZOBACTAM, IMIPENEM_RELEBACTAM, CEFIDEROCOL],
    classIds: ['cephalosporins', 'aminoglycosides', 'polypeptides'],
    points: [
      p(
        'preferred',
        'DTR — нечутливість до всіх: азтреонаму, цефепіму, цефтазидиму, ципрофлоксацину, іміпенему, левофлоксацину, меропенему, піперациліну/тазобактаму',
        IDSA,
      ),
      p(
        'preferred',
        'Карбапенем-резистентна, але чутлива до традиційних бета-лактамів: традиційний бета-лактам у високій дозі подовженою інфузією, а не новий препарат (нові — для критичного стану чи несанованого вогнища)',
        IDSA,
      ),
      p(
        'preferred',
        'Поза сечовими шляхами: цефтолозан/тазобактам, цефтазидим/авібактам, іміпенем/релебактам; при пневмонії — цефтолозан/тазобактам; ускладнена ІСШ — ще й цефідерокол',
        IDSA,
      ),
      p(
        'preferred',
        'Металобеталактамаза (VIM, IMP, NDM): цефідерокол; цефтазидим/авібактам + азтреонам — лише при резистентності до цефідероколу',
        IDSA,
      ),
      p(
        'alternative',
        'Немає активного бета-лактаму: тобраміцин (за чутливості) або поліміксин B + новий бета-лактам з МІК найближчою до порогу',
        IDSA,
      ),
      p(
        'avoid',
        'Комбінована терапія, коли активний новий бета-лактам підтверджено; монотерапія аміноглікозидом поза сечовими шляхами; азтреонам/авібактам при MBL-продукуючій P. aeruginosa',
        IDSA,
      ),
      p(
        'heme',
        'Резистентність до нових бета-лактамів виникає приблизно у 20% — повторювати антибіотикограму наступних ізолятів',
        IDSA,
      ),
      p(
        'heme',
        'Метааналізи не показали різниці в летальності між бета-лактам + аміноглікозид і бета-лактамом окремо при нейтропенії, але для критичного стану й P. aeruginosa користі не виключено',
        ECIL_TARGETED,
      ),
      p(
        'dose',
        'Цефепім 2 г в/в кожні 8 год інфузією щонайменше 3 год (високодозовий подовжений режим)',
        IDSA,
      ),
    ],
  },
  {
    id: 'crab',
    title: 'Карбапенем-резистентний Acinetobacter baumannii (CRAB)',
    drugIds: [
      'imipenem-cilastatin',
      'meropenem',
      'tigecycline',
      'colistimethate',
      'ampicillin-sulbactam',
      'polymyxin-b',
    ],
    notInCatalog: [SULBACTAM_DURLOBACTAM, CEFIDEROCOL, MINOCYCLINE],
    classIds: ['carbapenems', 'tetracyclines', 'polypeptides'],
    points: [
      p('preferred', 'Сульбактам/дурлобактам + іміпенем чи меропенем', IDSA),
      p(
        'alternative',
        'Поки сульбактаму/дурлобактаму немає — ампіцилін/сульбактам у високій дозі разом з другим препаратом (цефідерокол, міноциклін або поліміксин B), навіть якщо ізолят формально чутливий',
        IDSA,
      ),
      p(
        'alternative',
        'Цефідерокол, поліміксин B, міноциклін — лише в комбінації; з тетрациклінів міноциклін кращий за тайгециклін',
        IDSA,
      ),
      p(
        'avoid',
        'Небулайзерні антибіотики рутинно (без користі для виживання); омадациклін — лише якщо немає ні міноцикліну, ні тайгецикліну',
        IDSA,
      ),
      p(
        'heme',
        'Карбапенем-резистентні штами можуть лишатися чутливими до сульбактаму; колістин і тайгециклін мають певну активність, до тайгецикліну можлива резистентність під час лікування',
        ECIL_TARGETED,
      ),
      p(
        'dose',
        'Ампіцилін/сульбактам: сумарно 9 г сульбактаму на добу (напр. 9 г комбінації в/в кожні 8 год подовженою інфузією)',
        IDSA,
      ),
      p(
        'dose',
        'Тайгециклін у високій дозі: 200 мг в/в навантажувальна, далі 100 мг кожні 12 год',
        IDSA,
      ),
    ],
  },
  {
    id: 'steno',
    title: 'Stenotrophomonas maltophilia',
    drugIds: [
      'co-trimoxazole',
      'levofloxacin',
      'ceftazidime-avibactam',
      'aztreonam',
      'ceftazidime',
      'aztreonam-avibactam',
    ],
    notInCatalog: [CEFIDEROCOL, MINOCYCLINE],
    classIds: ['sulfonamides', 'fluoroquinolones'],
    points: [
      p(
        'preferred',
        'Цефідерокол монотерапією (на підставі чутливості й даних на нейтропенічних тваринах; клінічних даних мало)',
        IDSA,
      ),
      p(
        'alternative',
        'Азтреонам/авібактам (краще в комбінації); цефтазидим/авібактам + азтреонам, якщо азтреонам/авібактаму немає',
        IDSA,
      ),
      p(
        'alternative',
        'Левофлоксацин, міноциклін, ко-тримоксазол — лише як компоненти комбінації (до левофлоксацину резистентність під час лікування ~20%)',
        IDSA,
      ),
      p('avoid', 'Цефтазидим (природні бета-лактамази L1/L2, порогів чутливості немає)', IDSA),
      p(
        'heme',
        'Ко-тримоксазол — препарат вибору (AI); у нейтропенічних чи тяжких пацієнтів розглянути комбінацію з тикарциліном/клавуланатом або цефалоспорином III покоління',
        ECIL_TARGETED,
      ),
      p(
        'discrepancy',
        'ECIL-4 (2011): ко-тримоксазол — препарат вибору; IDSA 2026: препарат вибору — цефідерокол, а ко-тримоксазол лише в комбінації, бо in vitro він щонайбільше бактеріостатичний',
        ECIL_TARGETED,
        IDSA,
      ),
    ],
  },
  {
    id: 'mrsa-vre',
    title: 'MRSA і VRE у гематологічних пацієнтів',
    drugIds: ['vancomycin', 'teicoplanin', 'linezolid', 'daptomycin', 'tigecycline'],
    notInCatalog: [],
    classIds: ['glycopeptides', 'oxazolidinones'],
    points: [
      p(
        'heme',
        'Лінезолід проти ванкоміцину у 605 пацієнтів з фебрильною нейтропенією — рівна ефективність, менше побічних реакцій; але тромбоцитопенія/нейтропенія у 2–11%, тож контроль кровотворення',
        ECIL_TARGETED,
      ),
      p(
        'avoid',
        'Даптоміцин при підозрі на пневмонію чи пневмонії (інактивується в легенях); після впливу глікопептидів перевіряти МІК даптоміцину — можлива перехресна резистентність',
        ECIL_TARGETED,
      ),
      p(
        'preferred',
        'VRE: лінезолід і тайгециклін майже завжди активні in vitro; даптоміцин для E. faecium — поза інструкцією, МІК часто 2–4 мг/л',
        ECIL_TARGETED,
      ),
      p(
        'dose',
        'Даптоміцин при VRE (E. faecium): 10–12 мг/кг на добу — значно вище зареєстрованих 4–6 мг/кг, обґрунтовано при високому мікробному навантаженні, клінічних даних мало',
        ECIL_TARGETED,
      ),
    ],
  },
]

/** All the text of a point the search box looks through. */
function pointText(point: ResistancePoint): string {
  return [point.text, ...point.sources.map((source) => source.short)].join(' ')
}

/**
 * The sections with only the points that contain the lower-cased query; a section whose title or
 * absent agents match stays whole. All of them for an empty query.
 */
export function findResistance(needle: string): ResistanceSection[] {
  if (needle === '') return RESISTANCE
  return RESISTANCE.flatMap((section) => {
    const head = [section.title, ...section.notInCatalog.map((item) => item.name)].join(' ')
    if (head.toLowerCase().includes(needle)) return [section]
    const points = section.points.filter((point) => pointText(point).toLowerCase().includes(needle))
    return points.length > 0 ? [{ ...section, points }] : []
  })
}
