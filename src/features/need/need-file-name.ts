/**
 * What the handed-in file is called. The department asked for the drug itself in the name rather
 * than the word «потреба»: the forms pile up in one folder, go out by e-mail and come back in
 * replies, and «Потреба 2026-10-03» says nothing about which of them is which.
 */

/** Windows forbids these outright, and a file that will not save is worse than a long name. */
const FORBIDDEN = /[\/:*?"<>|]/g

/** Enough names to tell two forms apart; past that the name stops being readable. */
const NAMES_IN_FILE_NAME = 3

/**
 * The keyword of a drug's name: what stands before the strength. «Ритуксимаб 500 мг» gives
 * «Ритуксимаб», «Вориконазол Аккорд 200 мг» gives «Вориконазол Аккорд» — the brand matters,
 * because that is what the order names.
 */
export function drugKeyword(name: string): string {
  const words: string[] = []
  for (const word of name.trim().split(/\s+/)) {
    // The strength starts the part of the name the file does not need: everything after it is
    // a number, a unit, or a form.
    if (word === '' || /\d/.test(word)) break
    words.push(word)
    if (words.length === 2) break
  }
  return words.join(' ')
}

/**
 * The file name without its extension. `more` is appended when the form holds more drugs than
 * fit; `fallback` stands in when no line names a drug yet.
 */
export function needFileName(
  names: string[],
  date: string,
  { fallback, more }: { fallback: string; more: string },
): string {
  const keywords: string[] = []
  for (const name of names) {
    const keyword = drugKeyword(name)
    if (keyword !== '' && !keywords.some((seen) => seen.toLowerCase() === keyword.toLowerCase())) {
      keywords.push(keyword)
    }
  }
  const shown = keywords.slice(0, NAMES_IN_FILE_NAME).join(', ')
  const subject =
    keywords.length === 0
      ? fallback
      : keywords.length > NAMES_IN_FILE_NAME
        ? `${shown} ${more}`
        : shown
  return `${subject} ${date}`.replace(FORBIDDEN, ' ').replace(/\s+/g, ' ').trim()
}
