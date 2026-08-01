import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDb } from '../db'
import { teams } from '../db/schema'
import { isAdmin, requireManager } from './auth'

export async function requireManagedTeam(event: H3Event, teamId?: string | null) {
  const manager = await requireManager(event)
  const [team] = await useDb(event)
    .select()
    .from(teams)
    .where(isAdmin(manager) && teamId ? eq(teams.id, teamId) : eq(teams.managerId, manager.id))
  if (!team) throw createError({ statusCode: 404, statusMessage: 'Create a team first' })
  if (!isAdmin(manager) && team.managerId !== manager.id) throw createError({ statusCode: 403 })
  return { manager, team }
}
