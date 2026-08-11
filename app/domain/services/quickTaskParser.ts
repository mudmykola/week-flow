import type { AssignableUser, TaskPriority } from '~/domain/entities/task'
import type { Project } from '~/domain/entities/project'
import { addDays, format } from 'date-fns'

export function parseQuickTask(input: string, projects: Project[], assignees: AssignableUser[]) {
  let title = input.trim()
  let priority: TaskPriority = 'medium'
  let estimateMinutes: number | null = null
  let plannedTime: string | null = null
  let projectId: string | null = null
  let assigneeId: string | null = null
  let plannedDate: string | null = null

  title = title.replace(/!(low|medium|high|urgent)\b/gi, (_, value: string) => {
    priority = value.toLowerCase() as TaskPriority
    return ''
  })
  title = title.replace(/~(\d{1,3})m\b/gi, (_, value: string) => {
    estimateMinutes = Math.min(1440, Math.max(5, Number(value)))
    return ''
  })
  title = title.replace(/\b([01]\d|2[0-3]):([0-5]\d)\b/, (value) => {
    plannedTime = value
    return ''
  })
  title = title.replace(/(\u0441\u044c\u043e\u0433\u043e\u0434\u043d\u0456|today)(?=\s|$)/i, () => {
    plannedDate = format(new Date(), 'yyyy-MM-dd')
    return ''
  })
  title = title.replace(/(\u0437\u0430\u0432\u0442\u0440\u0430|tomorrow)(?=\s|$)/i, () => {
    plannedDate = format(addDays(new Date(), 1), 'yyyy-MM-dd')
    return ''
  })
  for (const project of projects) {
    const token = `#${project.name}`
    if (title.toLocaleLowerCase().includes(token.toLocaleLowerCase())) {
      projectId = project.id
      title = title.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '')
      break
    }
  }
  for (const person of assignees) {
    const firstName = person.name.split(/\s+/)[0]!
    const token = `@${firstName}`
    if (title.toLocaleLowerCase().includes(token.toLocaleLowerCase())) {
      assigneeId = person.id
      title = title.replace(new RegExp(token, 'i'), '')
      break
    }
  }
  return {
    title: title.replace(/\s+/g, ' ').trim(),
    priority,
    estimateMinutes,
    plannedTime,
    plannedDate,
    projectId,
    assigneeId
  }
}
