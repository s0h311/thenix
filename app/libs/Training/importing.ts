import type { ImportFault } from '../../../shared/training.ts'

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
