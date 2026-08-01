import { eq, inArray, or } from 'drizzle-orm'
import { useDb } from '../../db'
import { projectMembers, projects } from '../../db/schema'
import { isAdmin, requireAppUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const db = useDb(event)
  const user = await requireAppUser(event)
  const memberProjects = await db.select({ id: projectMembers.projectId }).from(projectMembers).where(eq(projectMembers.userId, user.id))
  const memberIds = memberProjects.map(item => item.id)
  return db.select().from(projects)
    .where(memberIds.length ? or(eq(projects.ownerId, user.id), inArray(projects.id, memberIds)) : eq(projects.ownerId, user.id))
    .orderBy(projects.createdAt)
})
