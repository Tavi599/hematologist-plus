import { Navigate, Route, Routes } from 'react-router'

import { CalculatorPage } from '../pages/CalculatorPage/CalculatorPage'
import { DiseaseDetailPage } from '../pages/DiseaseDetailPage/DiseaseDetailPage'
import { PathwayPage } from '../pages/PathwayPage/PathwayPage'
import { DiseasesPage } from '../pages/DiseasesPage/DiseasesPage'
import { HandbookChapterPage } from '../pages/HandbookChapterPage/HandbookChapterPage'
import { HandbookPage } from '../pages/HandbookPage/HandbookPage'
import { NeedPage } from '../pages/NeedPage/NeedPage'
import { NotFoundPage } from '../pages/NotFoundPage/NotFoundPage'
import { ProposalsPage } from '../pages/ProposalsPage/ProposalsPage'
import { ScoresPage } from '../pages/ScoresPage/ScoresPage'
import { SourcesPage } from '../pages/SourcesPage/SourcesPage'
import { AppLayout } from './layout/AppLayout'
import { routes } from './routes'

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to={routes.calculator} replace />} />
        <Route path={routes.calculator} element={<CalculatorPage />} />
        <Route path={routes.need} element={<NeedPage />} />
        <Route path={routes.diseases} element={<DiseasesPage />} />
        <Route path={`${routes.diseases}/:slug`} element={<DiseaseDetailPage />} />
        <Route path={`${routes.diseases}/:slug/pathways`} element={<PathwayPage />} />
        <Route path={routes.scores} element={<ScoresPage />} />
        <Route path={routes.handbook} element={<HandbookPage />} />
        <Route path={`${routes.handbook}/:number`} element={<HandbookChapterPage />} />
        <Route path={routes.sources} element={<SourcesPage />} />
        <Route path={routes.proposals} element={<ProposalsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
