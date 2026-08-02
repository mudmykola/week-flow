// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createRequestLog, resolveRequestId } from '../../server/utils/observability'

describe('request observability', () => {
  it('preserves a safe incoming correlation ID', () => {
    expect(resolveRequestId('deploy-check:12345678', () => 'generated')).toBe('deploy-check:12345678')
  })

  it('replaces malformed or unsafe correlation IDs', () => {
    expect(resolveRequestId('bad id\nvalue', () => 'generated-id')).toBe('generated-id')
    expect(resolveRequestId('short', () => 'generated-id')).toBe('generated-id')
  })

  it('creates a structured request record without query data', () => {
    const record = createRequestLog({
      level: 'info',
      requestId: 'request-12345678',
      method: 'GET',
      path: '/api/health',
      status: 200,
      durationMs: 12.6
    })

    expect(record).toMatchObject({
      event: 'http_request',
      requestId: 'request-12345678',
      path: '/api/health',
      durationMs: 13
    })
    expect(record.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})
