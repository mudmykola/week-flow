import { z } from 'zod'

export const automationRuleSchema = z.object({
  name: z.string().trim().min(1).max(80),
  trigger: z.enum(['task_created', 'status_changed']),
  triggerValue: z.string().max(40).nullable().optional(),
  action: z.enum(['set_priority', 'assign_user', 'add_tag']),
  actionValue: z.string().trim().min(1).max(80),
  conditions: z
    .array(
      z.object({
        field: z.enum(['priority', 'status', 'assigneeId', 'tag', 'stageId']),
        operator: z.enum(['equals', 'not_equals', 'contains']),
        value: z.string().max(80)
      })
    )
    .max(8)
    .optional()
    .default([]),
  actions: z
    .array(
      z.object({
        type: z.enum([
          'set_priority',
          'assign_user',
          'add_tag',
          'remove_tag',
          'set_status',
          'set_stage',
          'move_week',
          'add_comment',
          'create_subtask'
        ]),
        value: z.string().max(200)
      })
    )
    .max(8)
    .optional()
    .default([]),
  enabled: z.boolean().optional().default(true)
})

export const automationRulePatchSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    trigger: z.enum(['task_created', 'status_changed']).optional(),
    triggerValue: z.string().max(40).nullable().optional(),
    action: z.enum(['set_priority', 'assign_user', 'add_tag']).optional(),
    actionValue: z.string().trim().min(1).max(80).optional(),
    conditions: z
      .array(z.object({ field: z.string(), operator: z.string(), value: z.string().max(80) }))
      .max(8)
      .optional(),
    actions: z
      .array(z.object({ type: z.string(), value: z.string().max(200) }))
      .max(8)
      .optional(),
    enabled: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0)
