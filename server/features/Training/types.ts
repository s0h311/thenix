export type {
  CurrentDay,
  Day,
  Difficulty,
  Exercise,
  ImportFault,
  Log,
  Orphan,
  Week,
  WeekOnShelf,
  WeekPreview,
} from '../../../shared/training.ts'

import type { ImportFault, Week, WeekPreview } from '../../../shared/training.ts'

/** The faults of a rejected paste, under the name the Training feature calls them by. */
export type ImportError = ImportFault

export type ImportResult = { ok: true; week: Week } | { ok: false; errors: ImportError[] }

/** The parse, shown before the shelf changes, with the date the Week would start on. */
export type PreviewResult = { ok: true; preview: WeekPreview; startDate: string } | { ok: false; errors: ImportError[] }
