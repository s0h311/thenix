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
  awaitingAnswer,
  checkOutcome,
  differentEmail,
  screenOf,
  sendOutcome,
  startSigningIn,
} from '../libs/Auth/signingIn.ts'
import type { Failure, Outcome } from '../libs/Auth/signingIn.ts'

export const Route = createFileRoute('/sign-in')({
  component: SignInPage,
})

type AuthAnswer = { error: { status: number; code?: string | undefined } | null }

/** The request never completing is an answer too: without it the button stays on "Sending…". */
async function failureOf(call: Promise<AuthAnswer>): Promise<Failure | null> {
  try {
    const { error } = await call

    return error === null ? null : { status: error.status, reason: error.code }
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

  async function ask(
    event: FormEvent | undefined,
    { call, outcomeOf }: { call: () => Promise<AuthAnswer>; outcomeOf: (failure: Failure | null) => Outcome },
  ) {
    event?.preventDefault()
    setState((current) => awaitingAnswer(current, email))

    const outcome = outcomeOf(await failureOf(call()))

    if (outcome === 'sent' || outcome === 'wrongCode') {
      setCode('')
    }

    setState((current) => answered(current, outcome))

    return outcome
  }

  async function sendCode(event?: FormEvent) {
    await ask(event, {
      call: () => authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' }),
      outcomeOf: sendOutcome,
    })
  }

  async function checkCode(event: FormEvent) {
    const outcome = await ask(event, {
      call: () => authClient.signIn.emailOtp({ email, otp: code.trim() }),
      outcomeOf: checkOutcome,
    })

    if (outcome === 'signedIn') {
      // Every read so far was answered as signed out, and those answers are no longer true.
      queryClient.clear()
      await router.navigate({ to: '/' })
    }
  }

  if (screen.at === 'signedIn') {
    return (
      <SignInCard>
        <p className='text-ink-muted'>One moment…</p>
      </SignInCard>
    )
  }

  if (screen.at === 'email') {
    return (
      <SignInCard>
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
        <Said said={screen.said} />
      </SignInCard>
    )
  }

  // One primary action on a screen: a failed send points at sending again, not at the field.
  const sendsNew = screen.next === 'sendNew' || screen.next === 'retry'

  return (
    <SignInCard>
      <h1 className='text-title break-words'>{screen.heading}</h1>
      <p className='text-ink-muted'>
        {screen.lifetime}
        {screen.onlyNewest ? ' Only the newest code works.' : ''}
      </p>
      {screen.next !== 'sendNew' && (
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
            tone={sendsNew ? 'secondary' : 'primary'}
            disabled={screen.busy}
            className='w-full'
          >
            Sign in
          </Button>
        </form>
      )}
      <Said said={screen.said} />
      <Button
        tone={sendsNew ? 'primary' : 'secondary'}
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
    </SignInCard>
  )
}

function Said({ said }: Readonly<{ said: string | null }>) {
  if (said === null) {
    return null
  }

  return (
    <p
      role='alert'
      className='rounded-lg border border-warning-line bg-warning-soft px-3 py-2 text-label text-warning-ink'
    >
      {said}
    </p>
  )
}

function SignInCard({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Card className='mx-auto max-w-sm space-y-4 text-center'>
      <Logo className='mx-auto h-12 w-auto' />
      {children}
    </Card>
  )
}
