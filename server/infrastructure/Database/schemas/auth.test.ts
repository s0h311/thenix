import { getTableColumns } from 'drizzle-orm'
import { describe, expect, test } from 'vitest'
import { session, user } from './auth.ts'

describe('the stored user', () => {
  test('carries no role, and nothing to ban or impersonate — there are no admin surfaces', () => {
    expect(Object.keys(getTableColumns(user))).not.toContain('role')
    expect(Object.keys(getTableColumns(user))).not.toContain('banned')
    expect(Object.keys(getTableColumns(user))).not.toContain('banReason')
    expect(Object.keys(getTableColumns(user))).not.toContain('banExpires')
    expect(Object.keys(getTableColumns(session))).not.toContain('impersonatedBy')
  })
})
