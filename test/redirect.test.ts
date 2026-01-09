import { test } from 'vitest'
import assert from 'node:assert/strict'
import { createRedirectHandler } from '../src/handlers/redirect.js'
import type { GlobalSettings, RouteConfig, StoredRoute } from '../src/types.js'
import type { StorageAdapter } from '../src/storage/adapter.js'

class FakeStorage implements StorageAdapter {
  private routes = new Map<string, RouteConfig>()
  private settings: GlobalSettings

  constructor(settings: GlobalSettings) {
    this.settings = settings
  }

  async getRoute(id: string): Promise<RouteConfig | null> {
    return this.routes.get(id) || null
  }

  async getAllRoutes(): Promise<StoredRoute[]> {
    return Array.from(this.routes.entries()).map(([id, config]) => ({ ...config, id }))
  }

  async setRoute(id: string, config: RouteConfig): Promise<void> {
    this.routes.set(id, config)
  }

  async deleteRoute(id: string): Promise<boolean> {
    return this.routes.delete(id)
  }

  async getSettings(): Promise<GlobalSettings> {
    return this.settings
  }

  async setSettings(settings: GlobalSettings): Promise<void> {
    this.settings = settings
  }

  async setRoutes(routes: Array<{ id: string; config: RouteConfig }>): Promise<void> {
    for (const { id, config } of routes) {
      this.routes.set(id, config)
    }
  }

  async deleteRoutes(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.routes.delete(id)
    }
  }
}

test('redirect fallback allows relative paths and blocks dangerous schemes', async () => {
  const storage = new FakeStorage({
    fallback_url: '/not-found',
    cache_ttl: 60,
    route_param: 'r'
  })
  const app = createRedirectHandler({ storage })
  const res = await app.request('https://example.test/unknown')
  assert.equal(res.status, 301)
  assert.equal(res.headers.get('Location'), '/not-found')

  await storage.setSettings({
    fallback_url: 'javascript:alert(1)',
    cache_ttl: 60,
    route_param: 'r'
  })
  const blocked = await app.request('https://example.test/unknown')
  assert.equal(blocked.status, 404)
})

test('passthrough keeps destination query values over source params', async () => {
  const storage = new FakeStorage({
    fallback_url: '/not-found',
    cache_ttl: 60,
    route_param: 'r'
  })
  await storage.setRoute('promo', {
    template: 'https://example.com/?utm=dest&x=1',
    active: true,
    passthrough: true
  })

  const app = createRedirectHandler({ storage })
  const res = await app.request('https://example.test/?r=promo&utm=src&x=2&y=3')
  assert.equal(res.status, 301)
  const location = res.headers.get('Location')
  assert.ok(location)
  const url = new URL(location)
  assert.equal(url.searchParams.get('utm'), 'dest')
  assert.equal(url.searchParams.get('x'), '1')
  assert.equal(url.searchParams.get('y'), '3')
  assert.equal(url.searchParams.get('r'), null)
})

test('route placeholder is URL-encoded to prevent query injection', async () => {
  const storage = new FakeStorage({
    fallback_url: '/not-found',
    cache_ttl: 60,
    route_param: 'r'
  })

  const routeId = 'product/{id}?lang={lang}&ref={ref}'
  await storage.setRoute(routeId, {
    template: 'https://example.com/?route={route}&id={id}&lang={lang}&ref={ref}',
    active: true
  })

  const app = createRedirectHandler({ storage })
  const res = await app.request('https://example.test/product/123?lang=en&ref=partner')
  assert.equal(res.status, 301)
  const location = res.headers.get('Location')
  assert.ok(location)
  assert.ok(location.includes(`route=${encodeURIComponent(routeId)}`))
})

test('user-defined route parameter is overwritten by reserved placeholder', async () => {
  const storage = new FakeStorage({
    fallback_url: '/not-found',
    cache_ttl: 60,
    route_param: 'r'
  })

  // User defines a path param named 'route' - this collides with the reserved placeholder
  const routeId = 'product/{route}/{id}'
  await storage.setRoute(routeId, {
    template: 'https://example.com/?user_route={route}&id={id}',
    active: true
  })

  const app = createRedirectHandler({ storage })
  const res = await app.request('https://example.test/product/shoes/123')
  assert.equal(res.status, 301)
  const location = res.headers.get('Location')
  assert.ok(location)
  // 'route' should be the route ID (URL-encoded), NOT 'shoes'
  // The reserved 'route' placeholder takes precedence
  assert.ok(location.includes(`user_route=${encodeURIComponent(routeId)}`))
  assert.ok(!location.includes('user_route=shoes'))
})

test('fallback URL strips unmatched placeholder query params cleanly', async () => {
  const storage = new FakeStorage({
    fallback_url: '/404?missing={id}&source=app',
    cache_ttl: 60,
    route_param: 'r'
  })

  const app = createRedirectHandler({ storage })
  const res = await app.request('https://example.test/unknown')
  assert.equal(res.status, 301)
  const location = res.headers.get('Location')
  assert.ok(location)
  // Should NOT have empty missing= param, should have source=app
  assert.equal(location, '/404?source=app')
})

test('template with domain and port gets https:// prepended', async () => {
  const storage = new FakeStorage({
    fallback_url: '/not-found',
    cache_ttl: 60,
    route_param: 'r'
  })

  await storage.setRoute('port-test', {
    template: 'example.com:8080/path',
    active: true
  })

  const app = createRedirectHandler({ storage })
  const res = await app.request('https://example.test/?r=port-test')
  assert.equal(res.status, 301)
  const location = res.headers.get('Location')
  assert.ok(location)
  // Should prepend https:// even with port
  assert.equal(location, 'https://example.com:8080/path')
})
