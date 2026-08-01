import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { teamMembers, teams } from '../../db/schema'
import { requireManager } from '../../utils/auth'

const schema = z.object({ name: z.string().trim().min(2).max(100) })

export default defineEventHandler(async (event) => {
  const manager = await requireManager(event)
  const body = await readValidatedBody(event, schema.parse)
  const db = useDb(event)
  const [existing] = await db.select({ id: teams.id }).from(teams).where(eq(teams.managerId, manager.id))
  if (existing) throw createError({ statusCode: 409, statusMessage: 'Manager already has a team' })
  const team = { id: crypto.randomUUID(), name: body.name, managerId: manager.id, createdAt: Date.now() }
  await db.batch([
    db.insert(teams).values(team),
    db.insert(teamMembers).values({ teamId: team.id, userId: manager.id, createdAt: Date.now() })
  ])
  return team
})
