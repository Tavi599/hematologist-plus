/** Parses "1, 8, 15" into day numbers; null when the input is not a day list. */
export function parseDays(value: string): number[] | null {
  const days = value
    .split(/[,;\s]+/)
    .filter(Boolean)
    .map(Number)
  if (days.length === 0 || days.some((day) => !Number.isInteger(day) || day < 0)) return null
  return [...new Set(days)].sort((a, b) => a - b)
}
