const tokenPattern = /^[A-Za-z0-9_-]{40,200}$/

export function validateCloudflareApiToken(token) {
  if (typeof token !== 'string' || token.length === 0) {
    return { valid: false, reason: 'missing' }
  }

  if (/\s/.test(token)) {
    return { valid: false, reason: 'whitespace' }
  }

  if (!tokenPattern.test(token)) {
    return { valid: false, reason: 'format' }
  }

  return { valid: true }
}
