import { Navigate, Route, Routes } from 'react-router'

import { CalculatorPage } from '../pages/CalculatorPage/CalculatorPage'
import { DiseaseDetailPage } from '../pages/DiseaseDetailPage/DiseaseDetailPage'
import { DiseasesPage } from '../pages/DiseasesPage/DiseasesPage'
import { NotFoundPage } from '../pages/NotFoundPage/NotFoundPage'
import { ProposalsPage } from '../pages/ProposalsPage/ProposalsPage'
import { SourcesPage } from '../pages/SourcesPage/SourcesPage'
import { AppLayout } from './layout/AppLayout'
import { routes } from './routes'

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to={routes.calculator} replace />} />
        <Route path={routes.calculator} element={<CalculatorPage />} />
        <Route path={routes.diseases} element={<DiseasesPage />} />
        <Route path={`${routes.diseases}/:slug`} element={<DiseaseDetailPage />} />
        <Route path={routes.sources} element={<SourcesPage />} />
        <Route path={routes.proposals} element={<ProposalsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
