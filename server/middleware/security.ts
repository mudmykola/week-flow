import { isTrustedRequestOrigin, isUnsafeApiRequest } from '../utils/requestSecurity'

export default defineEventHandler((event) => {
  const requestUrl = getRequestURL(event)
  if (!isUnsafeApiRequest(event.method, requestUrl.pathname)) return

  const origin = getRequestHeader(event, 'origin')
  if (!isTrustedRequestOrigin(origin, requestUrl.origin)) {
    throw createError({ statusCode: 403, statusMessage: 'Cross-origin request rejected' })
  }
})
