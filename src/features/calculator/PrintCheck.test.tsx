import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '../../test/render'

import { PrintCheck } from './PrintCheck'
import type { Deviation } from './deviations'

const REDUCTION: Deviation = {
  kind: 'reduction',
  itemId: 'r-chop-21.doxorubicin',
  drug: 'Доксорубіцин',
  values: { percent: 25 },
  changesDose: true,
}

const SHEET: Deviation = {
  kind: 'sheet',
  itemId: 'r-chop-21.prednisolone',
  drug: 'Преднізолон',
  values: { sheet: 'ward' },
  changesDose: false,
}

describe('PrintCheck', () => {
  it('repeats what changes a dose and what is given without premedication', () => {
    renderWithProviders(
      <PrintCheck
        deviations={[REDUCTION, SHEET]}
        premedication={['Ритуксимаб — без премедикації: день 1']}
        irradiated
      />,
    )

    expect(screen.getByText('Перед друком')).toBeInTheDocument()
    expect(screen.getByText('Ритуксимаб — без премедикації: день 1')).toBeInTheDocument()
    expect(screen.getByText('Доксорубіцин: редукція 25%')).toBeInTheDocument()
    expect(screen.getByText(/опромінених компонентів крові/)).toBeInTheDocument()
    // The ones that only move a row are counted, not listed again.
    expect(screen.getByText('Інші відхилення від схеми: 1')).toBeInTheDocument()
    expect(screen.queryByText(/Преднізолон/)).not.toBeInTheDocument()
  })

  it('says in one line that there is nothing to look at', () => {
    renderWithProviders(<PrintCheck deviations={[]} premedication={[]} irradiated={false} />)

    expect(
      screen.getByText('Перед друком: дози за схемою, премедикація на місці.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
