import { defineEventHandler, HTTPError } from 'nitro/h3'
import { z } from 'zod'
import { training } from '../../features/Training/training.ts'
import { auth } from '../../infrastructure/Auth/auth.ts'

/** The athlete's own date: which Week is "now" is a question about where they are. */
const querySchema = z.object({
  today: z.iso.date(),
})

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.req.headers })

  if (session === null) {
    throw new HTTPError({ status: 401 })
  }

  const { today } = querySchema.parse(Object.fromEntries(new URL(event.req.url).searchParams))

  return await training.listWeeks({ userId: session.user.id, today })
})
