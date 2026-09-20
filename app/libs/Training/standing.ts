/**
 * Where a screen stands with the server, in the four states it can actually be in.
 * `opening` is the wait, `signedOut` is the server saying who is asking,
 * `unreachable` is the gym with no signal, and `open` carries what came back.
 */
export type Standing<T> = { at: 'opening' } | { at: 'signedOut' } | { at: 'unreachable' } | { at: 'open'; it: T }

/**
 * The state a screen is in, from what a read has and has not come back with.
 *
 * `null` is the one answer that means "not signed in" — it is what the adapters
 * return for a 401, and nothing else returns it. `undefined` is the *absence* of an
 * answer, and telling the two apart is the whole reason this is a module: the
 * screens read the absence as a sign-out, so a Week that could not be read told a
 * signed-in athlete to sign in and offered them the one button that would end the
 * session they still had. That happens in a basement gym, which is to say where the
 * training is.
 *
 * Whatever did come back wins over the wait: a refetch that fails or is still out
 * must never take the Day off the screen mid-set. Why nothing came back does not
 * change what the screen can do about it, so the failure is not an input here.
 */
export function standingOf<T>({ pending, got }: { pending: boolean; got: T | null | undefined }): Standing<T> {
  if (got !== undefined && got !== null) {
    return { at: 'open', it: got }
  }

  if (got === null) {
    return { at: 'signedOut' }
  }

  return pending ? { at: 'opening' } : { at: 'unreachable' }
}
