import { and, eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { focusSessions } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'
import { requireTaskAccess } from '../../utils/taskAccess'
import { createFocusSessionSchema } from '../../utils/validators'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const body = await readValidatedBody(event, createFocusSessionSchema.parse)
  const db = useDb(event)
  if (body.taskId) {
    await requireTaskAccess(event, body.taskId)
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
