import { and, eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { teamMembers } from '../../../db/schema'
import { requireManagedTeam } from '../../../utils/teamAccess'

export default defineEventHandler(async (event) => {
  const teamId = typeof getQuery(event).team === 'string' ? String(getQuery(event).team) : undefined
  const { manager, team } = await requireManagedTeam(event, teamId)
  const userId = getRouterParam(event, 'id')!
  if (userId === manager.id) throw createError({ statusCode: 400, statusMessage: 'Manager cannot leave own team' })
  await useDb(event).delete(teamMembers).where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, userId)))
  return { ok: true }
})
