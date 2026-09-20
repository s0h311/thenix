import { Link, useRouterState } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Logo } from '../Brand/Logo.tsx'
import { authClient } from '../../libs/Auth/authClient.ts'

/**
 * Where the athlete can go.
 *
 * Account sits behind the last position: a destination, but not one of the three
 * the ritual is made of.
 */
type Destination = Readonly<{
  to: '/' | '/weeks' | '/coach' | '/account'
  label: string
  icon: ReactNode
}>

const DESTINATIONS: readonly Destination[] = [
  { to: '/', label: 'Today', icon: <TodayIcon /> },
  { to: '/weeks', label: 'Weeks', icon: <WeeksIcon /> },
  { to: '/coach', label: 'Coach', icon: <CoachIcon /> },
  { to: '/account', label: 'Account', icon: <AccountIcon /> },
]

/**
 * The shell's navigation: a bottom tab bar within thumb reach on a phone, the
 * same destinations as a top bar once there is room for them.
 *
 * It is offered only to a signed-in athlete, because every destination it holds
 * turns a signed-out one away. The screens themselves carry the way in.
 */
export function TabBar() {
  const { data: session } = authClient.useSession()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  if (!session) {
    return null
  }

  return (
    <nav
      aria-label='Sections'
      // Fixed to the bottom of the viewport on a phone, where a thumb is; the
      // inset padding keeps it clear of the home indicator. `md:static` drops
      // every one of those positions at once.
      className='fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-raised pb-[env(safe-area-inset-bottom)] md:static md:border-t-0 md:border-b md:pb-0'
    >
      <div className='mx-auto flex max-w-3xl items-stretch md:items-center md:gap-6 md:px-4'>
        {/* A mark, not a destination: Today is a tab away, and a second link to
            it would announce a second current page. */}
        <Logo className='hidden h-8 w-auto shrink-0 py-0.5 md:block' />
        <ul className='flex flex-1 md:justify-end'>
          {DESTINATIONS.map((destination) => (
            <li
              key={destination.to}
              className='flex-1 md:flex-none'
            >
              <Tab
                destination={destination}
                current={isCurrent(destination.to, pathname)}
              />
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

/**
 * Today is every path's prefix, so it alone is matched whole. Everything else
 * matches its subtree: which Week is open lives in the URL, and the athlete is
 * still under Weeks while reading one.
 */
function isCurrent(to: string, pathname: string): boolean {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`)
}

function Tab({ destination, current }: Readonly<{ destination: Destination; current: boolean }>) {
  return (
    <Link
      to={destination.to}
      aria-current={current ? 'page' : undefined}
      className={`relative flex min-h-16 flex-col items-center justify-center gap-1 px-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand md:min-h-14 md:flex-row md:gap-2 md:px-3 ${
        current ? 'font-semibold text-ink' : 'font-medium text-ink-faint hover:text-ink'
      }`}
    >
      {/*
       * "You are here" is the ink weight above; this is the brand doing the one
       * other job it has. Held in the layout either way so that nothing shifts
       * as the athlete moves between destinations.
       */}
      <span
        aria-hidden='true'
        className={`absolute inset-x-0 top-0 mx-auto h-1 w-10 rounded-b-full bg-brand md:top-auto md:bottom-0 md:rounded-b-none md:rounded-t-full ${current ? '' : 'invisible'}`}
      />
      {destination.icon}
      <span className='text-caption md:text-label'>{destination.label}</span>
    </Link>
  )
}

/*
 * Four line icons on the system stroke weight. They are shape, not colour, and
 * every one of them is labelled beneath.
 */

type IconProps = Readonly<{ children: ReactNode }>

function Icon({ children }: IconProps) {
  return (
    <svg
      aria-hidden='true'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.75'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='size-6 md:size-5'
    >
      {children}
    </svg>
  )
}

function TodayIcon() {
  return (
    <Icon>
      <rect
        x='3'
        y='5'
        width='18'
        height='16'
        rx='3'
      />
      <path d='M3 10h18M8 3v4M16 3v4M9 15.5l2 2 4-4' />
    </Icon>
  )
}

function WeeksIcon() {
  return (
    <Icon>
      <rect
        x='3'
        y='4'
        width='18'
        height='5'
        rx='2'
      />
      <rect
        x='3'
        y='12'
        width='18'
        height='5'
        rx='2'
      />
      <path d='M6 20h12' />
    </Icon>
  )
}

function CoachIcon() {
  return (
    <Icon>
      <path d='M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5A8 8 0 1 1 21 12Z' />
      <path d='M9 11h6M9 14h4' />
    </Icon>
  )
}

function AccountIcon() {
  return (
    <Icon>
      <circle
        cx='12'
        cy='8'
        r='3.5'
      />
      <path d='M4.5 20a7.5 7.5 0 0 1 15 0' />
    </Icon>
  )
}
