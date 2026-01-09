import { test } from 'vitest'
import assert from 'node:assert/strict'
import { matchRoute, getPatternParamNames } from '../src/utils/matcher.js'

test('matchRoute: supports :param segments and {param?} optional segments', () => {
  const params = matchRoute('shop/:category/:id', 'shop/shoes/42')
  assert.ok(params)
  assert.equal(params.category, 'shoes')
  assert.equal(params.id, '42')

  const optionalParams = matchRoute('blog/{year?}/{slug}', 'blog/launch')
  assert.ok(optionalParams)
  assert.equal(optionalParams.slug, 'launch')
  assert.equal('year' in optionalParams, false)
})

test('matchRoute: supports :param? optional segments and root defaults', () => {
  const optionalParams = matchRoute('blog/:year?/:slug', 'blog/launch')
  assert.ok(optionalParams)
  assert.equal(optionalParams.slug, 'launch')
  assert.equal('year' in optionalParams, false)

  const rootDefault = matchRoute('{page=home}', '')
  assert.ok(rootDefault)
  assert.equal(rootDefault.page, 'home')
})

test('matchRoute: supports ** catch-all segments', () => {
  const rootCatch = matchRoute('files/**', 'files')
  assert.ok(rootCatch)
  assert.equal(rootCatch['**'], '')

  const nestedCatch = matchRoute('files/**', 'files/a/b/c')
  assert.ok(nestedCatch)
  assert.equal(nestedCatch['**'], 'a/b/c')

  const middleCatch = matchRoute('a/**/c', 'a/x/y/c')
  assert.ok(middleCatch)
  assert.equal(middleCatch['**'], 'x/y')
})

test('matchRoute: supports query wildcards, literals, and defaults', () => {
  const wildcardParams = matchRoute('product/{id}?*', 'product/123', new URLSearchParams('utm=abc'))
  assert.ok(wildcardParams)
  assert.equal(wildcardParams.id, '123')
  assert.equal(wildcardParams.utm, 'abc')

  const literalParams = matchRoute('product/{id}?lang=en', 'product/123', new URLSearchParams('lang=en'))
  assert.ok(literalParams)
  assert.equal(literalParams.id, '123')

  const literalFail = matchRoute('product/{id}?lang=en', 'product/123', new URLSearchParams('lang=fr'))
  assert.equal(literalFail, null)

  const defaultParams = matchRoute('product/{id}?lang={lang=en}', 'product/123')
  assert.ok(defaultParams)
  assert.equal(defaultParams.id, '123')
  assert.equal(defaultParams.lang, 'en')
})

test('matchRoute: preserves raw path values in params', () => {
  const params = matchRoute('files/{name}', 'files/Report.PDF')
  assert.ok(params)
  assert.equal(params.name, 'Report.PDF')
})

test('getPatternParamNames: includes :param names and reserved route', () => {
  const params = getPatternParamNames('shop/:category/:id?')
  assert.ok(params.has('route'))
  assert.ok(params.has('category'))
  assert.ok(params.has('id'))
})

test('matchRoute: handles :param? ambiguity with query strings', () => {
  // Case 1: :param? at end of pattern (Marker)
  const markerParams = matchRoute('shop/:id?', 'shop')
  assert.ok(markerParams)
  assert.equal('id' in markerParams, false)

  // Case 2: :param? followed by / (Marker)
  const midMarkerParams = matchRoute('shop/:id?/next', 'shop/next')
  assert.ok(midMarkerParams)
  assert.equal('id' in midMarkerParams, false)

  // Case 3: :param? followed by text (Query Separator)
  // This means :id is REQUIRED, and we have a query requirement
  const separatorParams = matchRoute('shop/:id?sort=asc', 'shop/123', new URLSearchParams('sort=asc'))
  assert.ok(separatorParams)
  assert.equal(separatorParams.id, '123')

  // Should fail if id is missing (because it became required)
  const separatorFail = matchRoute('shop/:id?sort=asc', 'shop', new URLSearchParams('sort=asc'))
  assert.equal(separatorFail, null)
})

test('matchRoute: * matches exactly one segment', () => {
  const result = matchRoute('shop/*/details', 'shop/shoes/details')
  assert.ok(result)
  assert.equal(result['*'], 'shoes')

  // Should NOT match if multiple segments are present for single asterisk
  const multiMatch = matchRoute('shop/*/details', 'shop/shoes/sneakers/details')
  assert.equal(multiMatch, null)
})

test('matchRoute: ensures full path consumption even with wildcards', () => {
  // Pattern a/**/c should NOT match a/b/c/d (d is extra)
  const partial = matchRoute('a/**/c', 'a/b/c/d')
  assert.equal(partial, null)

  const full = matchRoute('a/**/c', 'a/x/y/c')
  assert.ok(full)
  assert.equal(full['**'], 'x/y')
})

test('matchRoute: assigns indexed wildcards without overwriting', () => {
  const multiStar = matchRoute('a/*/b/*', 'a/x/b/y')
  assert.ok(multiStar)
  assert.equal(multiStar['*'], 'x')
  assert.equal(multiStar['*1'], 'y')

  const multiGlob = matchRoute('a/**/b/**', 'a/x/y/b/z')
  assert.ok(multiGlob)
  assert.equal(multiGlob['**'], 'x/y')
  assert.equal(multiGlob['**1'], 'z')
})

test('matchRoute: handles deep paths up to backtrack limit', () => {
  // 150 segments with single globstar should work within 500 backtrack limit
  const segments = Array(150).fill('x').join('/')
  const result = matchRoute('**/target', segments + '/target')
  assert.ok(result)
  assert.equal(result['**'], segments)
})

test('matchRoute: aborts on patterns exceeding backtrack depth (ReDoS protection)', () => {
  // Pattern with multiple globstars at the very end that can't match causes exponential backtracking
  // a/**/b/**/c/**/d/**/e with many segments where no valid match exists
  // The algorithm tries all combinations before giving up
  const segments = Array(100).fill('x').join('/')
  // This pattern requires finding 'b', 'c', 'd', 'e' in sequence within the path
  // But our path only has 'x' segments, so no match can exist - but the algorithm must try all combinations
  const result = matchRoute('a/**/b/**/c/**/d/**/e', `a/${segments}`)
  // Should return null (no match found, but importantly, it doesn't hang or take forever)
  assert.equal(result, null)
})

test('matchRoute: query param matching is case-sensitive', () => {
  // Lowercase pattern matches lowercase query
  const match = matchRoute('product/{id}?source={source}', 'product/123', new URLSearchParams('source=google'))
  assert.ok(match)

  // Lowercase pattern does NOT match uppercase query (by design)
  const noMatch = matchRoute('product/{id}?source={source}', 'product/123', new URLSearchParams('Source=google'))
  assert.equal(noMatch, null)
})
