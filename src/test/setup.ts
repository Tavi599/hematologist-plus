import '@testing-library/jest-dom/vitest'
import '../lib/i18n'

import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Script tests (scripts/**) run in the node environment without a DOM.
const hasDom = typeof window !== 'undefined'

afterEach(() => {
  if (!hasDom) return
  cleanup()
  localStorage.clear()
})

// jsdom lacks APIs Mantine relies on.
if (hasDom) installDomStubs()

function installDomStubs() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserverStub

  // A dropdown scrolls its selected option into view on a timer. jsdom has no scrolling, so the
  // timer throws after the test that opened the dropdown has finished — an unhandled error that
  // fails the whole run while every test passes.
  Element.prototype.scrollIntoView = () => {}
}

// The PWA virtual module exists only inside the Vite build.
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}))

// Tests never talk to the real database; pages under test mock lib/catalog-source instead.
vi.mock('../lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }))
