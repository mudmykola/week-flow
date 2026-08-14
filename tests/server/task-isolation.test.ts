import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { canAccessTask } from '../../server/utils/taskIsolation'

describe('cross-account task isolation', () => {
  const owner = { id: 'owner', role: 'user' }
  const assignee = { id: 'assignee', role: 'user' }
  const projectEditor = { id: 'project-editor', role: 'user' }
  const admin = { id: 'admin', role: 'admin' }
  const task = { ownerId: owner.id, assigneeId: assignee.id }

  it('allows only the owner, explicit assignee and administrator', () => {
    expect(canAccessTask(owner, task)).toBe(true)
    expect(canAccessTask(assignee, task)).toBe(true)
    expect(canAccessTask(admin, task)).toBe(true)
    expect(canAccessTask(projectEditor, task)).toBe(false)
  })

  it('does not treat project membership as task visibility in list, today or details APIs', () => {
    const files = ['server/api/tasks/index.get.ts', 'server/api/today/index.get.ts', 'server/utils/taskAccess.ts']
    for (const file of files) {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8')
      expect(source).toContain(file.includes('taskAccess') ? 'canAccessTask' : 'taskIsolationCondition')
      expect(source).not.toContain('sharedProjectIds')
      expect(source).not.toContain('projectMembers')
    }
  })

  it('applies the task boundary to automation preview and execution history', () => {
    const preview = readFileSync(resolve(process.cwd(), 'server/api/automations/[id]/test.post.ts'), 'utf8')
    const history = readFileSync(
      resolve(process.cwd(), 'server/api/projects/[id]/automation-executions.get.ts'),
      'utf8'
    )
    expect(preview).toContain('requireTaskAccess(event, taskId)')
    expect(history).toContain('eq(automationExecutions.ownerId, user.id)')
    expect(history).toContain('eq(tasks.assigneeId, user.id)')
  })
})
