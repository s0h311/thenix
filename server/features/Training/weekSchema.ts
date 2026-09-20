import { z } from 'zod'
import type { Prescription } from '../../../shared/training.ts'

/**
 * The contract between the coach and the app. It is internal to the Training
 * feature on purpose: the client pastes text and the server validates it, so
 * nothing outside this feature has a use for the parser.
 *
 * ADR 0002 governs Prescription — discriminated on the unit counted, with every
 * orthogonal modifier (Side, Load, tempo, rest) beside the union, not inside it.
 */

const rangeSchema = z.object({
  min: z.number(),
  max: z.number(),
})

const weightSchema = z.object({
  value: z.number(),
  unit: z.enum(['kg', 'l']),
  approx: z.boolean().default(false),
})

const loadSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('symmetric'), ...weightSchema.shape, implement: z.string().nullish() }),
  z.object({ kind: z.literal('perHand'), ...weightSchema.shape, implement: z.string().nullish() }),
  z.object({
    kind: z.literal('asymmetric'),
    left: weightSchema,
    right: weightSchema,
    implement: z.string().nullish(),
  }),
  z.object({ kind: z.literal('bodyweight') }),
  z.object({ kind: z.literal('improvised'), description: z.string() }),
])

const repsSchema = z.object({ kind: z.literal('reps'), sets: z.int(), reps: rangeSchema.nullable() })
const timeSchema = z.object({ kind: z.literal('time'), sets: z.int(), seconds: rangeSchema.nullable() })
const distanceSchema = z.object({ kind: z.literal('distance'), km: rangeSchema, pace: z.string().nullish() })

const prescriptionSchema: z.ZodType<Prescription> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    repsSchema,
    timeSchema,
    distanceSchema,
    z.object({
      kind: z.literal('rounds'),
      rounds: z.int(),
      work: prescriptionSchema,
      recovery: prescriptionSchema.nullable(),
    }),
  ]),
)

const exerciseSchema = z.object({
  // Unique within its Day — this is what a Log joins on.
  key: z.string(),
  // Stable across Weeks — this is what a twenty-Week chart plots.
  movementId: z.string(),
  name: z.string(),
  variant: z.string().nullish(),
  side: z.enum(['both', 'each', 'left', 'right']).default('both'),
  optional: z.boolean().default(false),
  toFailure: z.boolean().default(false),
  prescription: prescriptionSchema,
  load: loadSchema.nullish(),
  tempo: z.string().nullish(),
  restSeconds: rangeSchema.nullish(),
  cue: z.string().nullish(),
  // The coach's line verbatim. Always present, so an import never loses information.
  raw: z.string(),
})

const daySchema = z
  .object({
    ordinal: z.int().min(1),
    kind: z.enum(['training', 'rest']),
    focus: z.string().nullish(),
    notes: z.string().nullish(),
    exercises: z.array(exerciseSchema),
  })
  // A Log joins on the key, so a repeat would attach today's work to the wrong
  // Exercise. The coach has to pick a different one.
  .superRefine((day, context) => {
    const seen = new Set<string>()

    for (const [index, one] of day.exercises.entries()) {
      if (seen.has(one.key)) {
        context.addIssue({
          code: 'custom',
          message: `Two Exercises on this Day share the key "${one.key}".`,
          path: ['exercises', index, 'key'],
        })
      }

      seen.add(one.key)
    }
  })

/** `startDate` is deliberately absent — the coach does not know it, the user picks it at import. */
export const weekSchema = z.object({
  number: z.int(),
  notes: z.string().nullish(),
  days: z.array(daySchema),
})

export type ImportedExercise = z.infer<typeof exerciseSchema>
export type ImportedDay = z.infer<typeof daySchema>
export type ImportedWeek = z.infer<typeof weekSchema>
