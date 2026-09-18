/** Header of the printed sheets; prefilled from the hospitals table and editable on the form. */
export interface HeaderValue {
  hospitalId: string | null
  institution: string
  department: string
  head: string
  doctor: string
}

export function emptyHeader(): HeaderValue {
  return { hospitalId: null, institution: '', department: '', head: '', doctor: '' }
}
