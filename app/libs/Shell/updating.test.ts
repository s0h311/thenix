import { describe, expect, test } from 'vitest'
import { reloaderInto, watchForUpdate } from './updating.ts'
import type { Registration, WorkerLike } from './updating.ts'

class FakeWorker extends EventTarget implements WorkerLike {
  state: ServiceWorkerState = 'installing'
  posted: unknown[] = []

  postMessage(message: unknown) {
    this.posted.push(message)
  }

  becomes(state: ServiceWorkerState) {
    this.state = state
    this.dispatchEvent(new Event('statechange'))
  }
}

class FakeRegistration extends EventTarget implements Registration {
  installing: FakeWorker | null = null
  waiting: FakeWorker | null = null
  active: FakeWorker | null = null

  constructor(worker: Partial<Pick<FakeRegistration, 'installing' | 'waiting' | 'active'>> = {}) {
    super()
    Object.assign(this, worker)
  }

  /** A new version found on the server, as the browser announces one. */
  finds(worker: FakeWorker) {
    this.installing = worker
    this.dispatchEvent(new Event('updatefound'))
  }

  /** The browser's order: the worker is in the waiting slot before it is told it installed. */
  installed(worker: FakeWorker) {
    this.installing = null
    this.waiting = worker
    worker.becomes('installed')
  }
}

function watched(registration: FakeRegistration) {
  const seen = { waiting: 0 }

  watchForUpdate(registration, () => {
    seen.waiting += 1
  })

  return seen
}

function reloadSetup(registration: FakeRegistration) {
  const container = new EventTarget()
  const counted = { reloads: 0 }
  const reload = reloaderInto({
    registration,
    container,
    reload: () => {
      counted.reloads += 1
    },
  })

  return { container, counted, reload }
}

describe('noticing a new version', () => {
  test('one already waiting when the app opens is offered straight away', () => {
    const registration = new FakeRegistration({ active: new FakeWorker(), waiting: new FakeWorker() })

    expect(watched(registration).waiting).toBe(1)
  })

  test('one that finishes installing while the app is open is offered then', () => {
    const registration = new FakeRegistration({ active: new FakeWorker() })
    const seen = watched(registration)
    const worker = new FakeWorker()

    registration.finds(worker)
    expect(seen.waiting).toBe(0)

    registration.installed(worker)
    expect(seen.waiting).toBe(1)
  })

  test('one already installing when the app opens is not missed, though its announcement was', () => {
    const worker = new FakeWorker()
    const registration = new FakeRegistration({ active: new FakeWorker(), installing: worker })
    const seen = watched(registration)

    registration.installed(worker)

    expect(seen.waiting).toBe(1)
  })

  test('the very first install is no update: nothing was running to be replaced', () => {
    const worker = new FakeWorker()
    const registration = new FakeRegistration({ installing: worker })
    const seen = watched(registration)

    registration.installed(worker)

    expect(seen.waiting).toBe(0)
  })

  test('a new version that fails to install offers nothing', () => {
    const registration = new FakeRegistration({ active: new FakeWorker() })
    const seen = watched(registration)
    const worker = new FakeWorker()

    registration.finds(worker)
    worker.becomes('redundant')

    expect(seen.waiting).toBe(0)
  })
})

describe('tapping Reload', () => {
  test('tells the waiting version to take over, and does not reload until it has', () => {
    const waiting = new FakeWorker()
    const { counted, reload } = reloadSetup(new FakeRegistration({ active: new FakeWorker(), waiting }))

    reload()

    expect(waiting.posted).toEqual([{ type: 'SKIP_WAITING' }])
    expect(counted.reloads).toBe(0)
  })

  test('reloads when the new version takes control of the page', () => {
    const { container, counted, reload } = reloadSetup(
      new FakeRegistration({ active: new FakeWorker(), waiting: new FakeWorker() }),
    )

    reload()
    container.dispatchEvent(new Event('controllerchange'))

    expect(counted.reloads).toBe(1)
  })

  test('still reloads on a page no worker controls, where control never changes hands', () => {
    const waiting = new FakeWorker()
    const { counted, reload } = reloadSetup(new FakeRegistration({ active: new FakeWorker(), waiting }))

    reload()
    waiting.becomes('activated')

    expect(counted.reloads).toBe(1)
  })

  test('reloads once, whichever signal comes first and however often it is tapped', () => {
    const waiting = new FakeWorker()
    const { container, counted, reload } = reloadSetup(new FakeRegistration({ active: new FakeWorker(), waiting }))

    reload()
    reload()
    container.dispatchEvent(new Event('controllerchange'))
    waiting.becomes('activated')
    container.dispatchEvent(new Event('controllerchange'))

    expect(counted.reloads).toBe(1)
  })

  test('with the new version already in charge, as another tab can leave it, it just reloads', () => {
    const { counted, reload } = reloadSetup(new FakeRegistration({ active: new FakeWorker() }))

    reload()

    expect(counted.reloads).toBe(1)
  })

  test('sends the message to whichever version is waiting at the tap, not the one first noticed', () => {
    const superseded = new FakeWorker()
    const newest = new FakeWorker()
    const registration = new FakeRegistration({ active: new FakeWorker(), waiting: superseded })
    const { reload } = reloadSetup(registration)

    registration.waiting = newest
    reload()

    expect(newest.posted).toEqual([{ type: 'SKIP_WAITING' }])
    expect(superseded.posted).toEqual([])
  })

  test('another tab handing control over does not reload this one under the athlete', () => {
    const { container, counted } = reloadSetup(
      new FakeRegistration({ active: new FakeWorker(), waiting: new FakeWorker() }),
    )

    container.dispatchEvent(new Event('controllerchange'))

    expect(counted.reloads).toBe(0)
  })
})
