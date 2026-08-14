import { eq, or } from 'drizzle-orm'
import { tasks } from '../db/schema'

type TaskActor = { id: string; role: string }
type TaskOwnership = { ownerId: string | null; assigneeId: string | null }

export function canAccessTask(actor: TaskActor, task: TaskOwnership) {
  return actor.role === 'admin' || task.ownerId === actor.id || task.assigneeId === actor.id
}

export function taskIsolationCondition(actor: TaskActor) {
  return actor.role === 'admin' ? undefined : or(eq(tasks.ownerId, actor.id), eq(tasks.assigneeId, actor.id))
}
