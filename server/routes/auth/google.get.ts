import { eq, isNull, or } from 'drizzle-orm'
import { useDb } from '../../db'
import { projectMembers, projects, tasks, users } from '../../db/schema'
import { ADMIN_EMAIL } from '../../utils/auth'

export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user: googleUser }) {
    if (!googleUser.email) throw createError({ statusCode: 400, statusMessage: 'Google email is required' })
    const email = googleUser.email.toLowerCase()
    const db = useDb(event)
    const now = Date.now()
    const role: 'user' | 'admin' = email === ADMIN_EMAIL ? 'admin' : 'user'
    const name = googleUser.name || email.split('@')[0]!

    const [existing] = await db.select().from(users).where(
      or(eq(users.googleId, googleUser.sub), eq(users.email, email))
    )
    const user = existing
      ? { ...existing, googleId: googleUser.sub, email, name, avatarUrl: googleUser.picture ?? null, role }
      : {
          id: crypto.randomUUID(),
          googleId: googleUser.sub,
          email,
          name,
          avatarUrl: googleUser.picture ?? null,
          role,
          createdAt: now,
          updatedAt: now
        }

    if (existing) {
      await db.update(users).set({ googleId: googleUser.sub, email, name: user.name, avatarUrl: user.avatarUrl, role, updatedAt: now })
        .where(eq(users.id, existing.id))
    } else {
      await db.insert(users).values(user)
    }

    if (role === 'admin') {
      const legacyProjects = await db.select({ id: projects.id }).from(projects).where(isNull(projects.ownerId))
      await db.batch([
        db.update(projects).set({ ownerId: user.id }).where(isNull(projects.ownerId)),
        db.update(tasks).set({ ownerId: user.id }).where(isNull(tasks.ownerId)),
        ...legacyProjects.map(project => db.insert(projectMembers).values({
          projectId: project.id, userId: user.id, role: 'owner', createdAt: now
        }).onConflictDoNothing())
      ])
    }

    await setUserSession(event, {
      user: { id: user.id, email, name: user.name, avatarUrl: user.avatarUrl, role }
    })
    return sendRedirect(event, '/')
  },
  onError(event) {
    return sendRedirect(event, '/login?error=oauth')
  }
})
