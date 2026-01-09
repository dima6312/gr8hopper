import { test } from 'vitest'
import assert from 'node:assert/strict'
import { createAdminHandler } from '../src/handlers/admin.js'
import type { StorageAdapter } from '../src/storage/adapter.js'
import type { GlobalSettings, RouteConfig, StoredRoute } from '../src/types.js'

class FakeStorage implements StorageAdapter {
  private routes = new Map<string, RouteConfig>()
  private settings: GlobalSettings = {
    fallback_url: '/not-found',
    cache_ttl: 60,
    route_param: 'r'
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

  async setRoutes(routes: Array<{ id: string; config: RouteConfig }>, clearExisting = false): Promise<void> {
    if (clearExisting) {
      this.routes.clear()
    }
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

function authHeaders(): Record<string, string> {
  const credentials = Buffer.from('admin:secret').toString('base64')
  return { Authorization: `Basic ${credentials}` }
}

test('admin routes accept encoded IDs with slashes and query tokens', async () => {
  const storage = new FakeStorage()
  const app = createAdminHandler({
    storage,
    auth: { username: 'admin', password: 'secret' }
  })

  const routeId = 'product/{id}?lang={lang}&ref={ref}'
  await storage.setRoute(routeId, {
    template: 'https://example.com/{id}',
    active: true
  })

  const encodedId = encodeURIComponent(routeId)

  const getRes = await app.request(`https://example.test/routes/${encodedId}`, {
    headers: authHeaders()
  })
  assert.equal(getRes.status, 200)
  const getBody = await getRes.json()
  assert.equal(getBody.id, routeId)

  const patchRes = await app.request(`https://example.test/routes/${encodedId}`, {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ active: false })
  })
  assert.equal(patchRes.status, 200)
  const patchBody = await patchRes.json()
  assert.equal(patchBody.active, false)

  const deleteRes = await app.request(`https://example.test/routes/${encodedId}`, {
    method: 'DELETE',
    headers: authHeaders()
  })
  assert.equal(deleteRes.status, 200)
  const deleteBody = await deleteRes.json()
  assert.equal(deleteBody.deleted, true)
})
