import { eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { tasks } from '../../../db/schema'
import { requireTaskAccess } from '../../../utils/taskAccess'
import { getServerMessages } from '../../../utils/i18n'

export default defineEventHandler(async (event) => {
  const db = useDb(event)
  const id = getRouterParam(event, 'id')!
  const { user, task } = await requireTaskAccess(event, id)
  const copy = {
    ...task,
    id: crypto.randomUUID(),
    title: `${task.title} — ${getServerMessages(event).server.copySuffix}`,
    ownerId: user.id,
    createdAt: Date.now(),
    doneAt: null,
    status: task.status === 'done' ? ('todo' as const) : task.status,
    sort: task.sort + 1
  }
  await db.insert(tasks).values(copy)
  return copy
})
