import { and, eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { reviewProgressEntries, subtasks } from '../../../db/schema'
import { requireTaskAccess } from '../../../utils/taskAccess'
import { createReviewProgressSchema } from '../../../utils/reviewProgressValidators'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, createReviewProgressSchema.parse)
  const { user } = await requireTaskAccess(event, body.taskId, { write: true })
  const db = useDb(event)
  if (body.subtaskId) {
    const [subtask] = await db
      .select({ id: subtasks.id })
      .from(subtasks)
      .where(and(eq(subtasks.id, body.subtaskId), eq(subtasks.taskId, body.taskId)))
    if (!subtask) throw createError({ statusCode: 400, statusMessage: 'Subtask does not belong to task' })
  }
  const now = Date.now()
  const entry = {
    id: crypto.randomUUID(),
    ownerId: user.id,
    taskId: body.taskId,
    subtaskId: body.subtaskId ?? null,
    workDate: body.workDate,
    kind: body.kind ?? ('progress' as const),
    note: body.note,
    minutes: body.minutes ?? null,
    nextStep: body.nextStep ?? null,
    createdAt: now,
    updatedAt: now
  }
  await db.insert(reviewProgressEntries).values(entry)
  return entry
})
