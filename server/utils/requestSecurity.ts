const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function isUnsafeApiRequest(method: string, path: string) {
  return path.startsWith('/api/') && UNSAFE_METHODS.has(method.toUpperCase())
}

export function isTrustedRequestOrigin(origin: string | undefined, requestOrigin: string) {
  if (!origin) return true

  try {
    return new URL(origin).origin === new URL(requestOrigin).origin
  } catch {
    return false
  }
}

export function isValidOAuthState(received: unknown, expected: string | undefined) {
  if (typeof received !== 'string' || !received || !expected || received.length !== expected.length) return false

  let difference = 0
  for (let index = 0; index < received.length; index += 1) {
    difference |= received.charCodeAt(index) ^ expected.charCodeAt(index)
  }
  return difference === 0
}
