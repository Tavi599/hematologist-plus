import '@mantine/core/styles.css'
import './lib/i18n'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'

import { App } from './app/App'
import { AppErrorBoundary } from './app/AppErrorBoundary'
import { AppProviders } from './app/AppProviders'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <AppProviders>
        <HashRouter>
          <App />
        </HashRouter>
      </AppProviders>
    </AppErrorBoundary>
  </StrictMode>,
)
