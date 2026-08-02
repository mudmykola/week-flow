import { createRequestLog, resolveRequestId } from '../utils/observability'

export default defineEventHandler((event) => {
  if (!event.path.startsWith('/api/') && !event.path.startsWith('/auth/')) return

  const startedAt = Date.now()
  const requestId = resolveRequestId(getHeader(event, 'x-request-id'))
  event.context.requestId = requestId
  event.context.requestStartedAt = startedAt
  setResponseHeader(event, 'x-request-id', requestId)

  event.node.res.once('finish', () => {
    const status = event.node.res.statusCode
    const record = createRequestLog({
      level: status >= 500 ? 'error' : 'info',
      requestId,
      method: event.method,
      path: getRequestURL(event).pathname,
      status,
      durationMs: Date.now() - startedAt
    })

    const output = JSON.stringify(record)
    if (record.level === 'error') console.error(output)
    else console.log(output)
  })
})
