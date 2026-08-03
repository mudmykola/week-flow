import { and, desc, eq, gte } from 'drizzle-orm'
import { useDb } from '../../db'
import { focusSessions, tasks } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const since = Date.now() - 30 * 86_400_000
  const rows = await useDb(event)
    .select({
      id: focusSessions.id,
      taskId: focusSessions.taskId,
      taskTitle: tasks.title,
      kind: focusSessions.kind,
      status: focusSessions.status,
      plannedSeconds: focusSessions.plannedSeconds,
      elapsedSeconds: focusSessions.elapsedSeconds,
      note: focusSessions.note,
      result: focusSessions.result,
      startedAt: focusSessions.startedAt,
      endedAt: focusSessions.endedAt
    })
    .from(focusSessions)
    .leftJoin(tasks, eq(tasks.id, focusSessions.taskId))
    .where(and(eq(focusSessions.ownerId, user.id), gte(focusSessions.startedAt, since)))
    .orderBy(desc(focusSessions.startedAt))
    .limit(250)
  return { sessions: rows, active: rows.find((item) => item.status === 'active') ?? null }
})
