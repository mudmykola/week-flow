export function isHealthyPayload(value) {
  return Boolean(value && typeof value === 'object' && value.status === 'ok' && value.database === 'ok')
}

export async function verifyProductionHealth({
  url,
  requestId,
  attempts = 6,
  delayMs = 10_000,
  fetchImpl = fetch,
  sleep = (duration) => new Promise((resolve) => setTimeout(resolve, duration)),
  onRetry = () => {}
}) {
  let lastReason = 'no response'

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        headers: { 'x-request-id': requestId, accept: 'application/json' },
        redirect: 'follow'
      })
      const contentType = response.headers.get('content-type') ?? 'unknown'

      if (response.ok && contentType.includes('application/json')) {
        const payload = await response.json()
        if (isHealthyPayload(payload)) return payload
        lastReason = `unexpected health payload (HTTP ${response.status})`
      } else {
        lastReason = `HTTP ${response.status}, content-type ${contentType}`
      }
    } catch (error) {
      lastReason = error instanceof Error ? error.message : 'network error'
    }

    if (attempt < attempts) {
      onRetry({ attempt, attempts, reason: lastReason })
      await sleep(delayMs)
    }
  }

  throw new Error(`Production health check failed after ${attempts} attempts: ${lastReason}`)
}
