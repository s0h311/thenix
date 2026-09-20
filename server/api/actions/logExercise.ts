import { defineEventHandler, HTTPError, readValidatedBody } from 'nitro/h3'
import { z } from 'zod'
import { training } from '../../features/Training/training.ts'
import { auth } from '../../infrastructure/Auth/auth.ts'

/** The three shapes of a Log (ADR 0003). Nothing here counts reps, and nothing will. */
const logSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('skipped'), note: z.string().nullable() }),
  z.object({
    kind: z.literal('difficulty'),
    difficulty: z.enum(['easy', 'good', 'challenging']),
    note: z.string().nullable(),
  }),
  z.object({ kind: z.literal('note'), note: z.string().min(1) }),
])

const bodySchema = z.object({
  weekNumber: z.number().int(),
  dayOrdinal: z.number().int(),
  exerciseKey: z.string(),
  log: logSchema,
})

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.req.headers })

  if (session === null) {
    throw new HTTPError({ status: 401 })
  }

  const body = await readValidatedBody(event, (input) => bodySchema.parse(input))

  const day = await training.logExercise({ userId: session.user.id, ...body })

  if (day === null) {
    throw new HTTPError({ status: 404 })
  }

  return day
})
