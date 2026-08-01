import { describe, expect, it } from 'vitest'
import { isAdmin, isManager } from '../../server/utils/auth'

describe('system roles', () => {
  it('grants administration only to admins', () => {
    expect(isAdmin({ role: 'admin' })).toBe(true)
    expect(isAdmin({ role: 'pm' })).toBe(false)
    expect(isAdmin({ role: 'user' })).toBe(false)
  })

  it('grants team management to PM and admins', () => {
    expect(isManager({ role: 'admin' })).toBe(true)
    expect(isManager({ role: 'pm' })).toBe(true)
    expect(isManager({ role: 'user' })).toBe(false)
  })
})
