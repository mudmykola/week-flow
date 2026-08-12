import type { H3Event } from 'h3'
import { and, eq } from 'drizzle-orm'
import { useDb } from '../db'
import { teamMembers, teams, users } from '../db/schema'
import { isAdmin, isManager, requireAppUser } from './auth'

export async function resolveReviewUser(event: H3Event, requestedId?: string) {
  const viewer = await requireAppUser(event)
  const targetId = requestedId || viewer.id
  if (targetId !== viewer.id) {
    if (!isManager(viewer)) throw createError({ statusCode: 403, statusMessage: 'Review access denied' })
    if (!isAdmin(viewer)) {
      const [membership] = await useDb(event)
        .select({ userId: teamMembers.userId })
        .from(teamMembers)
        .innerJoin(teams, eq(teams.id, teamMembers.teamId))
        .where(and(eq(teams.managerId, viewer.id), eq(teamMembers.userId, targetId)))
      if (!membership) throw createError({ statusCode: 403, statusMessage: 'Review access denied' })
    }
  }
  const [target] = await useDb(event)
    .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, targetId))
  if (!target) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  return { viewer, target }
}
