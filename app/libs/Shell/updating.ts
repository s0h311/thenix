/** As much of a service worker as updating touches, so this can be proven without a browser. */
export type WorkerLike = Pick<EventTarget, 'addEventListener'> & {
  readonly state: ServiceWorkerState
  postMessage: (message: unknown) => void
}

export type Registration = Pick<EventTarget, 'addEventListener' | 'removeEventListener'> & {
  readonly installing: WorkerLike | null
  readonly waiting: WorkerLike | null
  readonly active: WorkerLike | null
}

/**
 * Says when a new version is ready and waiting. It asks whether anything is running,
 * not whether this page is controlled: the worker never claims pages, so the page of a
 * first visit has no controller and can still be running old code when a deploy lands.
 * The very first install passes through the same "installed" state on its way straight
 * to active, and with nothing running there is nothing it could be an update to.
 */
export function watchForUpdate(registration: Registration, onWaiting: () => void): () => void {
  function watch(worker: WorkerLike) {
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && registration.active !== null) {
        onWaiting()
      }
    })
  }

  function watchInstalling() {
    if (registration.installing !== null) {
      watch(registration.installing)
    }
  }

  if (registration.waiting !== null && registration.active !== null) {
    onWaiting()
  }

  // Already under way when the app opened means its `updatefound` has already gone by.
  watchInstalling()
  registration.addEventListener('updatefound', watchInstalling)

  return () => registration.removeEventListener('updatefound', watchInstalling)
}

/**
 * What the Reload button does: hands over to the waiting version, then reloads once.
 *
 * It listens only from the tap on. Listening from the start would reload this screen
 * when another tab taps Reload, Unsaved Logs and all.
 *
 * `controllerchange` is the signal on a page a worker controls, but a page none controls
 * never gets one, because the worker does not claim clients. There the worker becoming
 * active is the signal, or the button would do nothing at all. With nothing waiting at
 * the tap, another tab has already handed over and only this page's code is old.
 */
export function reloaderInto({
  registration,
  container,
  reload,
}: {
  registration: Pick<Registration, 'waiting'>
  container: Pick<EventTarget, 'addEventListener'>
  reload: () => void
}): () => void {
  let arrived = false

  function arrive() {
    if (!arrived) {
      arrived = true
      reload()
    }
  }

  return () => {
    const waiting = registration.waiting

    if (waiting === null) {
      arrive()
      return
    }

    container.addEventListener('controllerchange', arrive)
    waiting.addEventListener('statechange', () => {
      if (waiting.state === 'activated') {
        arrive()
      }
    })
    waiting.postMessage({ type: 'SKIP_WAITING' })
  }
}
