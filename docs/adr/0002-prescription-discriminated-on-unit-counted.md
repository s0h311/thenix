# Prescription is discriminated on the unit counted, not the kind of exercise

A Prescription is a discriminated union with four members — `reps`, `time`, `distance`,
`rounds` — keyed on what is being counted. Everything else that varies (Side, Load, tempo,
rest, to-failure) sits beside the union as orthogonal fields on the Exercise.

## Considered Options

The obvious shape, `{ sets: number, reps: number }`, was measured against the corpus and
fits 85 of 501 exercise lines. Of the rest, 41.5% count time rather than reps (`3×35s`),
23.7% give a range (`4×4–6`), 21.1% are per-side (`4×6/side`), and a handful are distance
or interval protocols (`10–11 km @ 6:00–6:10/km`, `4 rounds: 4 min @ 90–95% HRmax`). A flat
numeric shape silently corrupts these: `3×35s` becomes `reps: 35`, `4×6/side` becomes
`reps: 6` when the real answer is 12.

Discriminating on the _kind of exercise_ — `hold | perSide | weighted | cardio` — was
rejected because those dimensions cross freely. The corpus contains 18 distinct
combinations of just five dimensions, and `Deficit Bulgarian split squats: 4×6/side, 11kg,
3s down + 2s pause` (which occurs 19 times) belongs to four of them at once, so it would
have to pick one and lie about the others. Every new dimension would double the member
count; as orthogonal fields, each adds one field.

## Consequences

`sets` is a real number and drives the per-set UI. Range is first-class, with `min === max`
for exact values, because a quarter of prescriptions need it.

Alongside the parsed fields every Exercise keeps `raw`, the coach's original line verbatim.
17.1% of prescriptions carry conditionals the union deliberately does not model
(`No weights available → bodyweight versions, 2s pauses, +50% reps`); these live in `raw`
and are displayed as written. Structure powers features, `raw` guarantees nothing is lost.
