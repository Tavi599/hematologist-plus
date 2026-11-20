/**
 * Spectrum of action as a table: rows are classes of `CLASSES` (split into single drugs where the
 * source itself tells them apart), columns are the resistant or hard-to-reach pathogens a
 * haematology ward worries about. Every cell is cut out of the MSD Manual Professional
 * (Ukrainian edition) page it names, written as our own short note. Where the page does not say
 * it outright the cell is `unstated` — a gap in the source, never a guess filled in.
 *
 * `yes` — the page names the pathogen as covered (the note keeps qualifiers such as «багато
 * штамів»); `partial` — only some drugs of the row or only some strains; `no` — the page says the
 * row is not active, or the pathogen falls under a group the page names as resistant.
 */

export type Pathogen = 'mrsa' | 'vre' | 'pseudomonas' | 'esbl' | 'cre' | 'anaerobes' | 'atypical'

export const PATHOGENS: Pathogen[] = [
  'mrsa',
  'vre',
  'pseudomonas',
  'esbl',
  'cre',
  'anaerobes',
  'atypical',
]

export type Coverage = 'yes' | 'partial' | 'no' | 'unstated'

export const COVERAGES: Coverage[] = ['yes', 'partial', 'no', 'unstated']

export interface SpectrumCell {
  value: Coverage
  /** What the page says, in our own words. */
  note: string
  /** Page slug under MSD_BASE. */
  page: string
  /** The day the page was read. */
  checkedOn: string
}

export interface SpectrumRow {
  /** Id of the class in `CLASSES`. */
  classId: string
  label: string
  cells: Record<Pathogen, SpectrumCell>
}

/** The day the pages were read for this table. */
export const SPECTRUM_CHECKED_ON = '2026-11-20'

const c = (value: Coverage, page: string, note: string): SpectrumCell => ({
  value,
  note,
  page,
  checkedOn: SPECTRUM_CHECKED_ON,
})

const silent = (page: string, note = 'Сторінка про це прямо не пише'): SpectrumCell =>
  c('unstated', page, note)

const BL = 'overview-of-beta-lactams'
const PEN = 'penicillins'
const CEPH = 'cephalosporins'
const CARB = 'carbapenems'
const FQ = 'fluoroquinolones'

