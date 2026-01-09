import { test } from 'vitest'
import assert from 'node:assert/strict'
import { sanitizeRouteId } from '../src/utils/sanitize.js'

test('sanitizeRouteId: preserves supported pattern tokens', () => {
  assert.equal(sanitizeRouteId('shop/:id'), 'shop/:id')
  assert.equal(sanitizeRouteId('files/**'), 'files/**')
  assert.equal(sanitizeRouteId('product/{id}?lang={lang}'), 'product/{id}?lang={lang}')
})

test('sanitizeRouteId: strips unsupported characters', () => {
  assert.equal(sanitizeRouteId('My Route!'), 'myroute')
  assert.equal(sanitizeRouteId('weird^name$'), 'weirdname')
})

test('sanitizeRouteId: strips backslashes to prevent escape injection', () => {
  assert.equal(sanitizeRouteId('shop\\{id}'), 'shop{id}')
  assert.equal(sanitizeRouteId('path\\\\to\\\\file'), 'pathtofile')
})

test('sanitizeRouteId: handles empty and whitespace inputs', () => {
  assert.equal(sanitizeRouteId(''), '')
  assert.equal(sanitizeRouteId('   '), '')
  assert.equal(sanitizeRouteId('!@#$%'), '')
})

test('sanitizeRouteId: handles special characters and edge cases', () => {
  assert.equal(sanitizeRouteId('/route/'), '/route/')
  assert.equal(sanitizeRouteId('"/route"'), '/route')
  assert.equal(sanitizeRouteId("'route'"), 'route')
  assert.equal(sanitizeRouteId('(route)'), 'route')
  assert.equal(sanitizeRouteId('route@domain'), 'routedomain')
  assert.equal(sanitizeRouteId('query&params'), 'query&params')
  assert.equal(sanitizeRouteId('a=b;c#d'), 'a=bcd')
})

test('sanitizeRouteId: handles Unicode characters', () => {
  assert.equal(sanitizeRouteId('café'), 'caf')
  assert.equal(sanitizeRouteId('日本語'), '')
  assert.equal(sanitizeRouteId('route-日本'), 'route-')
})

test('sanitizeRouteId: handles very long inputs', () => {
  const longString = 'a'.repeat(10000)
  const result = sanitizeRouteId(longString)
  assert.equal(typeof result, 'string')
  assert.equal(result.length, 10000)
})
