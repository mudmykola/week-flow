import { drizzle } from 'drizzle-orm/d1'
import type { H3Event } from 'h3'
import * as schema from './schema.ts'

export function useDb(event: H3Event) {
  const d1 = event.context.cloudflare.env.DB
  return drizzle(d1, { schema })
}
