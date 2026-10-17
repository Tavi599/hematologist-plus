/**
 * Where a saved course goes and what it is called. The physician keeps courses in one folder
 * («Схеми»), a subfolder per patient named as the «full name» line of the calculator reads, and
 * each file named after the patient and the day it was written. Pure: the folder itself is
 * written by `save-folder.ts`, and the same names serve a plain download.
 *
 * The names hold the patient's name, so they stay on this device: they become a file and a
 * folder on its disk, and are never logged or sent anywhere.
 */

/** Characters Windows does not allow in a file or folder name, and control characters. */
// oxlint-disable-next-line no-control-regex
const FORBIDDEN = /[\\/:*?"<>|\u0000-\u001f]/g

/** Device names Windows reserves whatever the extension: «CON.xlsx» cannot be created either. */
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

/** Long enough for any name and date; well under the limits of a Windows path. */
const MAX_LENGTH = 100

/**
 * A name typed by a person made safe as one file or folder name: forbidden characters become a
 * space, runs of spaces collapse, and trailing dots and spaces go — Windows drops them silently,
 * which would make two different names the same folder. Empty when nothing usable is left.
 */
export function sanitizeName(raw: string): string {
  let name = raw.replace(FORBIDDEN, ' ').replace(/\s+/g, ' ').trim()
  name = name.slice(0, MAX_LENGTH).replace(/[. ]+$/, '')
  if (RESERVED.test(name)) name = `${name}_`
  return name
}

/** «17.10.2026» — the date as it is written on the department's papers. */
export function formatDayMonthYear(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}.${month}.${date.getFullYear()}`
}

export interface CourseFileTarget {
  /** The patient's subfolder, or null for the chosen folder itself. */
  folder: string | null
  /** The file name without extension: «Іваненко Іван Іванович 17.10.2026». */
  base: string
}

/**
 * Where a course is saved: in the patient's subfolder named after them, as «name date»; with
 * no name, in the folder itself as the fallback (`fallback` gets the date, e.g. «Курс {date}»).
 */
export function courseFileTarget(
  fullName: string,
  createdAt: Date,
  fallback: (date: string) => string,
): CourseFileTarget {
  const date = formatDayMonthYear(createdAt)
  const name = sanitizeName(fullName)
  if (name === '') return { folder: null, base: sanitizeName(fallback(date)) }
  return { folder: name, base: `${name} ${date}` }
}

/**
 * The first name of «base.ext», «base (2).ext», «base (3).ext»… that is not taken: a course
 * saved twice the same day must not silently replace the first file. Names are compared
 * ignoring case, as Windows does.
 */
export function uniqueFileName(base: string, extension: string, taken: Iterable<string>): string {
  const used = new Set([...taken].map((name) => name.toLowerCase()))
  for (let index = 1; ; index += 1) {
    const name = index === 1 ? `${base}.${extension}` : `${base} (${index}).${extension}`
    if (!used.has(name.toLowerCase())) return name
  }
}
