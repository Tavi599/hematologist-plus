import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'

import { AppProviders } from '../app/AppProviders'

/**
 * Renders a component with the app providers. `path` makes route params (`/diseases/:slug`)
 * available to the component under test.
 */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', path }: { route?: string; path?: string } = {},
) {
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={[route]}>
        {path === undefined ? ui : <Routes>{<Route path={path} element={ui} />}</Routes>}
      </MemoryRouter>
    </AppProviders>,
  )
}
