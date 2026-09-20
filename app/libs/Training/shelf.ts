import { today } from './clock.ts'
import type { WeekOnShelf } from '../../../shared/training.ts'

/**
 * The key the Shelf is cached under. `'shelf'` heads it because that is what
 * `useSaving` invalidates by prefix after a Log lands.
 */
export function shelfKey(): readonly unknown[] {
  return ['shelf', today()]
}

/**
 * Every Week the athlete has. Read by the Shelf itself and by Coach, which needs
 * only the Week covering today — and must not cache a different answer under the
 * same key, or one screen's error would sign the other out.
 *
 * Null is "not signed in", which is the shelf's answer and never an opened Week's:
 * asking twice is how a Week comes back as "there is no Week 12" when what is
 * missing is the session.
 */
export async function openShelf(): Promise<WeekOnShelf[] | null> {
  const response = await fetch(`/api/actions/listWeeks?today=${today()}`)

  if (response.status === 401) {
    return null
  }

  if (!response.ok) {
    throw new Error('the Weeks could not be read')
  }

  return (await response.json()) as WeekOnShelf[]
}
