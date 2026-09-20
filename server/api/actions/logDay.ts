import { defineEventHandler, HTTPError, readValidatedBody } from 'nitro/h3'
import { z } from 'zod'
import { training } from '../../features/Training/training.ts'
import { auth } from '../../infrastructure/Auth/auth.ts'

/** Prose only: the Day's own note is what belongs to no Exercise on it. */
const bodySchema = z.object({
  today: z.iso.date(),
  weekNumber: z.number().int(),
  dayOrdinal: z.number().int(),
  note: z.string(),
})

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.req.headers })

  if (session === null) {
    throw new HTTPError({ status: 401 })
  }

  const body = await readValidatedBody(event, (input) => bodySchema.parse(input))

  const day = await training.logDay({ userId: session.user.id, ...body })

  if (day === null) {
    throw new HTTPError({ status: 404 })
  }

  return day
})
