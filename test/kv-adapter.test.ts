import { test } from 'vitest'
import assert from 'node:assert/strict'
import { KVAdapter, ROUTE_PREFIX, ROUTE_INDEX_KEY, ROUTE_PATTERNS_KEY } from '../src/storage/kv.js'
import type { RouteConfig, StoredRoute } from '../src/types.js'

class FakeKV {
  private store = new Map<string, string>()

  async get(key: string): Promise<string | null>
  async get<T>(key: string, type: 'json'): Promise<T | null>
  async get<T>(key: string, type?: 'json'): Promise<T | string | null> {
    const value = this.store.get(key)
    if (value === undefined) return null
    if (type === 'json') {
      return JSON.parse(value) as T
    }
    return value
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value)
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }
}

test('KVAdapter: getPatternRoutes migrates legacy string[] index', async () => {
  const kv = new FakeKV()
  const adapter = new KVAdapter(kv as unknown as KVNamespace)

  const patternId = 'product/{id}'
  const config: RouteConfig = { template: 'https://example.com/{id}', active: true }

  await kv.put(`${ROUTE_PREFIX}${patternId}`, JSON.stringify(config))
  await kv.put(ROUTE_INDEX_KEY, JSON.stringify([patternId]))
  await kv.put(ROUTE_PATTERNS_KEY, JSON.stringify([patternId]))

  const patterns = await adapter.getPatternRoutes()
  assert.equal(patterns.length, 1)
  assert.equal(patterns[0].id, patternId)
  assert.equal(patterns[0].template, config.template)

  const stored = await kv.get<StoredRoute[]>(ROUTE_PATTERNS_KEY, 'json')
  assert.equal(Array.isArray(stored), true)
  assert.equal(stored?.[0]?.id, patternId)
})

test('KVAdapter: setRoutes preserves existing pattern configs when merging', async () => {
  const kv = new FakeKV()
  const adapter = new KVAdapter(kv as unknown as KVNamespace)

  const patternId = 'blog/{id}'
  const patternConfig: RouteConfig = { template: 'https://blog.example.com/{id}', active: true }
  const patternStored: StoredRoute = { ...patternConfig, id: patternId }

  await kv.put(ROUTE_INDEX_KEY, JSON.stringify([patternId]))
  await kv.put(ROUTE_PATTERNS_KEY, JSON.stringify([patternStored]))

  const newRoute = { id: 'home', config: { template: '/home', active: true } }
  await adapter.setRoutes([newRoute], false)

  const patterns = await kv.get<StoredRoute[]>(ROUTE_PATTERNS_KEY, 'json')
  const ids = (patterns || []).map(p => p.id)
  assert.equal(ids.includes(patternId), true)
})

test('KVAdapter: setRoute migrates legacy pattern index on write', async () => {
  const kv = new FakeKV()
  const adapter = new KVAdapter(kv as unknown as KVNamespace)

  const existingId = 'product/{id}'
  const existingConfig: RouteConfig = { template: 'https://example.com/{id}', active: true }

  await kv.put(`${ROUTE_PREFIX}${existingId}`, JSON.stringify(existingConfig))
  await kv.put(ROUTE_INDEX_KEY, JSON.stringify([existingId]))
  await kv.put(ROUTE_PATTERNS_KEY, JSON.stringify([existingId]))

  const newId = 'blog/{slug}'
  const newConfig: RouteConfig = { template: 'https://blog.example.com/{slug}', active: true }
  await adapter.setRoute(newId, newConfig)

  const patterns = await kv.get<StoredRoute[] | string[]>(ROUTE_PATTERNS_KEY, 'json')
  assert.equal(Array.isArray(patterns), true)
  assert.ok(patterns && patterns.length >= 2)
  assert.equal(patterns?.every(p => typeof p === 'object' && 'id' in p), true)
})

test('KVAdapter: deleteRoute migrates legacy pattern index on delete', async () => {
  const kv = new FakeKV()
  const adapter = new KVAdapter(kv as unknown as KVNamespace)

  const patternId = 'product/{id}'
  const config: RouteConfig = { template: 'https://example.com/{id}', active: true }

  await kv.put(`${ROUTE_PREFIX}${patternId}`, JSON.stringify(config))
  await kv.put(ROUTE_INDEX_KEY, JSON.stringify([patternId]))
  await kv.put(ROUTE_PATTERNS_KEY, JSON.stringify([patternId]))

  const deleted = await adapter.deleteRoute(patternId)
  assert.equal(deleted, true)

  const patterns = await kv.get<StoredRoute[] | string[]>(ROUTE_PATTERNS_KEY, 'json')
  assert.equal(Array.isArray(patterns), true)
  assert.equal(patterns?.length, 0)
})
