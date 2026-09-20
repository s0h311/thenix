# Logs carry a difficulty and prose, never numbers

An Exercise Log is one of three shapes: `{ skipped, note? }`, `{ difficulty, note? }` where
difficulty is `easy | good | challenging`, or `{ note }` alone. There are no per-set inputs
and no numeric fields. Progression charts therefore read the _Prescription_, not the Log.

This is the surprising one. A training tracker that does not record reps looks broken, and
someone will eventually try to "fix" it. Do not, without re-reading this.

## Considered Options

Structured per-set logging was measured against 367 log entries spanning twenty weeks of
real use. **Not one is a clean number per set.** 26.7% are the single word `good`, 35.4%
are prose with numbers embedded (`challenging, but did 4x8`, `3, 3, 2, 2, 1 reps`), 26.7%
are prose only (`back hurt`, `form broke on set 3 last 10 sec`), and a few are questions
back to the coach. A numeric form would have rejected every entry the athlete has ever
written, and would have no home at all for `Day 4: walked`.

Optional numeric fields alongside the prose were rejected as double entry: the same
evidence predicts the textarea gets filled and the fields do not, leaving a chart that is
mostly holes.

## Consequences

Charts plot the prescribed value as the line — which is fully structured and, traced across
the corpus, a clean progression — with `difficulty` as the marker on each point, `variant`
changes annotated, and skips as gaps. They show what was programmed and how it felt, not
measured output. The gap is real and accepted: week 15 prescribed 13kg and the note records
9kg; the chart shows 13kg.

Closing that gap is not the app's job. The Log's purpose is to be exported and read by the
coach, who writes the next week accordingly — which is exactly what the twenty weeks of
`<Notes>` blocks were already doing.

`easy` was written once in twenty weeks and `good challenge` thirty-six times, so the
three-chip scale is known to be a compromise: `good` absorbs both "went as prescribed" and
"appropriately hard". It was chosen over four chips and over splitting outcome from
intensity, on the grounds that one tap beats two.
