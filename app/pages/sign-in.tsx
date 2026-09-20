import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Logo } from '../components/Brand/Logo.tsx'
import { Button } from '../components/UI/Button.tsx'
import { Card } from '../components/UI/Card.tsx'
import { TextInput } from '../components/UI/Field.tsx'
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
      <Shell>
        <h1 className='text-title'>Check your email</h1>
        <p className='text-ink-muted'>
          A sign-in link is on its way to <span className='font-semibold text-ink'>{email}</span>. It works once and
          expires in 15 minutes.
        </p>
      </Shell>
    )
  }

  return (
    <Shell>
      <h1 className='text-title'>Sign in</h1>
      <p className='text-ink-muted'>Your email address is all you need. No password, and no separate sign up.</p>
      <form
        onSubmit={requestLink}
        className='space-y-4'
      >
        <TextInput
          label='Email address'
          type='email'
          required
          autoComplete='email'
          inputMode='email'
          placeholder='you@example.com'
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button
          type='submit'
          tone='primary'
          disabled={status === 'sending'}
          className='w-full'
        >
          {status === 'sending' ? 'Sending…' : 'Send me a link'}
        </Button>
      </form>
      {status === 'failed' && (
        <p
          role='alert'
          className='rounded-lg border border-warning-line bg-warning-soft px-3 py-2 text-label text-warning-ink'
        >
          That link could not be sent. Try again.
        </p>
      )}
    </Shell>
  )
}

function Shell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Card className='mx-auto max-w-sm space-y-4 text-center'>
      <Logo className='mx-auto h-12 w-auto' />
      {children}
    </Card>
  )
}
