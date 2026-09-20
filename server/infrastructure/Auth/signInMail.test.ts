import { describe, expect, test } from 'vitest'
import { signInMail } from './signInMail.ts'

const LINK = 'https://thenix.test/api/auth/magic-link/verify?token=abc&callbackURL=%2F'

describe('the sign-in mail', () => {
  test('is addressed to the visitor who asked for it', () => {
    expect(signInMail({ email: 'athlete@example.com', url: LINK }).recipients).toEqual(['athlete@example.com'])
  })

  test('carries the link, since there is nothing else to act on', () => {
    expect(signInMail({ email: 'athlete@example.com', url: LINK }).text).toContain(LINK)
  })

  test('says how long the link lasts, so a stale one is not a mystery', () => {
    expect(signInMail({ email: 'athlete@example.com', url: LINK }).text).toContain('15 minutes')
  })

  test('is written in English, subject and body alike', () => {
    const { subject, text } = signInMail({ email: 'athlete@example.com', url: LINK })

    expect(`${subject}\n${text}`).not.toMatch(/Klick|Passwort|Bestätig|bestätig|Änderung|Inhaber|Telefon|E-Mail/)
  })
})
