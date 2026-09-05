import { saveTaskDayPlanSchema } from '../../../../utils/taskDayPlanValidators'
import { requireTaskAccess } from '../../../../utils/taskAccess'
import { upsertTaskDayPlan } from '../../../../utils/taskDayPlans'

export default defineEventHandler(async (event) => {
  const taskId = getRouterParam(event, 'id')!
  const { task } = await requireTaskAccess(event, taskId, { write: true })
  const body = await readValidatedBody(event, saveTaskDayPlanSchema.parse)
  return upsertTaskDayPlan(event, task, body)
})
