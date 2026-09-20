import { defineEventHandler, HTTPError } from 'nitro/h3'
import { training } from '../../features/Training/training.ts'
import { auth } from '../../infrastructure/Auth/auth.ts'

/**
 * The contract the coach writes to. It is the same for every athlete, so there is
 * nothing to ask for — but it sits behind the session like every other action, so
 * the app has one rule about who may talk to it rather than two.
 */
export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.req.headers })

  if (session === null) {
    throw new HTTPError({ status: 401 })
  }

  // Verbatim, so what lands on the clipboard is exactly what the feature published.
  return new Response(await training.exportSchema(), { headers: { 'content-type': 'application/json' } })
})
