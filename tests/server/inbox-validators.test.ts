// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { captureInboxSchema, resolveInboxSchema, updateInboxSchema } from '../../server/utils/inboxValidators'

describe('inbox validators', () => {
  it('accepts multiline capture and bounded edits', () => {
    expect(captureInboxSchema.parse({ content: 'One\nTwo' }).content).toBe('One\nTwo')
    expect(updateInboxSchema.safeParse({ content: '' }).success).toBe(false)
  })

  it('validates processing destinations and planning dates', () => {
    expect(resolveInboxSchema.safeParse({ destination: 'today', plannedDate: '2026-08-11' }).success).toBe(true)
    expect(resolveInboxSchema.safeParse({ destination: 'today' }).success).toBe(false)
    expect(resolveInboxSchema.safeParse({ destination: 'calendar' }).success).toBe(false)
    expect(resolveInboxSchema.safeParse({ destination: 'today', plannedDate: '11.08.2026' }).success).toBe(false)
  })
})
