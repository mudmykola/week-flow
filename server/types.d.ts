import type { D1Database, ExecutionContext } from '@cloudflare/workers-types'

declare module 'h3' {
  interface H3EventContext {
    cloudflare: {
      env: { DB: D1Database }
      context: ExecutionContext
    }
  }
}

export {}
