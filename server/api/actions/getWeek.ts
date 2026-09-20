import { defineEventHandler, HTTPError } from 'nitro/h3'
import { z } from 'zod'
import { training } from '../../features/Training/training.ts'
import { auth } from '../../infrastructure/Auth/auth.ts'

const querySchema = z.object({
  number: z.coerce.number().int(),
})

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.req.headers })

  if (session === null) {
    throw new HTTPError({ status: 401 })
  }

  const { number } = querySchema.parse(Object.fromEntries(new URL(event.req.url).searchParams))

  return await training.getWeek({ userId: session.user.id, number })
})
