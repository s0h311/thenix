import { Link } from '@tanstack/react-router'
import { Mark } from '../Brand/Mark.tsx'
import { Button, buttonClasses } from '../UI/Button.tsx'
import { Card } from '../UI/Card.tsx'
import type { ReactNode } from 'react'

/**
 * A screen with no training on it. It names what is missing and carries the one
 * action that fixes it — an empty state that only says it is empty is a dead end,
 * and this is the screen the app opens on.
 */
export function Nothing({ heading, said, children }: { heading: string; said: string; children?: ReactNode }) {
  return (
    <Card className='mx-auto max-w-sm space-y-4 text-center'>
      <Mark className='mx-auto size-10' />
      <h1 className='text-title'>{heading}</h1>
      <p className='text-ink-muted'>{said}</p>
      {children}
    </Card>
  )
}

/**
 * The way in, carried by the screen rather than by the tab bar: the bar is not
 * offered to a signed-out athlete, because every destination on it turns one away.
 */
export function SignedOut({ heading, said }: { heading: string; said: string }) {
  return (
    <Nothing
      heading={heading}
      said={said}
    >
      <Link
        to='/sign-in'
        className={buttonClasses('primary', 'w-full')}
      >
        Sign in
      </Link>
    </Nothing>
  )
}

/**
 * The gym with no signal. It says the session is intact, because the fault this
 * replaces read as a sign-out and offered the one button that would have ended it,
 * and it offers the read again: nothing retries by itself.
 */
export function Unreachable({ heading, said, onRetry }: { heading: string; said: string; onRetry: () => void }) {
  return (
    <Nothing
      heading={heading}
      said={said}
    >
      <Button
        tone='primary'
        onClick={onRetry}
        className='w-full'
      >
        Try again
      </Button>
    </Nothing>
  )
}
