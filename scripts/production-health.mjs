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

function redirectTarget(response, baseUrl) {
  const location = response.headers.get('location')
  if (response.status !== 302 || !location) {
    throw new Error(`OAuth entry failed: expected HTTP 302, received ${response.status}`)
  }
  return new URL(location, baseUrl)
}

export async function verifySessionEndpoint({ url, fetchImpl = fetch }) {
  const response = await fetchImpl(url, {
    headers: { accept: 'application/json' },
    redirect: 'manual'
  })
  const contentType = response.headers.get('content-type') ?? 'unknown'
  if (!response.ok || !contentType.includes('application/json')) {
    throw new Error(`Session endpoint failed: HTTP ${response.status}, content-type ${contentType}`)
  }
  await response.json()
  return { status: response.status }
}

export async function verifyOAuthEntry({ url, expectedRedirectUri, fetchImpl = fetch }) {
  const startedAt = performance.now()
  const entryUrl = new URL(url)
  let response = await fetchImpl(entryUrl, { redirect: 'manual' })
  let target = redirectTarget(response, entryUrl)
  let hops = 1

  if (target.origin === entryUrl.origin) {
    const state = target.searchParams.get('state')
    const setCookie = response.headers.get('set-cookie') ?? ''
    const cookie = setCookie.split(';', 1)[0]
    if (target.pathname !== entryUrl.pathname || !state) {
      throw new Error('OAuth entry failed: invalid state redirect')
    }
    if (!cookie || !/HttpOnly/i.test(setCookie) || !/SameSite=Lax/i.test(setCookie)) {
      throw new Error('OAuth entry failed: missing protected state cookie')
    }

    response = await fetchImpl(target, {
      headers: { cookie },
      redirect: 'manual'
    })
    target = redirectTarget(response, target)
    hops += 1
  }

  if (target.hostname !== 'accounts.google.com') throw new Error('OAuth entry failed: unexpected provider host')
  if (target.searchParams.get('redirect_uri') !== expectedRedirectUri) {
    throw new Error('OAuth entry failed: callback URL mismatch')
  }
  if (!target.searchParams.get('client_id')) throw new Error('OAuth entry failed: missing Google client ID')

  return { durationMs: Math.max(0, Math.round(performance.now() - startedAt)), hops }
}
