import { eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { teams, users } from '../../../db/schema'
import { adminTeamPatchSchema } from '../../../utils/adminValidators'
import { isAdmin, requireAppUser } from '../../../utils/auth'
import { logActivity } from '../../../utils/activity'

export default defineEventHandler(async (event) => {
  const actor = await requireAppUser(event)
  if (!isAdmin(actor)) throw createError({ statusCode: 403 })
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, adminTeamPatchSchema.parse)
  const db = useDb(event)
  const [[team], [manager]] = await Promise.all([
    db.select().from(teams).where(eq(teams.id, id)),
    db.select().from(users).where(eq(users.id, body.managerId))
  ])
  if (!team || !manager) throw createError({ statusCode: 404 })
  if (manager.disabledAt || (manager.role !== 'pm' && manager.role !== 'admin'))
    throw createError({ statusCode: 400, statusMessage: 'Manager must be an active PM or admin' })
  await db.update(teams).set({ managerId: manager.id }).where(eq(teams.id, id))
  await logActivity(event, {
    ownerId: manager.id,
    actorId: actor.id,
    action: 'admin_team_manager_changed',
    entityType: 'user',
    entityId: manager.id,
    metadata: { teamId: team.id, teamName: team.name, previousManagerId: team.managerId }
  })
  return { ok: true }
})
