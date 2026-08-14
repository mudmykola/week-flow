import { useDb } from '../../../db'
import { goals } from '../../../db/schema'
import { requireGoalAccess } from '../../../utils/goalAccess'
import { getServerMessages } from '../../../utils/i18n'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const { user, goal } = await requireGoalAccess(event, id)
  const now = Date.now()
  const copy = {
    ...goal,
    id: crypto.randomUUID(),
    title: `${goal.title} — ${getServerMessages(event).server.copySuffix}`,
    assigneeId: goal.assigneeId ?? user.id,
    progress: 0,
    status: 'active' as const,
    projectId: null,
    createdBy: user.id,
    createdAt: now,
    updatedAt: now
  }
  await useDb(event).insert(goals).values(copy)
  return copy
})
