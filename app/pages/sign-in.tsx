import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Logo } from '../components/Brand/Logo.tsx'
import { Button } from '../components/UI/Button.tsx'
import { Card } from '../components/UI/Card.tsx'
import { TextInput } from '../components/UI/Field.tsx'
import { authClient } from '../libs/Auth/authClient.ts'
import {
  answered,
  asked,
  checkOutcome,
  differentEmail,
  screenOf,
  sendOutcome,
  startSigningIn,
} from '../libs/Auth/signingIn.ts'
import type { Alert, Failure } from '../libs/Auth/signingIn.ts'

export const Route = createFileRoute('/sign-in')({
  component: SignInPage,
})

/** The request never completing is an answer too: without it the button stays on "Sending…". */
async function failureOf(call: Promise<{ error: Failure | null }>): Promise<Failure | null> {
  try {
    return (await call).error
  } catch {
    return { status: null }
  }
}

function SignInPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [state, setState] = useState(startSigningIn)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const screen = screenOf(state)

  async function sendCode(event?: FormEvent) {
    event?.preventDefault()
    setState((current) => asked(current, email))

    const outcome = sendOutcome(await failureOf(authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' })))

    if (outcome === 'sent') {
      setCode('')
    }

    setState((current) => answered(current, outcome))
  }

  async function checkCode(event: FormEvent) {
    event.preventDefault()
    setState((current) => asked(current, email))

    const outcome = checkOutcome(await failureOf(authClient.signIn.emailOtp({ email, otp: code.trim() })))

    if (outcome === 'wrongCode') {
      setCode('')
    }

    setState((current) => answered(current, outcome))

    if (outcome === 'signedIn') {
      // Every read so far was answered as signed out, and those answers are no longer true.
      queryClient.clear()
      await router.navigate({ to: '/' })
    }
  }

  if (screen.at === 'signedIn') {
    return (
      <Shell>
        <p className='text-ink-muted'>One moment…</p>
      </Shell>
    )
  }

  if (screen.at === 'email') {
    return (
      <Shell>
        <h1 className='text-title'>Sign in</h1>
        <p className='text-ink-muted'>Your email address is all you need. No password, and no separate sign up.</p>
        <form
          onSubmit={(event) => void sendCode(event)}
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
            disabled={screen.busy}
            className='w-full'
          >
            {screen.button}
          </Button>
        </form>
        <Said alert={screen.alert} />
      </Shell>
    )
  }

  return (
    <Shell>
      <h1 className='text-title break-words'>{screen.heading}</h1>
      <p className='text-ink-muted'>
        {screen.lifetime}
        {screen.onlyNewest ? ' Only the newest code works.' : ''}
      </p>
      {screen.takesCode && (
        <form
          onSubmit={(event) => void checkCode(event)}
          className='space-y-4'
        >
          <TextInput
            label='Sign-in code'
            type='text'
            required
            autoComplete='one-time-code'
            inputMode='numeric'
            pattern='[0-9]*'
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <Button
            type='submit'
            tone='primary'
            disabled={screen.busy}
            className='w-full'
          >
            Sign in
          </Button>
        </form>
      )}
      <Said alert={screen.alert} />
      <Button
        tone={screen.takesCode ? 'secondary' : 'primary'}
        disabled={screen.busy}
        className='w-full'
        onClick={() => void sendCode()}
      >
        Send a new code
      </Button>
      <Button
        tone='ghost'
        disabled={screen.busy}
        className='w-full'
        onClick={() => setState(differentEmail)}
      >
        Use a different email
      </Button>
    </Shell>
  )
}

function Said({ alert }: Readonly<{ alert: Alert | null }>) {
  if (alert === null) {
    return null
  }

  return (
    <p
      role='alert'
      className='rounded-lg border border-warning-line bg-warning-soft px-3 py-2 text-label text-warning-ink'
    >
      {alert.said}
    </p>
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
