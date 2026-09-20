export type { CurrentDay, Day, Difficulty, Exercise, Log, Orphan, Week } from '../../../shared/training.ts'

import type { Week } from '../../../shared/training.ts'

/** A fault in the coach's Week, named where the coach can find it. */
export type ImportError = {
  day: number | null
  exercise: string | null
  field: string
  message: string
}

export type ImportResult = { ok: true; week: Week } | { ok: false; errors: ImportError[] }
