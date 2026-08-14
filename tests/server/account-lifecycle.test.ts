// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { accountDeletionStatements, deleteAccountSchema } from '../../server/utils/accountLifecycle'

describe('account lifecycle', () => {
  it('requires explicit irreversible deletion acknowledgement', () => {
    expect(deleteAccountSchema.safeParse({ email: 'user@example.com', acknowledgeDataLoss: true }).success).toBe(true)
    expect(deleteAccountSchema.safeParse({ email: 'user@example.com', acknowledgeDataLoss: false }).success).toBe(false)
  })

  it('removes dependent data before the user record in one D1 batch', () => {
    const statements = accountDeletionStatements('user-1')
    expect(statements.at(-1)).toEqual({ sql: 'DELETE FROM users WHERE id = ?', values: ['user-1'] })
    expect(statements.every((statement) => statement.values.includes('user-1'))).toBe(true)
    expect(statements.findIndex((item) => item.sql.startsWith('DELETE FROM tasks'))).toBeLessThan(
      statements.findIndex((item) => item.sql.startsWith('DELETE FROM projects'))
    )
  })
})
