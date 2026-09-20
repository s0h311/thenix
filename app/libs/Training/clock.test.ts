import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { today } from './clock.ts'

const WHERE_THE_TESTS_RUN = process.env['TZ']

/** An athlete, standing somewhere, at a moment. The date depends on both. */
function at({ instant, zone }: { instant: string; zone: string }): void {
  process.env['TZ'] = zone
  vi.setSystemTime(new Date(instant))
}

describe('the date the athlete is training on', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
  })

  afterEach(() => {
    vi.useRealTimers()

    if (WHERE_THE_TESTS_RUN === undefined) {
      delete process.env['TZ']
    } else {
      process.env['TZ'] = WHERE_THE_TESTS_RUN
    }
  })

  test('a Monday evening west of UTC is still that Monday, not the Tuesday UTC has reached', () => {
    at({ instant: '2026-09-22T01:00:00Z', zone: 'America/Los_Angeles' })

    expect(today()).toBe('2026-09-21')
  })

  test('a small hour east of UTC is already the new day, not the one UTC is still on', () => {
    at({ instant: '2026-09-21T23:30:00Z', zone: 'Europe/Berlin' })

    expect(today()).toBe('2026-09-22')
  })

  test('a single-digit month and day are padded, because the server is handed an ISO date', () => {
    at({ instant: '2026-01-05T12:00:00Z', zone: 'Europe/Berlin' })

    expect(today()).toBe('2026-01-05')
  })
})
