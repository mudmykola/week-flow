import type { D1Database, ExecutionContext } from '@cloudflare/workers-types'

declare module 'h3' {
  interface H3EventContext {
    requestId?: string
    requestStartedAt?: number
    cloudflare: {
      env: { DB: D1Database }
      context: ExecutionContext
    }
  }
}

export {}
