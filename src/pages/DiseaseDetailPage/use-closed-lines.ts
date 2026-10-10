import { useState, type SetStateAction } from 'react'

const KEY = 'closedLines:'

/**
 * The lines of treatment the physician has folded away on a disease, kept on this device: a line
 * that is never the patient's (trials, supportive care) stays closed on the next visit. Until the
 * physician folds or opens anything, `initial` is closed; storage that is blocked or empty falls
 * back to it as well.
 */
export function useClosedLines(
  diseaseId: string,
  initial: readonly string[],
): [ReadonlySet<string>, (value: SetStateAction<ReadonlySet<string>>) => void] {
  const [closed, setClosed] = useState(() => read(diseaseId) ?? new Set(initial))

  const set = (value: SetStateAction<ReadonlySet<string>>) =>
    setClosed((previous) => {
      const next = typeof value === 'function' ? value(previous) : value
      write(diseaseId, next)
      return next
    })
  return [closed, set]
}

function read(diseaseId: string): ReadonlySet<string> | null {
  try {
    const raw = window.localStorage.getItem(KEY + diseaseId)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed)
      ? new Set(parsed.filter((id): id is string => typeof id === 'string'))
      : null
  } catch {
    return null
  }
}

function write(diseaseId: string, closed: ReadonlySet<string>) {
  try {
    // An empty list is kept too: everything opened on purpose is not the default.
    window.localStorage.setItem(KEY + diseaseId, JSON.stringify([...closed]))
  } catch {
    // Folding still works for this visit; it is just not remembered.
  }
}
