import { useEffect, useMemo, useState } from 'react'
import { reloaderInto, watchForUpdate } from '../../libs/Shell/updating.ts'

/**
 * Whether a new version is waiting, and the way into it. The flag stays up once raised:
 * this page runs the old code until it reloads, even if another tab has handed over.
 */
export function useUpdate(registration: ServiceWorkerRegistration | null) {
  const [updateWaiting, setUpdateWaiting] = useState(false)

  useEffect(() => {
    if (registration === null) {
      return
    }

    return watchForUpdate(registration, () => setUpdateWaiting(true))
  }, [registration])

  const reload = useMemo(
    () =>
      registration === null
        ? () => {}
        : reloaderInto({
            registration,
            container: navigator.serviceWorker,
            reload: () => window.location.reload(),
          }),
    [registration],
  )

  return { updateWaiting, reload }
}
