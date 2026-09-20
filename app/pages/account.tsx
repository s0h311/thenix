import { createFileRoute, useRouter } from '@tanstack/react-router'
import { authClient } from '../libs/Auth/authClient.ts'

export const Route = createFileRoute('/account')({
  component: AccountPage,
})

function AccountPage() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()

  async function signOut() {
    await authClient.signOut()
    await router.navigate({ to: '/sign-in' })
  }

  async function deleteAccount() {
    if (!confirm('Delete your account? Your Weeks and Logs go with it.')) {
      return
    }

    await authClient.deleteUser()
    await router.navigate({ to: '/sign-in' })
  }

  if (isPending) {
    return <p>One moment…</p>
  }

  if (!session) {
    return <p>You are signed out.</p>
  }

  return (
    <div className='max-w-sm space-y-4'>
      <h1 className='text-2xl font-semibold'>Account</h1>
      <p>Signed in as {session.user.email}</p>
      <button
        type='button'
        onClick={signOut}
        className='w-full rounded-md bg-brand px-3 py-2 font-semibold text-white'
      >
        Sign out
      </button>
      <button
        type='button'
        onClick={deleteAccount}
        className='w-full rounded-md border border-brand px-3 py-2 font-semibold text-brand'
      >
        Delete account
      </button>
    </div>
  )
}
