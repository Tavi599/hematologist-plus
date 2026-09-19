import { clearPersistedCatalog } from './query-persistence'

/**
 * Throws away everything this copy of the app has kept and loads it again from the server:
 * the offline catalog, the service worker and its precache.
 *
 * A copy installed before a migration can hold code that does not understand the reference
 * data any more. From inside such a copy there is no other way out — the service worker keeps
 * serving the old files until it is unregistered.
 */
export async function reinstallApp(): Promise<void> {
  await clearPersistedCatalog().catch(() => undefined)

  if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
    const registrations = await navigator.serviceWorker.getRegistrations().catch(() => [])
    await Promise.all(registrations.map((registration) => registration.unregister()))
  }
  if (typeof caches !== 'undefined') {
    const keys = await caches.keys().catch(() => [])
    await Promise.all(keys.map((key) => caches.delete(key)))
  }

  window.location.reload()
}
