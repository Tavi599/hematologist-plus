import { describe, expect, it } from 'vitest'

import { indexCatalog } from './catalog-index'
import { demoCatalog } from './catalog.fixture'
import {
  collectSources,
  filterSources,
  groupSources,
  indexSources,
  itemSources,
  sourceKind,
  type SourceEntry,
} from './sources'

describe('collectSources', () => {
  it('lists every document once with everything that rests on it', () => {
    const catalog = demoCatalog()
    const protocol = { name: 'DEMO protocol', version: '1.0', checkedOn: '2026-09-19' }
    catalog.regimens[0]!.sources = [protocol]
    catalog.drugs[0]!.sources = [protocol]
    catalog.drug_infusion_params[0]!.sources = [{ name: 'SmPC', checkedOn: '2026-09-18' }]

    const entries = collectSources(indexCatalog(catalog), 'uk')
    const byName = new Map(entries.map((entry) => [entry.source.name, entry]))
    expect([...byName.keys()].sort()).toEqual(
      ['DEMO protocol', 'SmPC', 'ДЕМО: інший протокол'].sort(),
    )
    // One document, both places that rest on it.
    expect(
      byName
        .get('DEMO protocol')
        ?.uses.map((use) => use.kind)
        .sort(),
    ).toEqual(['drug', 'regimen'])
    // The alternative dose of the demo regimen names its own document.
    expect(byName.get('ДЕМО: інший протокол')?.uses[0]?.kind).toBe('dose')
  })

  it('is empty when nothing names a source', () => {
    const catalog = demoCatalog()
    for (const item of catalog.regimen_items) item.dose_options = []
    expect(collectSources(indexCatalog(catalog), 'uk')).toEqual([])
  })
})

describe('itemSources', () => {
  it('collects the regimen, drug and dilution documents without repeating one', () => {
    const catalog = demoCatalog()
    const shared = { name: 'Same document', checkedOn: '2026-09-19' }
    catalog.regimens[0]!.sources = [shared]
    catalog.drugs.find((drug) => drug.id === 'rituximab')!.sources = [shared]
    catalog.drug_infusion_params[0]!.sources = [{ name: 'SmPC', checkedOn: '2026-09-18' }]

    const sources = itemSources(indexCatalog(catalog), 'r-chop-21', 'rituximab', 'rituximab.nacl')
    expect(sources.map((source) => source.name)).toEqual(['Same document', 'SmPC'])
  })
})

function entry(name: string, checkedOn: string, version?: string): SourceEntry {
  return {
    source: version === undefined ? { name, checkedOn } : { name, checkedOn, version },
    uses: [{ kind: 'regimen', id: 'r', label: 'R-CHOP-21' }],
  }
}

describe('sourceKind', () => {
  it('reads the kind of document off the way the source names itself', () => {
    const kinds = {
      'NSSG Oxford Haematology, L.38 Ibrutinib': 'nssg',
      'eviQ: Acute myeloid leukaemia — gilteritinib (протокол 3907)': 'eviq',
      'NCCN Guidelines, Multiple Myeloma, version 1.2026': 'nccn',
      'UpToDate: Treatment of relapsed or refractory mantle cell lymphoma': 'uptodate',
      'IDSA 2026 AMR Guidance, Table 1: suggested dosing': 'guideline',
      'SmPC Aciclovir 400mg Tablets (Wockhardt, emc), 4.2': 'label',
      'FDA label: RITUXAN (rituximab), 2.8': 'label',
      'EMA, Venclyxto (венетоклакс), коротка характеристика препарату': 'label',
      'Інструкція АМБІЛІП (UA/18341/01/01), «Спосіб застосування та дози»': 'label',
      'Державний реєстр лікарських засобів України, відкриті дані (reestr-lz.csv)': 'register',
      'ClinicalTrials.gov NCT04140487 (Aza-Ven-Gilt), опис груп лікування': 'trial',
      'Kadia T.M. та ін. Venetoclax plus intensive chemotherapy. Lancet Haematol. 2021;8(8):e552':
        'publication',
      'Запис статті в PubMed (типи публікації за класифікацією NLM)': 'indexing',
      'Перелік препаратів відділення: Список_препаратів_з_доз.xlsx': 'department',
      'Дизайн відділення «Ритуксимаб» (Google Таблиці)': 'department',
      'Якийсь папірець': 'other',
    }
    for (const [name, kind] of Object.entries(kinds)) {
      expect(sourceKind({ name, checkedOn: '2026-01-01' }), name).toBe(kind)
    }
  })

  it('reads a guideline published in a journal as the publication it is', () => {
    expect(
      sourceKind({
        name: 'Kochanek M et al. Management of sepsis in neutropenic cancer patients: 2018 guidelines from AGIHO. Ann Hematol. 2019;98(5):1051',
        checkedOn: '2026-01-01',
      }),
    ).toBe('publication')
  })
})

describe('groupSources', () => {
  it('groups by kind in a fixed order and names the oldest check of each group', () => {
    const groups = groupSources([
      entry('Публікація. Blood. 2021;137(1):1', '2026-05-01'),
      entry('NSSG Oxford Haematology, L.38 Ibrutinib', '2026-09-19'),
      entry('NSSG Oxford Haematology, L.66 DA-EPOCH-R', '2026-02-03'),
    ])
    expect(groups.map((group) => group.kind)).toEqual(['nssg', 'publication'])
    expect(groups[0]?.entries).toHaveLength(2)
    expect(groups[0]?.oldestCheckedOn).toBe('2026-02-03')
    expect(groups[1]?.oldestCheckedOn).toBe('2026-05-01')
  })

  it('leaves out a kind nothing belongs to', () => {
    expect(groupSources([])).toEqual([])
  })
})

describe('filterSources', () => {
  const index = indexSources([
    entry('NSSG Oxford Haematology, L.38 Ibrutinib', '2026-09-19', '2.1'),
    entry('SmPC Aciclovir 400mg Tablets', '2026-09-18'),
  ])

  it('returns everything for an empty query', () => {
    expect(filterSources(index, '   ')).toHaveLength(2)
  })

  it('matches the name of the document, whatever the case', () => {
    expect(filterSources(index, 'aciclovir').map((found) => found.source.name)).toEqual([
      'SmPC Aciclovir 400mg Tablets',
    ])
  })

  it('matches the version and what rests on the document', () => {
    expect(filterSources(index, '2.1')).toHaveLength(1)
    expect(filterSources(index, 'r-chop')).toHaveLength(2)
    expect(filterSources(index, 'бендамустин')).toEqual([])
  })
})
