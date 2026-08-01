import { eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { userSettings } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const [settings] = await useDb(event).select().from(userSettings).where(eq(userSettings.userId, user.id))
  return settings ?? { userId: user.id, theme: 'system', locale: 'uk', weekStartsOn: 1, notifications: true, updatedAt: Date.now() }
})
