import { and, eq, gt } from 'drizzle-orm'
import { useDb } from '../../../db'
import { invitations, projectMembers } from '../../../db/schema'
import { requireAppUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const token = getRouterParam(event, 'token')!
  const db = useDb(event)
  const [invitation] = await db.select().from(invitations).where(and(eq(invitations.token, token), eq(invitations.status, 'pending'), gt(invitations.expiresAt, Date.now())))
  if (!invitation || invitation.email !== user.email.toLowerCase()) throw createError({ statusCode: 404, statusMessage: 'Invitation not found' })
  await db.batch([
    db.insert(projectMembers).values({ projectId: invitation.projectId, userId: user.id, role: invitation.role, createdAt: Date.now() }).onConflictDoUpdate({ target: [projectMembers.projectId, projectMembers.userId], set: { role: invitation.role } }),
    db.update(invitations).set({ status: 'accepted' }).where(eq(invitations.id, invitation.id))
  ])
  return { projectId: invitation.projectId }
})
