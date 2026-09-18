/**
 * Ukrainian INN (as written in the hospital's lists) → catalog id and English INN.
 * Only translation, never clinical data. Names that are not here are reported by the
 * importer instead of being guessed.
 */

export interface DrugName {
  id: string
  uk: string
  en: string
  tradeNames?: string[]
  /** Two active substances: a single strength in mg would be meaningless. */
  combination?: boolean
}

/** Rows that are deliberately not drugs of the catalog. */
export interface SkippedName {
  skip: string
}

const NAMES: DrugName[] = [
  { id: 'acalabrutinib', uk: 'Акалабрутиніб', en: 'Acalabrutinib' },
  { id: 'aciclovir', uk: 'Ацикловір', en: 'Aciclovir' },
  { id: 'allopurinol', uk: 'Алопуринол', en: 'Allopurinol' },
  { id: 'amikacin', uk: 'Амікацин', en: 'Amikacin' },
  {
    id: 'amoxicillin-clavulanate',
    uk: 'Амоксицилін/Клавуланат',
    en: 'Amoxicillin/clavulanic acid',
    combination: true,
  },
  {
    id: 'ampicillin-sulbactam',
    uk: 'Ампіцилін/Сульбактам',
    en: 'Ampicillin/sulbactam',
    combination: true,
  },
  { id: 'aprepitant', uk: 'Апрепітант', en: 'Aprepitant' },
  { id: 'articaine', uk: 'Артикаїн', en: 'Articaine', tradeNames: ['Ультракаїн'] },
  { id: 'azacitidine', uk: 'Азацитидин', en: 'Azacitidine' },
  { id: 'bendamustine', uk: 'Бендамустин', en: 'Bendamustine' },
  { id: 'bortezomib', uk: 'Бортезоміб', en: 'Bortezomib' },
  { id: 'bosutinib', uk: 'Бозутиніб', en: 'Bosutinib' },
  { id: 'brentuximab-vedotin', uk: 'Брентуксимаб ведотин', en: 'Brentuximab vedotin' },
  { id: 'calcium-folinate', uk: 'Кальцію фолінат', en: 'Calcium folinate' },
  { id: 'carboplatin', uk: 'Карбоплатин', en: 'Carboplatin' },
  { id: 'carfilzomib', uk: 'Карфілзоміб', en: 'Carfilzomib' },
  { id: 'caspofungin', uk: 'Каспофунгін', en: 'Caspofungin' },
  { id: 'cefepime', uk: 'Цефепім', en: 'Cefepime' },
  {
    id: 'cefoperazone-sulbactam',
    uk: 'Цефоперазон/Сульбактам',
    en: 'Cefoperazone/sulbactam',
    combination: true,
  },
  { id: 'cefotaxime', uk: 'Цефотаксим', en: 'Cefotaxime' },
  {
    id: 'ceftazidime-avibactam',
    uk: 'Цефтазидим/Авібактам',
    en: 'Ceftazidime/avibactam',
    combination: true,
  },
  { id: 'chlorambucil', uk: 'Хлорамбуцил', en: 'Chlorambucil' },
  { id: 'chloropyramine', uk: 'Хлоропірамін', en: 'Chloropyramine', tradeNames: ['Супрастин'] },
  { id: 'ciclosporin', uk: 'Циклоспорин', en: 'Ciclosporin' },
  { id: 'ciprofloxacin', uk: 'Ципрофлоксацин', en: 'Ciprofloxacin' },
  { id: 'cisplatin', uk: 'Цисплатин', en: 'Cisplatin' },
  { id: 'cladribine', uk: 'Кладрибін', en: 'Cladribine' },
  { id: 'clarithromycin', uk: 'Кларитроміцин', en: 'Clarithromycin' },
  { id: 'colistimethate-sodium', uk: 'Колістиметат натрію', en: 'Colistimethate sodium' },
  { id: 'cyclophosphamide', uk: 'Циклофосфамід', en: 'Cyclophosphamide', tradeNames: ['Ендоксан'] },
  { id: 'cytarabine', uk: 'Цитарабін', en: 'Cytarabine' },
  { id: 'dacarbazine', uk: 'Дакарбазин', en: 'Dacarbazine' },
  { id: 'daratumumab', uk: 'Даратумумаб', en: 'Daratumumab' },
  { id: 'darbepoetin-alfa', uk: 'Дарбепоетин альфа', en: 'Darbepoetin alfa' },
  { id: 'dasatinib', uk: 'Дазатиніб', en: 'Dasatinib' },
  { id: 'daunorubicin', uk: 'Даунорубіцин', en: 'Daunorubicin' },
  { id: 'decitabine', uk: 'Децитабін', en: 'Decitabine' },
  { id: 'deferasirox', uk: 'Деферасірокс', en: 'Deferasirox' },
  { id: 'denosumab', uk: 'Деносумаб', en: 'Denosumab' },
  { id: 'dexamethasone', uk: 'Дексаметазон', en: 'Dexamethasone' },
  { id: 'dimethyl-fumarate', uk: 'Диметилфумарат', en: 'Dimethyl fumarate' },
  { id: 'diphenhydramine', uk: 'Дифенгідрамін', en: 'Diphenhydramine', tradeNames: ['Димедрол'] },
  { id: 'docetaxel', uk: 'Доцетаксел', en: 'Docetaxel' },
  { id: 'doxorubicin', uk: 'Доксорубіцин', en: 'Doxorubicin' },
  {
    id: 'doxorubicin-liposomal',
    uk: 'Доксорубіцин ліпосомальний',
    en: 'Liposomal doxorubicin',
  },
  { id: 'doxycycline', uk: 'Доксициклін', en: 'Doxycycline' },
  { id: 'eltrombopag', uk: 'Ельтромбопаг', en: 'Eltrombopag' },
  { id: 'epirubicin', uk: 'Епірубіцин', en: 'Epirubicin' },
  { id: 'etoposide', uk: 'Етопозид', en: 'Etoposide' },
  { id: 'everolimus', uk: 'Еверолімус', en: 'Everolimus' },
  { id: 'fentanyl-patch', uk: 'Фентаніл, трансдермальний пластир', en: 'Fentanyl patch' },
  { id: 'filgrastim', uk: 'Філграстим', en: 'Filgrastim' },
  { id: 'fingolimod', uk: 'Фінголімод', en: 'Fingolimod' },
  { id: 'fluconazole', uk: 'Флуконазол', en: 'Fluconazole' },
  { id: 'fludarabine', uk: 'Флударабін', en: 'Fludarabine' },
  { id: 'fluorouracil', uk: 'Фторурацил', en: 'Fluorouracil' },
  { id: 'fulvestrant', uk: 'Фулвестрант', en: 'Fulvestrant' },
  { id: 'gemcitabine', uk: 'Гемцитабін', en: 'Gemcitabine' },
  { id: 'gemtuzumab-ozogamicin', uk: 'Гемтузумаб озогаміцин', en: 'Gemtuzumab ozogamicin' },
  { id: 'gilteritinib', uk: 'Гілтеритиніб', en: 'Gilteritinib' },
  { id: 'glatiramer-acetate', uk: 'Глатирамеру ацетат', en: 'Glatiramer acetate' },
  { id: 'goserelin', uk: 'Гозерелін', en: 'Goserelin' },
  { id: 'human-albumin', uk: 'Альбумін людини', en: 'Human albumin' },
  { id: 'human-immunoglobulin', uk: 'Імуноглобулін людини нормальний', en: 'Human immunoglobulin' },
  { id: 'hydroxycarbamide', uk: 'Гідроксикарбамід', en: 'Hydroxycarbamide' },
  { id: 'ibandronic-acid', uk: 'Ібандронова кислота', en: 'Ibandronic acid' },
  { id: 'ibrutinib', uk: 'Ібрутиніб', en: 'Ibrutinib' },
  { id: 'ifosfamide', uk: 'Іфосфамід', en: 'Ifosfamide' },
  { id: 'imatinib', uk: 'Іматиніб', en: 'Imatinib' },
  {
    id: 'imipenem-cilastatin',
    uk: 'Іміпенем/Циластатин',
    en: 'Imipenem/cilastatin',
    combination: true,
  },
  { id: 'inotuzumab-ozogamicin', uk: 'Інотузумаб озогаміцин', en: 'Inotuzumab ozogamicin' },
  { id: 'interferon-alfa-2b', uk: 'Інтерферон альфа-2b', en: 'Interferon alfa-2b' },
  { id: 'irinotecan', uk: 'Іринотекан', en: 'Irinotecan' },
  { id: 'ivosidenib', uk: 'Івосиденіб', en: 'Ivosidenib' },
  { id: 'ixazomib', uk: 'Іксазоміб', en: 'Ixazomib' },
  { id: 'lenalidomide', uk: 'Леналідомід', en: 'Lenalidomide' },
  { id: 'letermovir', uk: 'Летермовір', en: 'Letermovir' },
  { id: 'letrozole', uk: 'Летрозол', en: 'Letrozole' },
  { id: 'levofloxacin', uk: 'Левофлоксацин', en: 'Levofloxacin' },
  { id: 'lidocaine', uk: 'Лідокаїн', en: 'Lidocaine' },
  { id: 'linezolid', uk: 'Лінезолід', en: 'Linezolid' },
  { id: 'melphalan', uk: 'Мелфалан', en: 'Melphalan' },
  { id: 'meropenem', uk: 'Меропенем', en: 'Meropenem' },
  { id: 'mesna', uk: 'Месна', en: 'Mesna' },
  { id: 'metamizole', uk: 'Метамізол натрію', en: 'Metamizole sodium', tradeNames: ['Аналгін'] },
  { id: 'methotrexate', uk: 'Метотрексат', en: 'Methotrexate' },
  { id: 'methylprednisolone', uk: 'Метилпреднізолон', en: 'Methylprednisolone' },
  { id: 'midostaurin', uk: 'Мідостаурин', en: 'Midostaurin' },
  { id: 'mitoxantrone', uk: 'Мітоксантрон', en: 'Mitoxantrone' },
  { id: 'moxifloxacin', uk: 'Моксифлоксацин', en: 'Moxifloxacin', tradeNames: ['Авелокс'] },
  { id: 'mycophenolate-mofetil', uk: 'Мікофенолату мофетил', en: 'Mycophenolate mofetil' },
  { id: 'nilotinib', uk: 'Нілотиніб', en: 'Nilotinib' },
  { id: 'nivolumab', uk: 'Ніволумаб', en: 'Nivolumab' },
  { id: 'obinutuzumab', uk: 'Обінутузумаб', en: 'Obinutuzumab' },
  { id: 'ondansetron', uk: 'Ондансетрон', en: 'Ondansetron' },
  { id: 'oxaliplatin', uk: 'Оксаліплатин', en: 'Oxaliplatin' },
  { id: 'paclitaxel', uk: 'Паклітаксел', en: 'Paclitaxel' },
  { id: 'paracetamol', uk: 'Парацетамол', en: 'Paracetamol' },
  { id: 'pembrolizumab', uk: 'Пембролізумаб', en: 'Pembrolizumab' },
  { id: 'pemetrexed', uk: 'Пеметрексед', en: 'Pemetrexed' },
  {
    id: 'piperacillin-tazobactam',
    uk: 'Піперацилін/Тазобактам',
    en: 'Piperacillin/tazobactam',
    combination: true,
  },
  { id: 'polatuzumab-vedotin', uk: 'Полатузумаб ведотин', en: 'Polatuzumab vedotin' },
  { id: 'pomalidomide', uk: 'Помалідомід', en: 'Pomalidomide' },
  { id: 'posaconazole', uk: 'Посаконазол', en: 'Posaconazole' },
  { id: 'prednisolone', uk: 'Преднізолон', en: 'Prednisolone' },
  { id: 'procarbazine', uk: 'Прокарбазин', en: 'Procarbazine' },
  { id: 'rasburicase', uk: 'Расбуриказа', en: 'Rasburicase' },
  { id: 'rituximab', uk: 'Ритуксимаб', en: 'Rituximab' },
  { id: 'ruxolitinib', uk: 'Руксолітиніб', en: 'Ruxolitinib' },
  { id: 'tacrolimus', uk: 'Такролімус', en: 'Tacrolimus' },
  { id: 'teicoplanin', uk: 'Тейкопланін', en: 'Teicoplanin' },
  { id: 'thalidomide', uk: 'Талідомід', en: 'Thalidomide' },
  { id: 'trastuzumab', uk: 'Трастузумаб', en: 'Trastuzumab' },
  {
    id: 'trimethoprim-sulfamethoxazole',
    uk: 'Триметоприм/сульфаметоксазол',
    en: 'Trimethoprim/sulfamethoxazole',
    combination: true,
  },
  { id: 'valaciclovir', uk: 'Валацикловір', en: 'Valaciclovir' },
  { id: 'valganciclovir', uk: 'Валганцикловір', en: 'Valganciclovir' },
  { id: 'vancomycin', uk: 'Ванкоміцин', en: 'Vancomycin' },
  { id: 'venetoclax', uk: 'Венетоклакс', en: 'Venetoclax' },
  { id: 'vinblastine', uk: 'Вінбластин', en: 'Vinblastine' },
  { id: 'vincristine', uk: 'Вінкристин', en: 'Vincristine' },
  { id: 'vinorelbine', uk: 'Вінорельбін', en: 'Vinorelbine' },
  { id: 'voriconazole', uk: 'Вориконазол', en: 'Voriconazole' },
  { id: 'zoledronic-acid', uk: 'Золедронова кислота', en: 'Zoledronic acid' },
  { id: 'abiraterone', uk: 'Абіратерон', en: 'Abiraterone' },
  { id: 'anagrelide', uk: 'Анагрелід', en: 'Anagrelide' },
  {
    id: 'anti-thymocyte-globulin-rabbit',
    uk: 'Антитимоцитарний глобулін кролячий',
    en: 'Anti-thymocyte globulin (rabbit)',
  },
  { id: 'asciminib', uk: 'Асцимініб', en: 'Asciminib' },
  { id: 'bicalutamide', uk: 'Бікалутамід', en: 'Bicalutamide' },
  { id: 'bleomycin', uk: 'Блеоміцин', en: 'Bleomycin' },
  { id: 'exemestane', uk: 'Екземестан', en: 'Exemestane' },
  { id: 'idarubicin', uk: 'Ідарубіцин', en: 'Idarubicin' },
  { id: 'pegfilgrastim', uk: 'Пегфілграстим', en: 'Pegfilgrastim' },
  { id: 'ravulizumab', uk: 'Равулізумаб', en: 'Ravulizumab' },
  { id: 'tretinoin', uk: 'Третиноїн (ATRA)', en: 'Tretinoin (ATRA)', tradeNames: ['Весаноїд'] },
]

