/**
 * Something to read, never something to press. In the warning tokens rather than
 * the brand, because the fault this exists to avoid is a block of amber that reads
 * as the one thing on the screen to tap — what it means is that something is wrong.
 *
 * `live` for the ones that appear under the athlete's hands rather than with the
 * screen: a refusal arriving after a tap, the re-dating warning written while they
 * are inside the date field.
 */
export function Caution({ children, live = false }: { children: string; live?: boolean }) {
  return (
    <p
      aria-live={live ? 'polite' : undefined}
      className='rounded-lg border border-warning-line bg-warning-soft px-3 py-2 text-label font-semibold text-warning-ink'
    >
      {children}
    </p>
  )
}
