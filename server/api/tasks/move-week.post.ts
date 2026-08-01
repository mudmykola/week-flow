import { and, eq, ne } from 'drizzle-orm'
import { useDb } from '../../db'
import { tasks } from '../../db/schema'
import { moveWeekSchema } from '../../utils/validators'
import { isAdmin, requireAppUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const db = useDb(event)
  const user = await requireAppUser(event)
  const body = await readValidatedBody(event, moveWeekSchema.parse)
  const [moving, target] = await Promise.all([
    db.select().from(tasks).where(and(eq(tasks.week, body.fromWeek), ne(tasks.status, 'done'), eq(tasks.ownerId, user.id))),
    db.select().from(tasks).where(and(eq(tasks.week, body.toWeek), eq(tasks.ownerId, user.id)))
  ])
  const nextSort = { todo: 0, in_progress: 0, done: 0 }
  for (const task of target) nextSort[task.status] = Math.max(nextSort[task.status], task.sort + 1)
  if (moving.length) {
    await Promise.all(moving.map(task => db.update(tasks).set({ week: body.toWeek, sort: nextSort[task.status]++ }).where(eq(tasks.id, task.id))))
  }
  return { moved: moving.length }
})
