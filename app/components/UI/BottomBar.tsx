import { Button } from './Button.tsx'

const TONES = {
  warning: {
    role: 'alert',
    box: 'border-warning-line bg-warning-soft',
    text: 'text-warning-ink',
    button: 'destructive',
  },
  neutral: {
    role: 'status',
    box: 'border-hairline bg-raised',
    text: 'text-ink',
    button: 'primary',
  },
} as const

/**
 * The one bar at the foot of the screen. It pins directly above the tab bar rather
 * than sitting above the content, because a Day is a long scroll and a message at
 * the top of it is a message that is missed — and because the foot of the screen is
 * where the thumb already is. On desktop there is no tab bar, so it takes the bottom.
 *
 * `warning` is for something wrong, and is never the brand: the fault this replaces
 * was an amber block that read as the one thing on the screen to press. `neutral` is
 * for news that is nothing to worry about, and there the brand fill is exactly right
 * on its one button — it must not be mistaken for the warning.
 *
 * Only the warning interrupts a screen reader: an update can wait for its turn.
 */
export function BottomBar({
  tone,
  said,
  action,
  onAct,
}: {
  tone: 'warning' | 'neutral'
  said: string
  action: string
  onAct: () => void
}) {
  const look = TONES[tone]

  return (
    <>
      {/* The bar is out of the flow, so the foot of the screen is held clear of it:
          whatever sits beneath it is still reachable while it is up. */}
      <div
        aria-hidden='true'
        className='h-20'
      />

      <div className='fixed inset-x-0 bottom-[calc(4rem_+_env(safe-area-inset-bottom))] z-40 px-4 pb-2 md:bottom-0 md:pb-[calc(0.75rem_+_env(safe-area-inset-bottom))]'>
        <section
          role={look.role}
          className={`mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-lg ${look.box}`}
        >
          <p className={`text-label font-semibold ${look.text}`}>{said}</p>
          <Button
            tone={look.button}
            onClick={onAct}
          >
            {action}
          </Button>
        </section>
      </div>
    </>
  )
}
