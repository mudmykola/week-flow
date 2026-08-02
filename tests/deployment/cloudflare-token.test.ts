// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { validateCloudflareApiToken } from '../../scripts/cloudflare-token.mjs'

const validToken = `cfut_${'a1B2_c-D3'.repeat(5)}`

describe('Cloudflare API token validation', () => {
  it('accepts an opaque token without whitespace', () => {
    expect(validateCloudflareApiToken(validToken)).toEqual({ valid: true })
  })

  it.each([
    ['missing value', undefined, 'missing'],
    ['empty value', '', 'missing'],
    ['leading whitespace', ` ${validToken}`, 'whitespace'],
    ['trailing newline', `${validToken}\n`, 'whitespace'],
    ['multiline value', `${validToken}\nCopy this token`, 'whitespace'],
    ['copied container text', `Copy-token:${validToken}`, 'format'],
    ['short value', 'cfut_short', 'format']
  ])('rejects %s', (_label, token, reason) => {
    expect(validateCloudflareApiToken(token)).toEqual({ valid: false, reason })
  })
})
