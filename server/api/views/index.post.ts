import { z } from 'zod'
import { useDb } from '../../db'
import { savedViews } from '../../db/schema'
import { requireAppUser } from '../../utils/auth'

const schema = z.object({ name: z.string().trim().min(1).max(80), filters: z.record(z.string(), z.unknown()) })

export default defineEventHandler(async (event) => {
  const user = await requireAppUser(event)
  const body = await readValidatedBody(event, schema.parse)
  const view = { id: crypto.randomUUID(), ownerId: user.id, ...body, createdAt: Date.now() }
  await useDb(event).insert(savedViews).values(view)
  return view
})
