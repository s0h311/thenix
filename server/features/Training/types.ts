import type { Weekday } from './dayDate.ts'
import type { ImportedExercise } from './weekSchema.ts'

export type Exercise = ImportedExercise

export type Day = {
  ordinal: number
  /** Derived from the Week's start date — display only, never stored. */
  date: string
  weekday: Weekday
  kind: 'training' | 'rest'
  focus: string | null
  notes: string | null
  exercises: Exercise[]
}

export type Week = {
  number: number
  startDate: string
  notes: string | null
  days: Day[]
}

/** A fault in the coach's Week, named where the coach can find it. */
export type ImportError = {
  day: number | null
  exercise: string | null
  field: string
  message: string
}

export type ImportResult = { ok: true; week: Week } | { ok: false; errors: ImportError[] }
