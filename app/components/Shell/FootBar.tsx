import { BottomBar } from '../UI/BottomBar.tsx'
import type { Alert } from '../../libs/Training/saving.ts'

/**
 * The one thing the screen must say out loud. A tap stays on screen the moment it
 * happens, which is right — and is also why a Log the server never got would sit
 * there looking recorded. The gym has no signal, the session ends, the Week goes to
 * the coach short. So it is said plainly and sending it again is a tap: nothing is
 * asked of the athlete mid-set beyond one they can ignore till later.
 *
 * The one button is whatever the alert says it is. A Save the server will not take
 * is not an errand — sending it again only spends the tap — so there the button lets
 * it go, and the bar can be cleared rather than pinned here for the session.
 */
export function FootBar({
  bar,
  onRetry,
  onDismiss,
  onReload,
}: {
  bar: Alert | null
  onRetry: () => void
  /** Lets go of the Saves the server will not take, which nothing else can clear. */
  onDismiss: () => void
  /** Moves to the new version waiting to take over. */
  onReload: () => void
}) {
  if (bar === null) {
    return null
  }

  const acts = { retry: onRetry, dismiss: onDismiss, reload: onReload }

  return (
    <BottomBar
      tone={bar.does === 'reload' ? 'neutral' : 'warning'}
      said={bar.said}
      action={bar.action}
      onAct={acts[bar.does]}
    />
  )
}
