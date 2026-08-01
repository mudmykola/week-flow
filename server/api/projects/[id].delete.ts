import { and, eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { projects, tasks } from '../../db/schema'
import { isAdmin, requireAppUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const db = useDb(event)
  const user = await requireAppUser(event)
  const id = getRouterParam(event, 'id')!

  const [project] = await db.select().from(projects).where(
    isAdmin(user) ? eq(projects.id, id) : and(eq(projects.id, id), eq(projects.ownerId, user.id))
  )
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Project not found' })

  await db.batch([
    db.update(tasks).set({ projectId: null }).where(eq(tasks.projectId, id)),
    db.delete(projects).where(eq(projects.id, id))
  ])

  return { ok: true }
})
