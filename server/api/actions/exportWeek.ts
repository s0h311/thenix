import { defineEventHandler, HTTPError } from 'nitro/h3'
import { z } from 'zod'
import { training } from '../../features/Training/training.ts'
import { auth } from '../../infrastructure/Auth/auth.ts'

/**
 * Any Week, not only the one being trained — the coach asks for Week 12 as readily
 * as for this one. No `today`: what is handed over is what happened, not what is due.
 */
const querySchema = z.object({
  number: z.coerce.number().int(),
})

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.req.headers })

  if (session === null) {
    throw new HTTPError({ status: 401 })
  }

  const { number } = querySchema.parse(Object.fromEntries(new URL(event.req.url).searchParams))

  const json = await training.exportWeek({ userId: session.user.id, number })

  if (json === null) {
    throw new HTTPError({ status: 404 })
  }

  // The body is the coach's JSON verbatim, so what lands on the clipboard is exactly
  // what the feature wrote — no re-encoding between here and the paste.
  return new Response(json, { headers: { 'content-type': 'application/json' } })
})
