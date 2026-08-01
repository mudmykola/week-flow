import { writeFileSync } from 'node:fs'
import { getISOWeek, getISOWeekYear } from 'date-fns'
import uk from '../../i18n/locales/uk.json' with { type: 'json' }

const now = new Date()
const week = `${getISOWeekYear(now)}-W${String(getISOWeek(now)).padStart(2, '0')}`

const demoProjects = [
  { id: crypto.randomUUID(), name: uk.seed.projects[0]!, color: '#818cf8', createdAt: Date.now() },
  { id: crypto.randomUUID(), name: uk.seed.projects[1]!, color: '#f59e0b', createdAt: Date.now() },
  { id: crypto.randomUUID(), name: uk.seed.projects[2]!, color: '#64748b', createdAt: Date.now() }
]

const [portfolio, client, learning] = demoProjects

const demoTasks = [
  { title: uk.seed.tasks[0]!, status: 'in_progress' as const, projectId: portfolio!.id },
  { title: uk.seed.tasks[1]!, status: 'todo' as const, projectId: portfolio!.id },
  { title: uk.seed.tasks[2]!, status: 'done' as const, projectId: client!.id },
  { title: uk.seed.tasks[3]!, status: 'todo' as const, projectId: client!.id },
  { title: uk.seed.tasks[4]!, status: 'in_progress' as const, projectId: learning!.id },
  { title: uk.seed.tasks[5]!, status: 'todo' as const, projectId: null }
]

function sqlValue(value: string | number | null): string {
  if (value === null) return 'NULL'
  if (typeof value === 'number') return String(value)
  return `'${value.replace(/'/g, "''")}'`
}

const lines: string[] = []

for (const project of demoProjects) {
  lines.push(
    `INSERT INTO projects (id, name, color, created_at) VALUES (${sqlValue(project.id)}, ${sqlValue(project.name)}, ${sqlValue(project.color)}, ${sqlValue(project.createdAt)});`
  )
}

demoTasks.forEach((task, index) => {
  const id = crypto.randomUUID()
  const createdAt = Date.now()
  const doneAt = task.status === 'done' ? createdAt : null
  lines.push(
    `INSERT INTO tasks (id, title, note, status, project_id, week, sort, created_at, done_at) VALUES (` +
      `${sqlValue(id)}, ${sqlValue(task.title)}, NULL, ${sqlValue(task.status)}, ${sqlValue(task.projectId)}, ` +
      `${sqlValue(week)}, ${sqlValue(index)}, ${sqlValue(createdAt)}, ${sqlValue(doneAt)});`
  )
})

const sqlFilePath = new URL('./seed.sql', import.meta.url)
writeFileSync(sqlFilePath, lines.join('\n') + '\n')

console.log(`Generated server/db/seed.sql: ${demoProjects.length} projects, ${demoTasks.length} tasks for ${week}`)
console.log('Apply with: pnpm db:seed:local  (or db:seed:remote for the deployed database)')
