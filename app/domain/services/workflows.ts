import type { Task } from '~/domain/entities/task'

export function workflowStageUsage(tasks: Task[], projectId: string | null) {
  return tasks.reduce<Record<string, number>>((usage, task) => {
    if (task.projectId === projectId && task.stageId && !task.archivedAt) {
      usage[task.stageId] = (usage[task.stageId] ?? 0) + 1
    }
    return usage
  }, {})
}

export function orderedWorkflowStages<T extends { position: number }>(stages: T[]) {
  return stages.map((stage, position) => ({ ...stage, position }))
}

export function normalizeAutomationTrigger(trigger: string, triggerValue: string | null) {
  return trigger === 'task_created' ? null : triggerValue
}
