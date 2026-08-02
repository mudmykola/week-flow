export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')

  try {
    await event.context.cloudflare.env.DB.prepare('SELECT 1 AS ok').first()
    return {
      status: 'ok',
      database: 'ok',
      timestamp: new Date().toISOString(),
      requestId: event.context.requestId
    }
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: 'Service unavailable',
      data: { requestId: event.context.requestId }
    })
  }
})
