import { useDb } from '../../db'
import { projectMembers, projects } from '../../db/schema'
import { createProjectSchema } from '../../utils/validators'
import { requireAppUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const db = useDb(event)
  const user = await requireAppUser(event)
  const body = await readValidatedBody(event, createProjectSchema.parse)

  const project = {
    id: crypto.randomUUID(),
    name: body.name,
    color: body.color,
    createdAt: Date.now(),
    ownerId: user.id
  }

  await db.batch([
    db.insert(projects).values(project),
    db.insert(projectMembers).values({ projectId: project.id, userId: user.id, role: 'owner', createdAt: Date.now() })
  ])
  return project
})
