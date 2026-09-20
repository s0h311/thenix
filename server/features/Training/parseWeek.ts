import { weekSchema } from './weekSchema.ts'
import type { $ZodIssue } from 'zod/v4/core'
import type { ImportError } from './types.ts'
import type { ImportedWeek } from './weekSchema.ts'

export type ParsedWeek = { ok: true; week: ImportedWeek } | { ok: false; errors: ImportError[] }

/**
 * Turns the paste into a Week, or into a list the user can hand straight back to
 * the coach. Every error names the Day, the Exercise and the field, because the
 * coach fixes what it can see.
 */
export function parseWeek(json: string): ParsedWeek {
  let pasted: unknown

  try {
    pasted = JSON.parse(json)
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          day: null,
          exercise: null,
          field: 'json',
          message: error instanceof Error ? error.message : 'The paste is not JSON.',
        },
      ],
    }
  }

  const parsed = weekSchema.safeParse(pasted)

  if (parsed.success) {
    return { ok: true, week: parsed.data }
  }

  return { ok: false, errors: parsed.error.issues.map((issue) => locate({ issue, pasted })) }
}

/** Where in the coach's Week the fault sits, read off the paste rather than the parse. */
function locate({ issue, pasted }: { issue: $ZodIssue; pasted: unknown }): ImportError {
  const [section, dayIndex, exercises, exerciseIndex, ...field] = issue.path

  if (section !== 'days' || typeof dayIndex !== 'number') {
    return { day: null, exercise: null, field: issue.path.join('.') || 'week', message: issue.message }
  }

  const pastedDay = at(at(pasted, 'days'), dayIndex)
  const ordinal = at(pastedDay, 'ordinal')
  const day = typeof ordinal === 'number' ? ordinal : null

  if (exercises !== 'exercises' || typeof exerciseIndex !== 'number') {
    return { day, exercise: null, field: issue.path.slice(2).join('.') || 'day', message: issue.message }
  }

  const key = at(at(at(pastedDay, 'exercises'), exerciseIndex), 'key')

  return {
    day,
    exercise: typeof key === 'string' ? key : null,
    field: field.join('.') || 'exercise',
    message: issue.message,
  }
}

function at(value: unknown, key: PropertyKey): unknown {
  if (typeof value !== 'object' || value === null) {
    return undefined
  }

  return (value as Record<PropertyKey, unknown>)[key]
}
