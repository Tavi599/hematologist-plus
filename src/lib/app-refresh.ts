import { clearPersistedCatalog } from './query-persistence'

/** Marks the navigation as the one that follows a reinstall, so it cannot be served from a cache. */
const REINSTALL_PARAM = 'reinstalled'

/**
 * Throws away everything this copy of the app has kept and loads it again from the server:
 * the offline catalog, the service worker and its precache.
 *
 * A copy installed before a migration can hold code that does not understand the reference
 * data any more. From inside such a copy there is no other way out — the service worker keeps
 * serving the old files until it is unregistered.
 *
 * Unregistering is not enough on its own. The document that is running was itself served from
 * the precache, and a plain reload can be answered from the browser's own HTTP cache with that
 * same stale index.html, which then loads the same stale bundle: the app comes back as broken as
 * it was. So the last step navigates to a URL that has never been requested before — a fresh
 * query parameter — which no cache can answer.
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

  window.location.replace(reinstallUrl(window.location.href))
}

/**
 * The same page with a one-off query parameter. The route lives in the hash, so it is untouched:
 * the user lands where they were.
 */
export function reinstallUrl(href: string): string {
  const url = new URL(href)
  url.searchParams.set(REINSTALL_PARAM, Date.now().toString(36))
  return url.toString()
}
