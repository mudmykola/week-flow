import { and, eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { focusSessions, tasks } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'
import { createFocusSessionSchema } from '../../utils/validators'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const body = await readValidatedBody(event, createFocusSessionSchema.parse)
  const db = useDb(event)
  if (body.taskId) {
    const [task] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, body.taskId), eq(tasks.ownerId, user.id)))
    if (!task) throw createError({ statusCode: 400, statusMessage: 'Invalid task' })
  }
  await db
    .update(focusSessions)
    .set({ status: 'interrupted', endedAt: Date.now() })
    .where(and(eq(focusSessions.ownerId, user.id), eq(focusSessions.status, 'active')))
  const session = {
    id: crypto.randomUUID(),
    ownerId: user.id,
    taskId: body.taskId ?? null,
    kind: body.kind,
    status: 'active' as const,
    plannedSeconds: body.plannedSeconds,
    elapsedSeconds: 0,
    note: body.note ?? null,
    result: null,
    startedAt: Date.now(),
    endedAt: null
  }
  await db.insert(focusSessions).values(session)
  return session
})
