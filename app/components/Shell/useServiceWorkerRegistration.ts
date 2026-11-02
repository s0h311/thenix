import { useEffect, useState } from 'react'

/**
 * Registers the service worker after mount, so never during the server render.
 * Call it once, from the root route. The registration is null until it resolves,
 * and stays null in dev, in browsers without service workers and if registering fails.
 */
export function useServiceWorkerRegistration(): ServiceWorkerRegistration | null {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
      return
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then(setRegistration)
      // The app works without a worker; only the no-signal page and the fast start are lost.
      .catch((error: unknown) => console.warn('Service worker registration failed', error))
  }, [])

  return registration
}
