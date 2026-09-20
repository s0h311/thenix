export type {
  CurrentDay,
  Day,
  DayOnShelf,
  Difficulty,
  Exercise,
  ImportFault,
  Log,
  Orphan,
  Revision,
  Week,
  WeekOnShelf,
  WeekPreview,
} from '../../../shared/training.ts'

import type { ImportFault, Revision, Week, WeekPreview } from '../../../shared/training.ts'

/** The faults of a rejected paste, under the name the Training feature calls them by. */
export type ImportError = ImportFault

export type ImportResult = { ok: true; week: Week } | { ok: false; errors: ImportError[] }

/** The parse, shown before the shelf changes, with the date the Week would start on. */
export type PreviewResult =
  | {
      ok: true
      preview: WeekPreview
      startDate: string
      /** Null unless that Week number is already on the shelf — then, what it would revise. */
      revising: Revision | null
    }
  | { ok: false; errors: ImportError[] }
