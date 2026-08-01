import { eq, inArray, or } from 'drizzle-orm'
import { useDb } from '../../db'
import { teamMembers, teams, users } from '../../db/schema'
import { isAdmin, requireAppUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const db = useDb(event)
  if (isAdmin(user))
    return db
      .select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl })
      .from(users)
      .orderBy(users.name)
  if (user.role !== 'pm')
    return db
      .select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, user.id))
  const ownTeams = await db.select({ id: teams.id }).from(teams).where(eq(teams.managerId, user.id))
  const ids = ownTeams.length
    ? (
        await db
          .select({ id: teamMembers.userId })
          .from(teamMembers)
          .where(
            inArray(
              teamMembers.teamId,
              ownTeams.map((team) => team.id)
            )
          )
      ).map((item) => item.id)
    : []
  return db
    .select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl })
    .from(users)
    .where(or(eq(users.id, user.id), ...(ids.length ? [inArray(users.id, ids)] : [])))
    .orderBy(users.name)
})
