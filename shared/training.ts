/**
 * The Week as the app shows it, shared because the athlete's screen speaks the same
 * language the server does. Parsing lives in the Training feature and stays there —
 * these are the shapes that survive the round trip through the database.
 */

export type Weekday = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'

export type Range = {
  min: number
  max: number
}

export type Weight = {
  value: number
  unit: 'kg' | 'l'
  approx: boolean
}

/** Discriminated on how the weight is distributed — asymmetric is rehab, not an edge case. */
export type Load =
  | ({ kind: 'symmetric'; implement?: string | null } & Weight)
  | ({ kind: 'perHand'; implement?: string | null } & Weight)
  | { kind: 'asymmetric'; left: Weight; right: Weight; implement?: string | null }
  | { kind: 'bodyweight' }
  | { kind: 'improvised'; description: string }

/** Discriminated on the unit counted (ADR 0002). `reps`/`seconds` are null when the set runs to failure. */
export type Prescription =
  | { kind: 'reps'; sets: number; reps: Range | null }
  | { kind: 'time'; sets: number; seconds: Range | null }
  | { kind: 'distance'; km: Range; pace?: string | null }
  | { kind: 'rounds'; rounds: number; work: Prescription; recovery: Prescription | null }

export type Side = 'both' | 'each' | 'left' | 'right'

export type Difficulty = 'easy' | 'good' | 'challenging'

/**
 * What the athlete records against one Exercise. Exactly three shapes, and none of
 * them holds a number (ADR 0003): a skip, a rating, or prose standing on its own.
 */
export type Log =
  | { kind: 'skipped'; note: string | null }
  | { kind: 'difficulty'; difficulty: Difficulty; note: string | null }
  | { kind: 'note'; note: string }

export type Exercise = {
  key: string
  movementId: string
  name: string
  variant: string | null
  side: Side
  optional: boolean
  toFailure: boolean
  prescription: Prescription
  load: Load | null
  tempo: string | null
  restSeconds: Range | null
  cue: string | null
  /** The coach's line verbatim, always present — what is shown when parsing was partial. */
  raw: string
  /** What happened. Null is unlogged, which a skip is deliberately not. */
  log: Log | null
}

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

/** Today, as the app opens on it: the Week being trained, and today's Day within it. */
export type CurrentDay = {
  week: Week
  /** Null when the Week holds no Day for today — Week 9 held Days 5–7 only. */
  day: Day | null
}
