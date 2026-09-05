import { and, eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDb } from '../db'
import { taskDayPlans } from '../db/schema'

type TaskSnapshot = {
  id: string
  ownerId: string | null
  assigneeId: string | null
  plannedDate: string | null
  plannedTime: string | null
  estimateMinutes: number | null
  status: 'todo' | 'in_progress' | 'done'
  carryoverReason: string | null
}

export async function upsertTaskDayPlan(
  event: H3Event,
  task: TaskSnapshot,
  values: {
    plannedDate: string
    plannedTime?: string | null
    plannedMinutes?: number | null
    status?: 'planned' | 'completed' | 'moved' | 'skipped'
    carryoverReason?: string | null
  }
) {
  const db = useDb(event)
  const now = Date.now()
  const ownerId = task.assigneeId ?? task.ownerId
  if (!ownerId) return null
  await db
    .insert(taskDayPlans)
    .values({
      id: crypto.randomUUID(),
      ownerId,
      taskId: task.id,
      plannedDate: values.plannedDate,
      plannedTime: values.plannedTime ?? task.plannedTime,
      plannedMinutes: values.plannedMinutes ?? task.estimateMinutes,
      status: values.status ?? 'planned',
      carryoverReason: values.carryoverReason ?? null,
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [taskDayPlans.taskId, taskDayPlans.plannedDate],
      set: {
        ownerId,
        plannedTime: values.plannedTime ?? task.plannedTime,
        plannedMinutes: values.plannedMinutes ?? task.estimateMinutes,
        status: values.status ?? 'planned',
        carryoverReason: values.carryoverReason ?? null,
        updatedAt: now
      }
    })
  const [plan] = await db
    .select()
    .from(taskDayPlans)
    .where(and(eq(taskDayPlans.taskId, task.id), eq(taskDayPlans.plannedDate, values.plannedDate)))
  return plan ?? null
}

export async function syncTaskDayPlans(event: H3Event, before: TaskSnapshot, after: TaskSnapshot) {
  if (before.plannedDate !== after.plannedDate) {
    if (before.plannedDate) {
      await upsertTaskDayPlan(event, after, {
        plannedDate: before.plannedDate,
        plannedTime: before.plannedTime,
        plannedMinutes: before.estimateMinutes,
        status: 'moved',
        carryoverReason: after.carryoverReason
      })
    }
    if (after.plannedDate) {
      await upsertTaskDayPlan(event, after, {
        plannedDate: after.plannedDate,
        status: after.status === 'done' ? 'completed' : 'planned'
      })
    }
  } else if (after.plannedDate && before.status !== after.status) {
    await upsertTaskDayPlan(event, after, {
      plannedDate: after.plannedDate,
      status: after.status === 'done' ? 'completed' : 'planned'
    })
  } else if (
    after.plannedDate &&
    (before.plannedTime !== after.plannedTime ||
      before.estimateMinutes !== after.estimateMinutes ||
      before.assigneeId !== after.assigneeId)
  ) {
    await upsertTaskDayPlan(event, after, {
      plannedDate: after.plannedDate,
      status: after.status === 'done' ? 'completed' : 'planned'
    })
  }
}
