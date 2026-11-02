import { describe, expect, test } from 'vitest'
import { signInMail } from './signInMail.ts'

describe('the sign-in mail', () => {
  const mail = signInMail({ email: 'athlete@example.com', code: '123456' })

  test('goes to the address that asked', () => {
    expect(mail.recipients).toEqual(['athlete@example.com'])
  })

  test('carries the code in the subject, so it reads off a lock screen', () => {
    expect(mail.subject).toBe('123456 is your thenix sign-in code')
  })

  test('opens on the code and says it works once, how long it lasts, and to ignore it if unasked', () => {
    expect(mail.text.startsWith('123456\n')).toBe(true)
    expect(mail.text).toContain(
      'It works once and expires in 10 minutes. If you did not ask to sign in, ignore this mail.',
    )
  })

  test('ends on the footer the other mails carry', () => {
    expect(mail.text).toContain('Team thenix')
  })
})
