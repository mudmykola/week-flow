import { and, eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDb } from '../db'
import { teamMembers, teams } from '../db/schema'
import { isAdmin, requireAppUser } from './auth'

export async function requireAssignableUser(event: H3Event, assigneeId?: string | null) {
  const user = await requireAppUser(event)
  if (!assigneeId || isAdmin(user) || assigneeId === user.id) return user
  if (user.role !== 'pm') throw createError({ statusCode: 403, statusMessage: 'Only a manager can reassign tasks' })
  const db = useDb(event)
  const [membership] = await db
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .innerJoin(teams, and(eq(teams.id, teamMembers.teamId), eq(teams.managerId, user.id)))
    .where(eq(teamMembers.userId, assigneeId))
  if (!membership) throw createError({ statusCode: 403, statusMessage: 'Assignee is outside your team' })
  return user
}
