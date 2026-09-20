import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { Button, buttonClasses } from '../components/UI/Button.tsx'
import { Card } from '../components/UI/Card.tsx'
import { authClient } from '../libs/Auth/authClient.ts'

export const Route = createFileRoute('/account')({
  component: AccountPage,
})

function AccountPage() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const [busy, setBusy] = useState(false)

  async function signOut() {
    setBusy(true)
    await authClient.signOut()
    await router.navigate({ to: '/sign-in' })
  }

  async function deleteAccount() {
    if (!confirm('Delete your account? Every Week and every Log goes with it.')) {
      return
    }

    setBusy(true)
    await authClient.deleteUser()
    await router.navigate({ to: '/sign-in' })
  }

  if (isPending) {
    return <p className='text-ink-muted'>One moment…</p>
  }

  if (!session) {
    return (
      <Card className='mx-auto max-w-sm space-y-4 text-center'>
        <h1 className='text-title'>Account</h1>
        <p className='text-ink-muted'>You are signed out.</p>
        <Link
          to='/sign-in'
          className={buttonClasses('primary', 'w-full')}
        >
          Sign in
        </Link>
      </Card>
    )
  }

  return (
    <div className='mx-auto max-w-sm space-y-6'>
      <h1 className='text-title'>Account</h1>
      <Card className='space-y-4'>
        {/* Which athlete's Weeks are on screen, said in words. */}
        <div className='space-y-1'>
          <p className='text-label text-ink-muted'>Signed in as</p>
          <p className='font-semibold break-all'>{session.user.email}</p>
        </div>
        <Button
          onClick={signOut}
          disabled={busy}
          className='w-full'
        >
          Sign out
        </Button>
      </Card>
      {/*
       * Deleting is not signing out, and the two must not read alike: this one
       * is its own section, says what it costs, and is the only control in the
       * app rendered in the warning tokens.
       */}
      <Card className='space-y-3'>
        <h2 className='text-heading'>Delete account</h2>
        <p className='text-label text-ink-muted'>
          Your Weeks and every Log on them go with it. This cannot be undone, and signing in again starts an empty
          Shelf.
        </p>
        <Button
          tone='destructive'
          onClick={deleteAccount}
          disabled={busy}
          className='w-full'
        >
          Delete account
        </Button>
      </Card>
    </div>
  )
}
