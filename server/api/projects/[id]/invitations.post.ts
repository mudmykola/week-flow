import { and, eq } from 'drizzle-orm'
import { useDb } from '../../../db'
import { invitations, projects } from '../../../db/schema'
import { requireAppUser } from '../../../utils/auth'
import { createInvitationSchema } from '../../../utils/validators'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const projectId = getRouterParam(event, 'id')!
  const [project] = await useDb(event)
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, user.id)))
  if (!project) throw createError({ statusCode: 404 })
  const body = await readValidatedBody(event, createInvitationSchema.parse)
  const invitation = {
    id: crypto.randomUUID(),
    projectId,
    email: body.email.toLowerCase(),
    role: body.role,
    token: crypto.randomUUID(),
    invitedBy: user.id,
    status: 'pending' as const,
    expiresAt: Date.now() + 7 * 86400000,
    createdAt: Date.now()
  }
  await useDb(event).insert(invitations).values(invitation)
  return { ...invitation, url: `/invite/${invitation.token}` }
})
