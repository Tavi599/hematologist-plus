import type {
  HandbookAbbreviation,
  HandbookBook,
  HandbookChapter,
  HandbookIndexEntry,
  HandbookPart,
  HandbookTranslation,
} from './handbook'

/** A two-chapter stand-in for the handbook, enough to exercise the pages. */
export const demoBook = (): HandbookBook => ({
  title: 'The EBMT Handbook',
  edition: '8th edition, 2024',
  editors: 'A. Sureda et al.',
  publisher: 'Springer, Cham',
  isbn: '978-3-031-44079-3',
  doi: '10.1007/978-3-031-44080-9',
  url: 'https://doi.org/10.1007/978-3-031-44080-9',
  copyright: '© The Author(s) 2024',
  licence: 'CC BY 4.0',
  licence_url: 'https://creativecommons.org/licenses/by/4.0/',
  changes_uk: ['Текст перенесено з PDF.'],
  changes_en: ['The text was carried over from the PDF.'],
})

export const demoParts = (): HandbookPart[] => [
  { roman: 'I', title_en: 'Introduction', leaders: 'Anna Sureda' },
  { roman: 'III', title_en: 'Methodology and Clinical Aspects', leaders: '' },
]

export const demoIndex = (): HandbookIndexEntry[] => [
  {
    number: 1,
    part: 'I',
    title_en: 'HCT: Historical Perspective',
    authors: 'Noa Granot and Rainer Storb',
    page_printed: 3,
    blocks: 3,
    references: 1,
    headings: [{ id: 'h1', num: '1.1', en: 'Introduction' }],
  },
  {
    number: 13,
    part: 'III',
    title_en: 'Conditioning',
    authors: 'Avichai Shimoni',
    page_printed: 125,
    blocks: 4,
    references: 1,
    headings: [{ id: 'h13', num: '13.1', en: 'An Overview' }],
  },
]

export const demoAbbreviations = (): HandbookAbbreviation[] => [
  { abbr: 'GVHD', en: 'Graft-versus-host disease' },
  { abbr: 'TBI', en: 'Total body irradiation' },
]

export const demoChapter = (): HandbookChapter => ({
  number: 13,
  part: 'III',
  page_printed: 125,
  title_en: 'Conditioning',
  authors: 'Avichai Shimoni, Vera Radici, and Arnon Nagler',
  affiliations: 'Hematology Division, Chaim Sheba Medical Center',
  doi: '10.1007/978-3-031-44080-9_13',
  blocks: [
    { id: 'h13', type: 'h2', num: '13.1', en: 'An Overview' },
    { id: 'p1', type: 'p', en: 'Hematopoietic cell transplantation is a curative procedure.' },
    { id: 'p2', type: 'p', en: 'A conditioning regimen consists of two components.' },
    {
      id: 't1',
      type: 'table',
      num: '13.1',
      en: 'Table 13.1 Randomized studies',
      columns: 2,
      rows_en: [
        ['Author', 'Outcome'],
        ['Lee et al. (2013)', 'BuCy better RI and OS'],
      ],
    },
  ],
  references: ['Bacigalupo A, et al. Defining the intensity of conditioning. 2009;15:1628–33.'],
})

export const demoTranslation = (): HandbookTranslation => ({
  title: 'Кондиціонування',
  blocks: {
    h13: 'Загальний огляд',
    p1: 'Трансплантація гемопоетичних клітин — потенційно куративна процедура.',
  },
  rows: {},
  references: {},
})
