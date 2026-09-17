export type WorkflowStage = {
  id: string
  name: string
  color: string
  category: 'todo' | 'in_progress' | 'done'
  position: number
  wipLimit: number | null
  wipPolicy: 'warn' | 'block'
}

export type AutomationRule = {
  id: string
  name: string
  trigger: 'task_created' | 'status_changed'
  triggerValue: string | null
  action: 'set_priority' | 'assign_user' | 'add_tag'
  actionValue: string
  enabled: boolean
  conditions: Array<{ field: string; operator: string; value: string }>
  actions: Array<{ type: string; value: string }>
}

export type AutomationExecution = {
  id: string
  ruleName: string | null
  taskId: string | null
  taskTitle: string | null
  status: 'success' | 'skipped' | 'failed'
  trigger: string
  changes: Record<string, unknown>
  error: string | null
  createdAt: number
}

export type WorkflowDeleteTarget = { type: 'stage' | 'rule'; id: string; name: string } | null

export type WorkflowTab = 'stages' | 'automations' | 'history' | 'metrics'

export type WorkflowStageDraft = Omit<WorkflowStage, 'id' | 'position'>
export type AutomationRuleDraft = Omit<AutomationRule, 'id'>
