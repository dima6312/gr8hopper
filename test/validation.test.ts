import { test } from 'vitest'
import assert from 'node:assert/strict'
import { validateRouteIdPattern } from '../src/utils/validation.js'

test('validateRouteIdPattern: accepts valid patterns', () => {
  const validPatterns = [
    'shop/{id}',
    'files/**',
    'blog/:slug?',
    'product/{id}?lang={lang}',
    'product/{id}?*',
    'product/{id}?lang={lang=en}',
    'product/{id}?lang=en',
    'product/{id}?lang',
    'product/{id}?lang=*'
  ]

  for (const pattern of validPatterns) {
    const result = validateRouteIdPattern(pattern)
    assert.equal(result.valid, true, `Expected '${pattern}' to be valid`)
  }
})

test('validateRouteIdPattern: rejects malformed patterns', () => {
  const invalidPatterns = [
    'shop/{}',
    'shop/{=}',
    'shop/{id',
    'shop/id}',
    'shop/{id}{slug}',
    'product/{id}?=x',
    'product/{id}?lang={}',
    'product/{id}?lang={=}',
    'product/{id}?lang={?}'
  ]

  for (const pattern of invalidPatterns) {
    const result = validateRouteIdPattern(pattern)
    assert.equal(result.valid, false, `Expected '${pattern}' to be invalid`)
  }
})
