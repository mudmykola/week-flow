// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { automationRulePatchSchema, automationRuleSchema } from '../../server/utils/workflowValidators'

describe('workflow automation validators', () => {
  it('accepts a complete automation rule', () => {
    expect(
      automationRuleSchema.parse({
        name: 'Escalate urgent tasks',
        trigger: 'status_changed',
        triggerValue: 'in_progress',
        action: 'set_priority',
        actionValue: 'urgent'
      })
    ).toMatchObject({ enabled: true, actionValue: 'urgent' })
  })

  it('supports enabled-only patches and rejects empty patches', () => {
    expect(automationRulePatchSchema.parse({ enabled: false })).toEqual({ enabled: false })
    expect(() => automationRulePatchSchema.parse({})).toThrow()
  })

  it('rejects empty names and unsupported actions', () => {
    expect(() =>
      automationRuleSchema.parse({
        name: '',
        trigger: 'task_created',
        action: 'send_email',
        actionValue: 'owner@example.com'
      })
    ).toThrow()
  })
})