export const SPECTRUM: SpectrumRow[] = [
  {
    classId: 'penicillins',
    label: 'Піперацилін/тазобактам',
    cells: {
      mrsa: silent(
        PEN,
        'Тазобактам додає лише чутливі до метициліну S. aureus; про MRSA не сказано',
      ),
      vre: silent(PEN),
      pseudomonas: c('yes', PEN, 'Багато штамів P. aeruginosa; синергія з аміноглікозидами'),
      esbl: c('partial', PEN, 'Тазобактам пригнічує ESBL лише частково'),
      cre: c('no', PEN, 'Не діє на грамнегативні бацили, що виробляють KPC'),
      anaerobes: c('yes', PEN, 'З тазобактамом — грамнегативні анаеробні бацили'),
      atypical: silent(PEN),
    },
  },
  {
    classId: 'penicillins',
    label: 'Інші пеніциліни (пеніцилін G, амінопеніциліни ± інгібітор, протистафілококові)',
    cells: {
      mrsa: silent(
        PEN,
        'Протистафілококові — проти чутливих до метициліну S. aureus; про MRSA не сказано',
      ),
      vre: silent(
        PEN,
        'Ентерококи названо серед чутливих до ампіциліну й пеніциліну G; про VRE не сказано',
      ),
      pseudomonas: silent(PEN, 'Антисиньогнійним названо лише піперацилін/тазобактам'),
      esbl: silent(
        BL,
        'Клавуланат і сульбактам блокують деякі ESBL in vitro, клінічне застосування проти ESBL не перевірене',
      ),
      cre: c('no', BL, 'Клавуланат, сульбактам, тазобактам не блокують карбапенемази'),
      anaerobes: c(
        'partial',
        PEN,
        'З інгібітором — види Bacteroides; пеніцилін G — окремі клостридіальні інфекції, багато анаеробних грамнегативних бацил резистентні',
      ),
      atypical: silent(PEN),
    },
  },
  {
    classId: 'cephalosporins',
    label: 'Цефалоспорини I–IV покоління',
    cells: {
      mrsa: c(
        'no',
        CEPH,
        'Не діють на метицилін-резистентні стафілококи (крім цефтароліну й цефтобіпролу); з цефтазидимом/цефепімом для MRSA додають ванкоміцин',
      ),
      vre: c('no', CEPH, 'Не діють на ентерококи'),
      pseudomonas: c(
        'partial',
        CEPH,
        'Лише цефтазидим, цефоперазон і цефепім; інші цефалоспорини III покоління — ні',
      ),
      esbl: c(
        'no',
        CEPH,
        'III покоління — лише Enterobacterales без AmpC/ESBL; ESBL гідролізують більшість цефалоспоринів (цефаміцини — більшість ESBL ні)',
      ),
      cre: c('no', BL, 'KPC гідролізують те саме, що ESBL, і ще карбапенеми'),
      anaerobes: c(
        'partial',
        CEPH,
        'Цефаміцини (цефокситин, цефотетан) активніші проти Bacteroides; до III–IV покоління для анаеробів додають інші препарати',
      ),
      atypical: c(
        'no',
        CEPH,
        'При позалікарняній пневмонії цефтріаксон поєднують з макролідом або фторхінолоном для атипових',
      ),
    },
  },
  {
    classId: 'cephalosporins',
    label: 'Цефтазидим/авібактам',
    cells: {
      mrsa: c(
        'no',
        CEPH,
        'Цефтазидим слабо діє на грампозитивні й не підходить для стафілококових інфекцій',
      ),
      vre: c('no', CEPH, 'Цефалоспорини не діють на ентерококи'),
      pseudomonas: c('yes', CEPH, 'Цефтазидим активний проти P. aeruginosa'),
      esbl: c('yes', CEPH, 'Авібактам додає Enterobacterales з AmpC, ESBL, KPC'),
      cre: c(
        'partial',
        CARB,
        'Серинові карбапенемази (KPC, OXA) — так; метало-бета-лактамази (NDM, VIM, IMP) — ні',
      ),
      anaerobes: c(
        'no',
        CEPH,
        'До цефалоспоринів III–IV покоління для анаеробів додають інші препарати',
      ),
      atypical: silent(CEPH),
    },
  },
  {
    classId: 'cephalosporins',
    label: 'Цефтаролін, цефтобіпрол (немає в каталозі)',
    cells: {
      mrsa: c('yes', CEPH, 'Активні проти MRSA'),
      vre: c('no', CEPH, 'Цефалоспорини не діють на ентерококи'),
      pseudomonas: c('no', CEPH, 'Не активні проти видів Pseudomonas'),
      esbl: c(
        'no',
        CEPH,
        'Проти грамнегативних — як III покоління, а воно діє лише на Enterobacterales без AmpC/ESBL',
      ),
      cre: silent(CEPH),
      anaerobes: silent(CEPH),
      atypical: silent(CEPH),
    },
  },
  {
    classId: 'cephalosporins',
    label: 'Цефідерокол (немає в каталозі)',
    cells: {
      mrsa: c('no', CEPH, 'Не активний проти грампозитивних'),
      vre: c('no', CEPH, 'Не активний проти грампозитивних'),
      pseudomonas: c('yes', CEPH, 'P. aeruginosa, також A. baumannii, S. maltophilia'),
      esbl: c('yes', CEPH, 'Кишкові грамнегативні з ESBL'),
      cre: c('yes', CEPH, 'Продуценти KPC і MBL; резерв для тяжких інвазивних інфекцій'),
      anaerobes: c('no', CEPH, 'Не активний проти анаеробів'),
      atypical: silent(CEPH),
    },
  },
  {
    classId: 'cephalosporins',
    label: 'Цефтолозан/тазобактам (немає в каталозі)',
    cells: {
      mrsa: silent(CEPH),
      vre: c('no', CEPH, 'Цефалоспорини не діють на ентерококи'),
      pseudomonas: c('yes', CEPH, 'Насамперед мультирезистентна P. aeruginosa'),
      esbl: c('partial', CEPH, 'Деякі штами з ESBL або AmpC'),
      cre: silent(CEPH),
      anaerobes: c('partial', CEPH, 'Деякі анаероби'),
      atypical: silent(CEPH),
    },
  },
  {
    classId: 'monobactams',
    label: 'Азтреонам',
    cells: {
      mrsa: c('no', 'monobactams', 'Грампозитивні резистентні'),
      vre: c('no', 'monobactams', 'Грампозитивні резистентні'),
      pseudomonas: c(
        'yes',
        'monobactams',
        'P. aeruginosa, як цефтазидим; синергія з аміноглікозидами',
      ),
      esbl: c('no', 'monobactams', 'Лише Enterobacterales без AmpC, ESBL, KPC'),
      cre: c(
        'no',
        BL,
        'Не діє на продуцентів KPC; до MBL стабільний, але такі штами часто мають інші ферменти, що його гідролізують',
      ),
      anaerobes: c('no', 'monobactams', 'Не активний проти анаеробів'),
      atypical: silent('monobactams'),
    },
  },
  {
    classId: 'carbapenems',
    label: 'Карбапенеми (меропенем, іміпенем, ертапенем)',
    cells: {
      mrsa: c('no', CARB, 'Метицилін-резистентні стафілококи резистентні'),
      vre: silent(
        CARB,
        'Про VRE не сказано; E. faecium резистентний, E. faecalis — чутливий до іміпенему (меропенем слабший), не до ертапенему',
      ),
      pseudomonas: c('partial', CARB, 'Іміпенем і меропенем — багато штамів; ертапенем — ні'),
      esbl: c('yes', CARB, 'Більшість Enterobacterales, зокрема з AmpC і ESBL'),
      cre: c(
        'no',
        CARB,
        'Карбапенемаза — головний механізм резистентності; меропенем/ваборбактам, іміпенем/релебактам діють на серинові карбапенемази, не на MBL',
      ),
      anaerobes: c('yes', CARB, 'Анаероби'),
      atypical: silent(CARB),
    },
  },
  {
    classId: 'aminoglycosides',
    label: 'Аміноглікозиди',
    cells: {
      mrsa: silent(
        'aminoglycosides',
        'Діють на більшість стафілококів, деякі резистентні; про MRSA не сказано',
      ),
      vre: silent(
        'aminoglycosides',
        'Ентерококи — лише як синергія при ендокардиті; резистентність ентерококів поширена',
      ),
      pseudomonas: silent(
        'aminoglycosides',
        'Більшість аеробних грамнегативних бацил; P. aeruginosa на сторінці окремо не названа',
      ),
      esbl: silent('aminoglycosides'),
      cre: silent('aminoglycosides'),
      anaerobes: c('no', 'aminoglycosides', 'Неактивні проти анаеробів'),
      atypical: silent('aminoglycosides'),
    },
  },
  {
    classId: 'fluoroquinolones',
    label: 'Фторхінолони',
    cells: {
      mrsa: c(
        'partial',
        FQ,
        'Нозокоміальні MRSA зазвичай резистентні; делафлоксацин — активний проти MRSA',
      ),
      vre: silent(FQ),
      pseudomonas: c(
        'yes',
        FQ,
        'Особливо ципрофлоксацин; делафлоксацин теж; резистентність P. aeruginosa зростає',
      ),
      esbl: silent(FQ),
      cre: silent(FQ),
      anaerobes: c(
        'partial',
        FQ,
        'Старі — малоефективні; моксифлоксацин — більшість клінічно значущих; делафлоксацин — так',
      ),
      atypical: c('yes', FQ, 'Mycoplasma, Chlamydia, Chlamydophila, Legionella'),
    },
  },
  {
    classId: 'glycopeptides',
    label: 'Ванкоміцин',
    cells: {
      mrsa: c('yes', 'vancomycin', 'MRSA і метицилін-резистентні КНС'),
      vre: c(
        'no',
        'vancomycin',
        'Ванкоміцин-резистентні штами — виняток; багато штамів ентерококів резистентні',
      ),
      pseudomonas: silent('vancomycin', 'Сторінка описує лише грампозитивні'),
      esbl: silent('vancomycin', 'Сторінка описує лише грампозитивні'),
      cre: silent('vancomycin', 'Сторінка описує лише грампозитивні'),
      anaerobes: silent('vancomycin', 'Лише перорально при діареї C. difficile'),
      atypical: silent('vancomycin'),
    },
  },
  {
    classId: 'lipoglycopeptides',
    label: 'Даптоміцин',
    cells: {
      mrsa: c('yes', 'daptomycin', 'Ванкоміцин- і метицилін-резистентний S. aureus'),
      vre: c('yes', 'daptomycin', 'VRE; резистентність може виникнути під час лікування'),
      pseudomonas: silent('daptomycin', 'Сторінка описує лише грампозитивні'),
      esbl: silent('daptomycin', 'Сторінка описує лише грампозитивні'),
      cre: silent('daptomycin', 'Сторінка описує лише грампозитивні'),
      anaerobes: silent('daptomycin'),
      atypical: silent('daptomycin'),
    },
  },
  {
    classId: 'lipoglycopeptides',
    label: 'Далбаванцин, оритаванцин, телаванцин (немає в каталозі)',
    cells: {
      mrsa: c('yes', 'lipoglycopeptides', 'S. aureus незалежно від чутливості до метициліну'),
      vre: c('partial', 'lipoglycopeptides', 'vanB VRE — усі три; vanA VRE — лише оритаванцин'),
      pseudomonas: silent('lipoglycopeptides', 'Сторінка описує лише грампозитивні'),
      esbl: silent('lipoglycopeptides', 'Сторінка описує лише грампозитивні'),
      cre: silent('lipoglycopeptides', 'Сторінка описує лише грампозитивні'),
      anaerobes: silent('lipoglycopeptides'),
      atypical: silent('lipoglycopeptides'),
    },
  },
  {
    classId: 'oxazolidinones',
    label: 'Лінезолід',
    cells: {
      mrsa: c('yes', 'linezolid-and-tedizolid', 'MRSA'),
      vre: c('yes', 'linezolid-and-tedizolid', 'VRE'),
      pseudomonas: silent('linezolid-and-tedizolid'),
      esbl: silent('linezolid-and-tedizolid'),
      cre: silent('linezolid-and-tedizolid'),
      anaerobes: c(
        'yes',
        'linezolid-and-tedizolid',
        'Fusobacterium, Prevotella, Porphyromonas, Bacteroides, пептострептококи',
      ),
      atypical: silent('linezolid-and-tedizolid'),
    },
  },
  {
    classId: 'clindamycin-macrolides',
    label: 'Кліндаміцин',
    cells: {
      mrsa: c(
        'partial',
        'clindamycin',
        'Більшість негоспітальних MRSA; залежить від місцевої резистентності (D-тест)',
      ),
      vre: c('no', 'clindamycin', 'Ентерококи резистентні'),
      pseudomonas: c('no', 'clindamycin', 'Аеробні грамнегативні бацили резистентні'),
      esbl: c('no', 'clindamycin', 'Аеробні грамнегативні бацили резистентні'),
      cre: c('no', 'clindamycin', 'Аеробні грамнегативні бацили резистентні'),
      anaerobes: c(
        'partial',
        'clindamycin',
        'Анаероби — так, але Bacteroides (зокрема B. fragilis) ненадійно',
      ),
      atypical: c('no', 'clindamycin', 'Немає достовірної дії на мікоплазми, хламідії, легіонели'),
    },
  },
  {
    classId: 'clindamycin-macrolides',
    label: 'Макроліди (азитроміцин, кларитроміцин, еритроміцин)',
    cells: {
      mrsa: c('no', 'macrolides', 'Багато штамів S. aureus, особливо MRSA, — виняток'),
      vre: c('no', 'macrolides', 'Більшість ентерококів — виняток'),
      pseudomonas: silent('macrolides'),
      esbl: silent('macrolides'),
      cre: silent('macrolides'),
      anaerobes: c(
        'partial',
        'macrolides',
        'Анаеробні грампозитивні коки — так; B. fragilis резистентні',
      ),
      atypical: c('yes', 'macrolides', 'Mycoplasma pneumoniae, Chlamydophila, Legionella'),
    },
  },
  {
    classId: 'metronidazole',
    label: 'Метронідазол',
    cells: {
      mrsa: c('no', 'metronidazole-and-tinidazole', 'Не діє на факультативні анаеробні й аеробні'),
      vre: c('no', 'metronidazole-and-tinidazole', 'Не діє на факультативні анаеробні й аеробні'),
      pseudomonas: c(
        'no',
        'metronidazole-and-tinidazole',
        'Не діє на факультативні анаеробні й аеробні',
      ),
      esbl: c('no', 'metronidazole-and-tinidazole', 'Не діє на факультативні анаеробні й аеробні'),
      cre: c('no', 'metronidazole-and-tinidazole', 'Не діє на факультативні анаеробні й аеробні'),
      anaerobes: c('yes', 'metronidazole-and-tinidazole', 'Усі облігатні анаероби'),
      atypical: silent('metronidazole-and-tinidazole'),
    },
  },
  {
    classId: 'polypeptides',
    label: 'Колістин, поліміксин B',
    cells: {
      mrsa: c(
        'no',
        'polypeptide-antibiotics-bacitracin-colistin-polymyxin-b',
        'Не активні проти грампозитивних',
      ),
      vre: c(
        'no',
        'polypeptide-antibiotics-bacitracin-colistin-polymyxin-b',
        'Не активні проти грампозитивних',
      ),
      pseudomonas: c(
        'yes',
        'polypeptide-antibiotics-bacitracin-colistin-polymyxin-b',
        'P. aeruginosa, Acinetobacter; лише коли немає менш токсичних варіантів',
      ),
      esbl: silent(
        'polypeptide-antibiotics-bacitracin-colistin-polymyxin-b',
        'Про ESBL не сказано; не діють на Proteus, Providencia, Serratia',
      ),
      cre: silent(
        'polypeptide-antibiotics-bacitracin-colistin-polymyxin-b',
        'Про карбапенемази не сказано; перевага — новим комбінаціям бета-лактам/інгібітор',
      ),
      anaerobes: silent(
        'polypeptide-antibiotics-bacitracin-colistin-polymyxin-b',
        'Не діють на деякі облігатні анаероби, зокрема B. fragilis',
      ),
      atypical: silent('polypeptide-antibiotics-bacitracin-colistin-polymyxin-b'),
    },
  },
  {
    classId: 'rifamycins',
    label: 'Рифампіцин',
    cells: {
      mrsa: silent(
        'rifamycins',
        'Стафілококові інфекції — лише з іншими протистафілококовими; про MRSA не сказано',
      ),
      vre: silent('rifamycins'),
      pseudomonas: silent('rifamycins'),
      esbl: silent('rifamycins'),
      cre: silent('rifamycins'),
      anaerobes: silent('rifamycins'),
      atypical: c(
        'partial',
        'rifamycins',
        'Legionella — разом з еритроміцином; окремо не застосовують через швидку резистентність',
      ),
    },
  },
  {
    classId: 'sulfonamides',
    label: 'Ко-тримоксазол',
    cells: {
      mrsa: c(
        'partial',
        'trimethoprim-and-sulfamethoxazole',
        'Деякі штами MRSA; препарат вибору перорально при неускладнених негоспітальних MRSA',
      ),
      vre: c('no', 'trimethoprim-and-sulfamethoxazole', 'Ентерококи резистентні'),
      pseudomonas: c('no', 'trimethoprim-and-sulfamethoxazole', 'Не активний проти P. aeruginosa'),
      esbl: silent(
        'trimethoprim-and-sulfamethoxazole',
        'Про ESBL не сказано; багато Enterobacterales резистентні',
      ),
      cre: silent(
        'trimethoprim-and-sulfamethoxazole',
        'Про карбапенемази не сказано; багато Enterobacterales резистентні',
      ),
      anaerobes: c('no', 'trimethoprim-and-sulfamethoxazole', 'Не активний проти анаеробів'),
      atypical: c(
        'no',
        'trimethoprim-and-sulfamethoxazole',
        'Не активний проти Mycoplasma; Chlamydia і Legionella не згадано',
      ),
    },
  },
  {
    classId: 'tetracyclines',
    label: 'Тетрацикліни (доксициклін, міноциклін)',
    cells: {
      mrsa: c('partial', 'tetracyclines', 'Деякі MRSA; найбільше досліджений міноциклін'),
      vre: silent('tetracyclines'),
      pseudomonas: silent('tetracyclines'),
      esbl: silent(
        'tetracyclines',
        'Про ESBL не сказано; багато грамнегативних уропатогенів резистентні',
      ),
      cre: silent('tetracyclines'),
      anaerobes: silent('tetracyclines'),
      atypical: c(
        'yes',
        'tetracyclines',
        'Mycoplasma, Chlamydia, Chlamydophila; Legionella не згадано',
      ),
    },
  },
  {
    classId: 'tetracyclines',
    label: 'Тайгециклін',
    cells: {
      mrsa: c('yes', 'tigecycline', 'MRSA (активність in vitro)'),
      vre: silent('tigecycline', 'Названо лише ванкоміцин-чутливий E. faecalis'),
      pseudomonas: c('no', 'tigecycline', 'Не ефективний проти P. aeruginosa'),
      esbl: c('partial', 'tigecycline', 'Деякі штами з ESBL (in vitro)'),
      cre: c(
        'partial',
        'tigecycline',
        'Деякі карбапенем-резистентні продуценти карбапенемаз (in vitro); не діє на Proteus, Providencia, Morganella; низькі рівні в крові',
      ),
      anaerobes: c('yes', 'tigecycline', 'B. fragilis, C. perfringens, C. difficile (in vitro)'),
      atypical: c('yes', 'tigecycline', 'Хламідії, Mycoplasma (in vitro)'),
    },
  },
  {
    classId: 'fosfomycin',
    label: 'Фосфоміцин',
    cells: {
      mrsa: c('yes', 'fosfomycin', 'MRSA'),
      vre: c('yes', 'fosfomycin', 'VRE'),
      pseudomonas: silent(
        'fosfomycin',
        'Пороги чутливості для в/в форми проти P. aeruginosa EUCAST не підтверджує',
      ),
      esbl: c(
        'partial',
        'fosfomycin',
        'Названо лише E. coli з ESBL; перорально — лише неускладнений цистит',
      ),
      cre: silent('fosfomycin'),
      anaerobes: silent('fosfomycin'),
      atypical: silent('fosfomycin'),
    },
  },
]
