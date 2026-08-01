import { and, eq, inArray, or } from 'drizzle-orm'
import { useDb } from '../../db'
import { projectMembers, tasks } from '../../db/schema'
import { weekSchema } from '../../utils/validators'
import { isAdmin, requireAppUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const db = useDb(event)
  const user = await requireAppUser(event)
  const memberships = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, user.id))
  const sharedProjectIds = memberships.map((item) => item.projectId)
  const query = getQuery(event)
  const week = query.week ? weekSchema.parse(query.week) : undefined
  const projectId = typeof query.project === 'string' ? query.project : undefined

  const conditions = [
    isAdmin(user)
      ? undefined
      : sharedProjectIds.length
        ? or(eq(tasks.ownerId, user.id), inArray(tasks.projectId, sharedProjectIds))
        : eq(tasks.ownerId, user.id),
    week ? eq(tasks.week, week) : undefined,
    projectId ? eq(tasks.projectId, projectId) : undefined
  ].filter((c) => c !== undefined)

  return db
    .select()
    .from(tasks)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(tasks.sort)
})
