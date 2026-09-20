import { memoryAdapter } from 'better-auth/adapters/memory'
import { describe, expect, test } from 'vitest'
import { createAuth } from './createAuth.ts'
import type { MailData } from '../Mail/types.ts'

const BASE_URL = 'https://thenix.test'
const ATHLETE = 'athlete@example.com'

function createTestAuth() {
  const outbox: MailData[] = []

  const auth = createAuth({
    database: memoryAdapter({ user: [], session: [], account: [], verification: [] }),
    sendMail: async (mail) => {
      outbox.push(mail)
    },
    baseUrl: BASE_URL,
  })

  return { auth, outbox }
}

/** The link the athlete taps in the mail that just arrived. */
function lastMagicLink(outbox: MailData[]): string {
  const link = /https:\/\/\S+/.exec(outbox.at(-1)?.text ?? '')?.[0]

  if (link === undefined) {
    throw new Error('no magic link in the last mail')
  }

  return link
}

/** Taps the link, returning the headers a browser would carry afterwards. */
async function tap(auth: ReturnType<typeof createAuth>, link: string): Promise<Headers> {
  const response = await auth.api.magicLinkVerify({
    query: Object.fromEntries(new URL(link).searchParams) as { token: string },
    headers: new Headers(),
    asResponse: true,
  })

  const cookie = response.headers
    .getSetCookie()
    .map((setCookie) => setCookie.split(';')[0])
    .join('; ')

  return new Headers({ cookie })
}

describe('magic-link sign in', () => {
  test('a visitor who has never signed in ends up signed in, with no registration step', async () => {
    const { auth, outbox } = createTestAuth()

    await auth.api.signInMagicLink({ body: { email: ATHLETE }, headers: new Headers() })
    const session = await auth.api.getSession({ headers: await tap(auth, lastMagicLink(outbox)) })

    expect(session?.user.email).toBe(ATHLETE)
  })

  test('a returning user signs in the same way, as the same user', async () => {
    const { auth, outbox } = createTestAuth()

    await auth.api.signInMagicLink({ body: { email: ATHLETE }, headers: new Headers() })
    const first = await auth.api.getSession({ headers: await tap(auth, lastMagicLink(outbox)) })

    await auth.api.signInMagicLink({ body: { email: ATHLETE }, headers: new Headers() })
    const second = await auth.api.getSession({ headers: await tap(auth, lastMagicLink(outbox)) })

    expect(second?.user.id).toBe(first?.user.id)
  })

  test('the session survives closing and reopening the app', async () => {
    const { auth, outbox } = createTestAuth()

    await auth.api.signInMagicLink({ body: { email: ATHLETE }, headers: new Headers() })
    const session = await auth.api.getSession({ headers: await tap(auth, lastMagicLink(outbox)) })

    const daysUntilSignedOut = (Number(session?.session.expiresAt) - Date.now()) / 86_400_000

    expect(daysUntilSignedOut).toBeGreaterThan(29)
  })

  test('signing out ends the session', async () => {
    const { auth, outbox } = createTestAuth()

    await auth.api.signInMagicLink({ body: { email: ATHLETE }, headers: new Headers() })
    const headers = await tap(auth, lastMagicLink(outbox))

    await auth.api.signOut({ headers })

    expect(await auth.api.getSession({ headers })).toBeNull()
  })

  test('email and password is not a way in', async () => {
    const { auth } = createTestAuth()

    await expect(
      auth.api.signInEmail({
        body: { email: ATHLETE, password: 'correct horse battery staple' },
        headers: new Headers(),
      }),
    ).rejects.toThrow(/not enabled/i)
  })
})

describe('leaving', () => {
  test('deleting the account removes the user, so a later sign in starts a new one', async () => {
    const { auth, outbox } = createTestAuth()

    await auth.api.signInMagicLink({ body: { email: ATHLETE }, headers: new Headers() })
    const headers = await tap(auth, lastMagicLink(outbox))
    const deleted = await auth.api.getSession({ headers })

    await auth.api.deleteUser({ body: {}, headers })

    expect(await auth.api.getSession({ headers })).toBeNull()

    await auth.api.signInMagicLink({ body: { email: ATHLETE }, headers: new Headers() })
    const reborn = await auth.api.getSession({ headers: await tap(auth, lastMagicLink(outbox)) })

    expect(reborn?.user.id).not.toBe(deleted?.user.id)
  })
})
