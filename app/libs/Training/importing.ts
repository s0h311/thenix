import { settledBy } from '../../../shared/settled.ts'
import type { ImportFault, Revision } from '../../../shared/training.ts'

/**
 * What came back from a paste, in the four answers it can actually be.
 *
 * `read` is the server having read the Week; `rejected` is the coach's JSON refused,
 * with the faults to send back; `signedOut` is the session having ended; and
 * `unreachable` is everything else — no signal, a server that fell over, an answer
 * that is not the contract.
 */
export type Answer<T> =
  | { at: 'read'; it: T }
  | { at: 'rejected'; faults: ImportFault[] }
  | { at: 'signedOut' }
  | { at: 'unreachable' }

/**
 * Which of those an answer is.
 *
 * This is a module because the screen had only two of them: anything that was not a
 * Week read back was shown as "Nothing was imported", with whatever `errors` the
 * body happened to hold — and a 401 body holds none, so an athlete whose session had
 * ended had their paste refused by a fault list that was not there. What is wrong is
 * not the Week, and saying so is the difference between fixing the JSON and signing
 * in again.
 *
 * Nothing but a 2xx is trusted to carry the contract: a body under any other status
 * is the framework's, not the Week's. `status: null` is the request never completing
 * at all, which is the basement gym, and is not told apart from the rest — none of
 * them wrote anything, and the Shelf is untouched either way.
 */
export function answerOf<T>({ status, body }: { status: number | null; body: unknown }): Answer<T> {
  if (status === 401) {
    return { at: 'signedOut' }
  }

  const answered =
    status !== null && status >= 200 && status < 300 && typeof body === 'object' && body !== null
      ? (body as { ok?: unknown; errors?: unknown })
      : null

  if (answered === null) {
    return { at: 'unreachable' }
  }

  if (answered.ok === true) {
    return { at: 'read', it: body as T }
  }

  // A refusal that names nothing cannot be sent back to the coach, so it is not one.
  return Array.isArray(answered.errors) && answered.errors.length > 0
    ? { at: 'rejected', faults: answered.errors as ImportFault[] }
    : { at: 'unreachable' }
}

/** One of the four answers, as the word alone. */
export type At = Answer<unknown>['at']

/**
 * Whether the paste may have reached the Shelf. Asked only of an import: a Preview
 * writes nothing, whatever it answers.
 *
 * `read` is the Week written. `unreachable` is the answer that is not "nothing
 * happened" — the import may have been written and the answer lost on the way back,
 * which is why the athlete is sent to look at their Weeks rather than told either
 * way. Both leave everything the app is holding about Weeks a Week out of date: the
 * Shelf's marks, today's Day, and the plan of any Week open behind this screen,
 * which a Revision has just replaced.
 *
 * A refusal and an ended session wrote nothing, and the Shelf is untouched.
 */
export function wrote(at: At): boolean {
  return at === 'read' || at === 'unreachable'
}

/**
 * What confirming a paste would leave alone, worked out on the screen by the same rule
 * the write goes through. `setAside` is the pasted Days the Revision cannot reach,
 * lowest first; `withdrawing` is whether it takes away a Day the paste leaves out,
 * because then not every Day stays as it was even when every pasted one does.
 *
 * A start date still being typed is no date at all, and marks nothing rather than
 * asking the rule for the date of a Day in it.
 */
export function setAsideOf({
  ordinals,
  revising,
  startsOn,
  today,
}: {
  /** The ordinals of the pasted Days. */
  ordinals: number[]
  revising: Revision | null
  startsOn: string
  today: string
}): { settled: (ordinal: number) => boolean; setAside: number[]; withdrawing: boolean } {
  if (revising === null || !isDate(startsOn)) {
    return { settled: () => false, setAside: [], withdrawing: false }
  }

  const settled = settledBy({ startDate: startsOn, today, shelved: revising.shelved })

  return {
    settled,
    setAside: ordinals.filter(settled).toSorted((one, other) => one - other),
    withdrawing: revising.shelved.some((day) => !ordinals.includes(day.ordinal) && !settled(day.ordinal)),
  }
}

function isDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date))
}
