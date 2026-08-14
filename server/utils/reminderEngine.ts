import type { D1Database } from '@cloudflare/workers-types'

export async function processDueReminders(db: D1Database, now = Date.now()) {
  const result = await db
    .prepare(
      `INSERT OR IGNORE INTO reminder_deliveries
        (id, owner_id, task_id, scheduled_at, delivered_at)
       SELECT lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' ||
              substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
              tasks.owner_id, tasks.id, tasks.reminder_at, ?
       FROM tasks
       LEFT JOIN user_settings ON user_settings.user_id = tasks.owner_id
       WHERE tasks.owner_id IS NOT NULL
         AND tasks.reminder_at IS NOT NULL
         AND tasks.reminder_at <= ?
         AND tasks.status <> 'done'
         AND tasks.archived_at IS NULL
         AND coalesce(user_settings.notifications, 1) = 1`
    )
    .bind(now, now)
    .run()
  return result.meta.changes ?? 0
}
