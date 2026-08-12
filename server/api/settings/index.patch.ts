import { useDb } from '../../db'
import { userSettings } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'
import { updateSettingsSchema } from '../../utils/validators'
import { defaultDaySchedule } from '../../../shared/types/daySchedule'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const body = await readValidatedBody(event, updateSettingsSchema.parse)
  const value = {
    userId: user.id,
    theme: body.theme ?? 'system',
    locale: body.locale ?? 'uk',
    weekStartsOn: body.weekStartsOn ?? 1,
    notifications: body.notifications ?? true,
    daySchedule: body.daySchedule ?? defaultDaySchedule,
    updatedAt: Date.now()
  }
  await useDb(event)
    .insert(userSettings)
    .values(value)
    .onConflictDoUpdate({ target: userSettings.userId, set: { ...body, updatedAt: Date.now() } })
  return value
})
