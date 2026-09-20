# The coach emits the JSON; the app never parses prose

Training plans are written by an LLM coach as freeform prose. The app publishes a Zod
schema, the coach emits conforming JSON, and the athlete pastes it in — the app validates
and never attempts to parse natural language.

## Considered Options

Parsing the coach's prose on upload was rejected on evidence. The twenty weeks in
`training-plans/` change format at least four times: week 1–2 are markdown tables keyed by
weekday, week 5 switches to prose with `Day N (Weekday)` headers, week 12 adds pain rules
and research citations, week 20 adds per-day note blocks. A parser would have to track a
format that has never been stable for more than a few weeks, and would fail silently when
it drifted again.

Typing weeks into a form was also rejected: week 20 has 30 exercises across 7 days.

## Consequences

The schema is a published interface with a second consumer — the LLM writing next week's
plan. Changing it breaks plans already in flight, so the schema export exists as a
first-class feature rather than documentation.

Import is all-or-nothing: a week that fails validation is rejected whole, with a copyable
error list to paste back to the coach. The fix loop runs through the same channel the plan
came from.
