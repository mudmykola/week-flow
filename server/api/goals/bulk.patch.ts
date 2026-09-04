import { and, eq, inArray } from 'drizzle-orm'
import { useDb } from '../../db'
import { goals, teamMembers, teams } from '../../db/schema'
import { isAdmin, requireAppUser } from '../../utils/auth'
import { goalBulkSchema } from '../../utils/goalValidators'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, goalBulkSchema.parse)
  const db = useDb(event)
  const user = await requireAppUser(event)
  const ids = [...new Set(body.ids)]

  const goalRows = await db.select().from(goals).where(inArray(goals.id, ids))
  const goalById = new Map(goalRows.map((goal) => [goal.id, goal]))
  for (const id of ids) {
    if (!goalById.has(id)) throw createError({ statusCode: 404, statusMessage: 'Goal not found' })
  }

  const teamIds = [...new Set(goalRows.map((goal) => goal.teamId))]
  const managedTeamIds = isAdmin(user)
    ? new Set(teamIds)
    : new Set(
        (
          await db
            .select({ id: teams.id })
            .from(teams)
            .where(and(inArray(teams.id, teamIds), eq(teams.managerId, user.id)))
        ).map((team) => team.id)
      )
  for (const goal of goalRows) {
    if (!managedTeamIds.has(goal.teamId)) throw createError({ statusCode: 403 })
  }

  const assigneeId = body.patch.assigneeId
  if (assigneeId && assigneeId !== user.id) {
    const memberTeamIds = new Set(
      (
        await db
          .select({ teamId: teamMembers.teamId })
          .from(teamMembers)
          .where(and(inArray(teamMembers.teamId, teamIds), eq(teamMembers.userId, assigneeId)))
      ).map((member) => member.teamId)
    )
    for (const teamId of teamIds) {
      if (!memberTeamIds.has(teamId))
        throw createError({ statusCode: 400, statusMessage: 'Assignee is not a team member' })
    }
  }

  const progress = body.patch.status === 'done' ? 100 : body.patch.status === 'active' ? 0 : undefined
  await db
    .update(goals)
    .set({ ...body.patch, ...(progress !== undefined ? { progress } : {}), updatedAt: Date.now() })
    .where(inArray(goals.id, ids))

  const updatedRows = await db.select().from(goals).where(inArray(goals.id, ids))
  const updatedById = new Map(updatedRows.map((goal) => [goal.id, goal]))
  return ids.map((id) => updatedById.get(id)!)
})
