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
        <Link
          to={session ? '/account' : '/sign-in'}
          className='font-semibold text-brand'
        >
          {session ? 'Account' : 'Sign in'}
        </Link>
      </div>
    </header>
  )
}
