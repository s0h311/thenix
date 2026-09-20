import { Link } from '@tanstack/react-router'
import { Logo } from './Brand/Logo.tsx'
import { authClient } from '../libs/Auth/authClient.ts'

export function AppHeader() {
  const { data: session } = authClient.useSession()

  return (
    <header className='bg-brand-surface'>
      <div className='mx-auto flex max-w-3xl items-center justify-between px-4 py-3'>
        <Link to='/'>
          <Logo />
        </Link>
        <nav className='flex items-center gap-4'>
          {session ? (
            <Link
              to='/weeks'
              className='font-semibold text-brand'
            >
              Weeks
            </Link>
          ) : null}
          <Link
            to={session ? '/account' : '/sign-in'}
            className='font-semibold text-brand'
          >
            {session ? 'Account' : 'Sign in'}
          </Link>
        </nav>
      </div>
    </header>
  )
}