/** Spellings met in the source files, mapped to the entry above. */
const ALIASES: Record<string, string> = {
  'іміпенем+циластатин': 'imipenem-cilastatin',
  'іміпінем циластатин': 'imipenem-cilastatin',
  'цефтазидим авібактам': 'ceftazidime-avibactam',
  'піперацелін/тазобактам': 'piperacillin-tazobactam',
  ендоксан: 'cyclophosphamide',
  'моксифлоксацин (авелокс)': 'moxifloxacin',
  'димедрол (дифенгідрамін)': 'diphenhydramine',
  'супрастин (хлоропірамін)': 'chloropyramine',
  'артикаїн (ультракаїн)': 'articaine',
  'метамізол натрію (аналгін)': 'metamizole',
  'фентаніл трансдермальний пластир': 'fentanyl-patch',
  '5-фторурацил': 'fluorouracil',
  дарбопоетин: 'darbepoetin-alfa',
  гілтерітиніб: 'gilteritinib',
  івосіденіб: 'ivosidenib',
  обінітузумаб: 'obinutuzumab',
  'імуноглобулін людський': 'human-immunoglobulin',
  'імуноглобулін людський для в/в введення': 'human-immunoglobulin',
  'імуноглобулін людини нормальний': 'human-immunoglobulin',
  'са фолінат': 'calcium-folinate',
  філстим: 'filgrastim',
  колістин: 'colistimethate-sodium',
  'весаноїд (трансретиноєва кислота) (atra)': 'tretinoin',
}

/** Carrier solutions: they are infusion parameters of other drugs, not catalog drugs. */
const SOLVENTS = ['натрію хлорид', 'глюкоза', 'вода для ін']

const BY_KEY = new Map<string, DrugName>()
for (const entry of NAMES) BY_KEY.set(entry.uk.toLowerCase(), entry)
for (const [alias, id] of Object.entries(ALIASES)) {
  const entry = NAMES.find((name) => name.id === id)
  if (entry) BY_KEY.set(alias, entry)
}

export function findDrugName(ukrainian: string): DrugName | SkippedName | null {
  const key = ukrainian
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,]+$/, '')
  if (SOLVENTS.some((solvent) => key.startsWith(solvent))) {
    return { skip: 'розчинник, не препарат довідника' }
  }
  return BY_KEY.get(key) ?? null
}

export const DRUG_NAMES = NAMES
