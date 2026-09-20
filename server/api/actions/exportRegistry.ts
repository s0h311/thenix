import { defineEventHandler, HTTPError } from 'nitro/h3'
import { training } from '../../features/Training/training.ts'
import { auth } from '../../infrastructure/Auth/auth.ts'

/** Every known `movementId`. Global, so this is the registry, not the athlete's part of it. */
export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.req.headers })

  if (session === null) {
    throw new HTTPError({ status: 401 })
  }

  return new Response(await training.exportRegistry(), { headers: { 'content-type': 'application/json' } })
})
