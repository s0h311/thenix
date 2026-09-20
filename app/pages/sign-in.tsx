import { useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Logo } from '../components/Brand/Logo.tsx'
import { authClient } from '../libs/Auth/authClient.ts'

export const Route = createFileRoute('/sign-in')({
  component: SignInPage,
})

type Status = 'asking' | 'sending' | 'sent' | 'failed'

function SignInPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('asking')

  async function requestLink(event: FormEvent) {
    event.preventDefault()
    setStatus('sending')

    const { error } = await authClient.signIn.magicLink({ email, callbackURL: '/' })

    setStatus(error ? 'failed' : 'sent')
  }

  if (status === 'sent') {
    return (
      <div className='mx-auto max-w-sm space-y-4 text-center'>
        <Logo className='mx-auto h-12 w-auto' />
        <h1 className='text-2xl font-semibold'>Check your email</h1>
        <p>
          A sign-in link is on its way to <span className='font-semibold'>{email}</span>. It works once and expires in
          15 minutes.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={requestLink}
      className='mx-auto max-w-sm space-y-4 text-center'
    >
      <Logo className='mx-auto h-12 w-auto' />
      <h1 className='text-2xl font-semibold'>Sign in</h1>
      <p>Your email address is all you need. No password, and no separate sign up.</p>
      <input
        type='email'
        required
        autoComplete='email'
        inputMode='email'
        placeholder='you@example.com'
        aria-label='Email address'
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className='w-full rounded-md bg-brand-surface px-3 py-2 text-brand placeholder:text-brand/60'
      />
      <button
        type='submit'
        disabled={status === 'sending'}
        className='w-full rounded-md bg-brand px-3 py-2 font-semibold text-white disabled:opacity-60'
      >
        {status === 'sending' ? 'Sending…' : 'Send me a link'}
      </button>
      {status === 'failed' && <p role='alert'>That link could not be sent. Try again.</p>}
    </form>
  )
}
