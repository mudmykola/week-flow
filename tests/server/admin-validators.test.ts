// @vitest-environment node

import { describe, expect, it } from 'vitest'
import {
  adminAccountPatchSchema,
  adminBulkAccountSchema,
  adminTeamPatchSchema
} from '../../server/utils/adminValidators'

const id = '00000000-0000-4000-8000-000000000001'

describe('admin validators', () => {
  it('accepts safe role and account status changes with an audit reason', () => {
    expect(adminAccountPatchSchema.parse({ role: 'pm', reason: 'Team lead' })).toEqual({
      role: 'pm',
      reason: 'Team lead'
    })
    expect(adminAccountPatchSchema.safeParse({ disabled: true }).success).toBe(true)
  })

  it('rejects empty and invalid account changes', () => {
    expect(adminAccountPatchSchema.safeParse({}).success).toBe(false)
    expect(adminAccountPatchSchema.safeParse({ role: 'owner' }).success).toBe(false)
    expect(adminAccountPatchSchema.safeParse({ disabled: 'yes' }).success).toBe(false)
  })

  it('limits bulk account operations to valid IDs and safe patches', () => {
    expect(adminBulkAccountSchema.safeParse({ ids: [id], patch: { role: 'user' } }).success).toBe(true)
    expect(adminBulkAccountSchema.safeParse({ ids: [], patch: { disabled: true } }).success).toBe(false)
    expect(adminBulkAccountSchema.safeParse({ ids: [id], patch: {} }).success).toBe(false)
  })

  it('requires a valid manager ID for team reassignment', () => {
    expect(adminTeamPatchSchema.safeParse({ managerId: id }).success).toBe(true)
    expect(adminTeamPatchSchema.safeParse({ managerId: 'manager' }).success).toBe(false)
  })
})
