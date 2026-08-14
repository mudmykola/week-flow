// @ts-expect-error Nitro creates this module during `nuxt build`.
import nitro from './.output/server/index.mjs'
import type { D1Database, ExportedHandler, Fetcher } from '@cloudflare/workers-types'
import { processDueReminders } from './server/utils/reminderEngine'

interface Env {
  DB: D1Database
  ASSETS: Fetcher
}

export default {
  fetch: nitro.fetch.bind(nitro),
  async scheduled(controller, env) {
    const delivered = await processDueReminders(env.DB, controller.scheduledTime)
    console.log(JSON.stringify({ event: 'reminders.processed', delivered, scheduledAt: controller.scheduledTime }))
  }
} satisfies ExportedHandler<Env>
