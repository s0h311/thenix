import { defineEventHandler, HTTPError, readValidatedBody } from 'nitro/h3'
import { z } from 'zod'
import { training } from '../../features/Training/training.ts'
import { auth } from '../../infrastructure/Auth/auth.ts'

const bodySchema = z.object({
  json: z.string(),
  startDate: z.iso.date(),
})

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.req.headers })

  if (session === null) {
    throw new HTTPError({ status: 401 })
  }

  const { json, startDate } = await readValidatedBody(event, (body) => bodySchema.parse(body))

  return await training.importWeek({ userId: session.user.id, json, startDate })
})
