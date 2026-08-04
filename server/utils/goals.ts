import { and, inArray, isNull, sql } from 'drizzle-orm'
import type { useDb } from '../db'
import { tasks } from '../db/schema'
import type { Goal } from '../db/schema'

export function computeLinkedProgress(
  done: number,
  total: number,
  storedProgress: number,
  storedStatus: Goal['status']
): { progress: number; status: Goal['status'] } {
  if (total === 0) return { progress: storedProgress, status: storedStatus }
  const progress = Math.round((done / total) * 100)
  return { progress, status: progress === 100 || storedStatus === 'done' ? 'done' : 'active' }
}

export async function withComputedProgress<T extends Goal>(db: ReturnType<typeof useDb>, goalsList: T[]) {
  const projectIds = [...new Set(goalsList.map((goal) => goal.projectId).filter((id): id is string => !!id))]
  if (!projectIds.length) return goalsList

  const counts = await db
    .select({
      projectId: tasks.projectId,
      total: sql<number>`count(*)`,
      done: sql<number>`sum(case when ${tasks.status} = 'done' then 1 else 0 end)`
    })
    .from(tasks)
    .where(and(inArray(tasks.projectId, projectIds), isNull(tasks.archivedAt)))
    .groupBy(tasks.projectId)

  return goalsList.map((goal) => {
    if (!goal.projectId) return goal
    const count = counts.find((item) => item.projectId === goal.projectId)
    const { progress, status } = computeLinkedProgress(count?.done ?? 0, count?.total ?? 0, goal.progress, goal.status)
    return { ...goal, progress, status }
  })
}
