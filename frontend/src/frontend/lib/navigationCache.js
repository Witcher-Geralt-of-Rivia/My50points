/** Fired on client navigations so data hooks can refetch immediately. */
export const ROUTE_CHANGE_EVENT = "50points-route-change";

let navigationGeneration = 0;

export function getNavigationGeneration() {
  return navigationGeneration;
}

export function bumpNavigationGeneration() {
  navigationGeneration += 1;
  return navigationGeneration;
}

/**
 * Clears Cache Storage and unregisters service workers (safe no-op if unsupported).
 */
export async function clearBrowserCaches() {
  if (typeof window === "undefined") return;

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    /* ignore */
  }

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch {
    /* ignore */
  }
}

export function notifyRouteChange(pathname) {
  const generation = bumpNavigationGeneration();
  window.dispatchEvent(
    new CustomEvent(ROUTE_CHANGE_EVENT, {
      detail: { pathname, generation },
    }),
  );
}
