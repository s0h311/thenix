import type { ReactNode } from 'react'
import { Button } from './Button.tsx'

/**
 * The whole viewport, over whatever the athlete was doing. It is a layer and not a
 * route on purpose: the screens that use it are reading back something the athlete
 * has in their hands but not yet on the server — a long paste above all — and a
 * navigation would have to carry that across, where a reload would lose it.
 *
 * Dismissal therefore never costs anything: the screen underneath is still mounted,
 * holding exactly what it held.
 */
export function Layer({
  heading,
  dismiss,
  onDismiss,
  footer,
  children,
}: {
  heading: string
  /** What leaving does, in the athlete's terms — this is the only way back. */
  dismiss: string
  onDismiss: () => void
  /** The action the layer exists to offer, held above the foot of the screen. */
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    // A real `dialog`, rendered open rather than opened with `showModal()`: the
    // server renders this screen too, and a modal opened from an effect would flash
    // the screen underneath first. The UA's own box is reset away entirely.
    //
    // Over the tab bar, which is z-40: while this is open it is the screen, and the
    // destinations under it lead away from a paste that is not saved anywhere.
    <dialog
      open
      aria-label={heading}
      className='fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none flex-col border-0 bg-page p-0 text-ink'
    >
      <header className='flex shrink-0 items-center gap-2 border-b border-hairline px-4 pt-[calc(0.75rem_+_env(safe-area-inset-top))] pb-3'>
        <Button
          tone='ghost'
          onClick={onDismiss}
          className='-ml-2 shrink-0 px-2'
        >
          <span aria-hidden='true'>←</span>
          {dismiss}
        </Button>
      </header>

      <div className='flex-1 overflow-y-auto px-4 py-5'>
        <div className='mx-auto w-full max-w-3xl space-y-4'>
          <h1 className='text-display'>{heading}</h1>
          {children}
        </div>
      </div>

      {/* Pinned, and clear of the home indicator: a seven-Day Week is a long scroll
          and the action that ends it must not be at the bottom of it. */}
      {footer === undefined ? null : (
        <footer className='shrink-0 border-t border-hairline px-4 pt-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))]'>
          <div className='mx-auto w-full max-w-3xl'>{footer}</div>
        </footer>
      )}
    </dialog>
  )
}
