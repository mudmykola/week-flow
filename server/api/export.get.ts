import { eq } from 'drizzle-orm'
import { useDb } from '../db'
import { projects, tasks } from '../db/schema'
import { requireAppUser } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const format = getQuery(event).format === 'csv' ? 'csv' : 'json'
  const db = useDb(event)
  const [userProjects, userTasks] = await Promise.all([
    db.select().from(projects).where(eq(projects.ownerId, user.id)),
    db.select().from(tasks).where(eq(tasks.ownerId, user.id))
  ])
  if (format === 'json') return { exportedAt: new Date().toISOString(), projects: userProjects, tasks: userTasks }

  setHeader(event, 'content-type', 'text/csv; charset=utf-8')
  setHeader(event, 'content-disposition', 'attachment; filename="weekflow-tasks.csv"')
  const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
  return [
    'title,status,priority,dueDate,week,tags',
    ...userTasks.map((task) =>
      [task.title, task.status, task.priority, task.dueDate, task.week, task.tags.join('|')].map(escape).join(',')
    )
  ].join('\n')
})
