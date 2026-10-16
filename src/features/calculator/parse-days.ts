/** A range longer than this is a typo, not a course: «1-700» is not read as 700 days. */
const MAX_RANGE_DAYS = 120

/**
 * Parses "1, 8, 15" or "1-7, 10" into day numbers; null when the input is not a day list. A range
 * is written with a hyphen or a dash, as the department writes «дні 1–7».
 */
export function parseDays(value: string): number[] | null {
  const tokens = value.split(/[,;\s]+/).filter(Boolean)
  if (tokens.length === 0) return null
  const days: number[] = []
  for (const token of tokens) {
    const range = /^(\d+)[-–—](\d+)$/.exec(token)
    if (range) {
      const from = Number(range[1])
      const to = Number(range[2])
      if (to < from || to - from >= MAX_RANGE_DAYS) return null
      for (let day = from; day <= to; day++) days.push(day)
      continue
    }
    const day = Number(token)
    if (!Number.isInteger(day) || day < 0) return null
    days.push(day)
  }
  return [...new Set(days)].sort((a, b) => a - b)
}

/** Day numbers as the physician would type them: runs of three or more as a range, «1-7, 10». */
export function formatDays(days: number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b)
  const parts: string[] = []
  for (let start = 0; start < sorted.length;) {
    let end = start
    while (end + 1 < sorted.length && sorted[end + 1] === sorted[end]! + 1) end++
    if (end - start >= 2) parts.push(`${sorted[start]}-${sorted[end]}`)
    else for (let index = start; index <= end; index++) parts.push(String(sorted[index]))
    start = end + 1
  }
  return parts.join(', ')
}
