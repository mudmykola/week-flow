import { and, eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDb } from '../db'
import { goals, teamMembers, teams } from '../db/schema'
import { isAdmin, requireAppUser } from './auth'

export async function requireGoalAccess(event: H3Event, goalId: string, manage = false) {
  const user = await requireAppUser(event)
  const db = useDb(event)
  const [goal] = await db.select().from(goals).where(eq(goals.id, goalId))
  if (!goal) throw createError({ statusCode: 404, statusMessage: 'Goal not found' })
  const [managedTeam] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.id, goal.teamId), eq(teams.managerId, user.id)))
  const canManage = isAdmin(user) || Boolean(managedTeam)
  if (manage ? !canManage : goal.assigneeId !== user.id && !canManage) throw createError({ statusCode: 403 })
  return { user, goal, canManage }
}

export async function requireGoalAssignee(event: H3Event, teamId: string, assigneeId?: string | null) {
  if (!assigneeId) return
  const user = await requireAppUser(event)
  if (assigneeId === user.id) return
  const [member] = await useDb(event)
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, assigneeId)))
  if (!member) throw createError({ statusCode: 400, statusMessage: 'Assignee is not a team member' })
}
