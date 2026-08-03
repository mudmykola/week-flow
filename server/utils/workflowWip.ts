import { and, count, eq, isNull } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDb } from '../db'
import { tasks, workflowStages } from '../db/schema'

export async function assertWorkflowWip(
  event: H3Event,
  stageId: string | null | undefined,
  currentStageId?: string | null
) {
  if (!stageId || stageId === currentStageId) return
  const db = useDb(event)
  const [stage] = await db.select().from(workflowStages).where(eq(workflowStages.id, stageId))
  if (!stage?.wipLimit || stage.wipPolicy !== 'block') return
  const [usage] = await db
    .select({ value: count() })
    .from(tasks)
    .where(and(eq(tasks.stageId, stageId), isNull(tasks.archivedAt)))
  if ((usage?.value ?? 0) >= stage.wipLimit)
    throw createError({ statusCode: 409, statusMessage: 'Workflow WIP limit reached' })
}
