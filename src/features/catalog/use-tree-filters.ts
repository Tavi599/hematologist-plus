import { useEffect, useState } from 'react'

import { PATIENT_CONDITIONS, type PatientCondition } from '../../schemas/common'

const KEY = 'treeFilters:'

export interface TreeFilters {
  query: string
  drugIds: string[]
  conditions: PatientCondition[]
  hideContraindicated: boolean
}

const EMPTY: TreeFilters = { query: '', drugIds: [], conditions: [], hideContraindicated: false }

/**
 * The filters of a disease's treatment tree, kept for this tab: the physician who opens a regimen
 * in the calculator and comes back finds the patient's conditions and drugs still chosen. A new
 * tab starts clean, as a new patient would; storage that is blocked only forgets.
 */
export function useTreeFilters(
  diseaseId: string,
): [TreeFilters, (change: Partial<TreeFilters>) => void] {
  const [filters, setFilters] = useState<TreeFilters>(() => read(diseaseId))

  useEffect(() => {
    try {
      window.sessionStorage.setItem(KEY + diseaseId, JSON.stringify(filters))
    } catch {
      // The filters still work; they are just not kept.
    }
  }, [diseaseId, filters])

  return [filters, (change) => setFilters((current) => ({ ...current, ...change }))]
}

function read(diseaseId: string): TreeFilters {
  try {
    const raw = window.sessionStorage.getItem(KEY + diseaseId)
    if (raw === null) return EMPTY
    const parsed = JSON.parse(raw) as Partial<TreeFilters>
    return {
      query: typeof parsed.query === 'string' ? parsed.query : '',
      drugIds: Array.isArray(parsed.drugIds)
        ? parsed.drugIds.filter((id): id is string => typeof id === 'string')
        : [],
      conditions: Array.isArray(parsed.conditions)
        ? parsed.conditions.filter((value): value is PatientCondition =>
            (PATIENT_CONDITIONS as readonly string[]).includes(value as string),
          )
        : [],
      hideContraindicated: parsed.hideContraindicated === true,
    }
  } catch {
    return EMPTY
  }
}
