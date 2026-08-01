import { and, eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDb } from '../db'
import { projectMembers, projects } from '../db/schema'
import { isAdmin, requireAppUser } from './auth'

export async function requireProjectAccess(event: H3Event, projectId: string, write = false) {
  const user = await requireAppUser(event)
  const db = useDb(event)
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  if (isAdmin(user) || project.ownerId === user.id) return { user, project }
  const [member] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)))
  if (!member || (write && member.role !== 'editor')) throw createError({ statusCode: 403 })
  return { user, project }
}
