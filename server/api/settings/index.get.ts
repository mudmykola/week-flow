import { eq } from 'drizzle-orm'
import { useDb } from '../../db'
import { userSettings } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'
import { defaultDaySchedule } from '../../../shared/types/daySchedule'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const [settings] = await useDb(event).select().from(userSettings).where(eq(userSettings.userId, user.id))
  return settings
    ? { ...settings, daySchedule: settings.daySchedule ?? defaultDaySchedule }
    : {
        userId: user.id,
        theme: 'system',
        locale: 'uk',
        weekStartsOn: 1,
        notifications: true,
        daySchedule: defaultDaySchedule,
        updatedAt: Date.now()
      }
})
