import { Link } from '@tanstack/react-router'
import { Logo } from './Brand/Logo.tsx'

export function AppHeader() {
  return (
    <header className='bg-brand-surface'>
      <div className='mx-auto flex max-w-3xl items-center px-4 py-3'>
        <Link to='/'>
          <Logo />
        </Link>
      </div>
    </header>
  )
}
