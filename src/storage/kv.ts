import type { StorageAdapter } from './adapter.js'
import { DEFAULT_SETTINGS } from './adapter.js'
import type { RouteConfig, GlobalSettings, StoredRoute } from '../types.js'

const ROUTE_PREFIX = 'route:'
const SETTINGS_KEY = 'settings:global'
const ROUTE_INDEX_KEY = 'routes:index'

/**
 * Cloudflare KV storage adapter with settings caching
 */
export class KVAdapter implements StorageAdapter {
  private settingsCache: { settings: GlobalSettings; timestamp: number } | null = null
  private static readonly SETTINGS_CACHE_TTL = 5000 // 5 seconds

  constructor(private kv: KVNamespace) {}

  async getRoute(id: string): Promise<RouteConfig | null> {
    const data = await this.kv.get(`${ROUTE_PREFIX}${id}`, 'json')
    return data as RouteConfig | null
  }

  async getAllRoutes(): Promise<StoredRoute[]> {
    // Get route index
    const index = await this.kv.get<string[]>(ROUTE_INDEX_KEY, 'json')
    if (!index || index.length === 0) {
      return []
    }

    // Fetch all routes in parallel
    const routes = await Promise.all(
      index.map(async (id) => {
        const config = await this.getRoute(id)
        if (config) {
          return { ...config, id }
        }
        return null
      })
    )

    return routes.filter((r): r is StoredRoute => r !== null)
  }

  async setRoute(id: string, config: RouteConfig): Promise<void> {
    // Update route
    await this.kv.put(`${ROUTE_PREFIX}${id}`, JSON.stringify(config))

    // Update index
    const index = (await this.kv.get<string[]>(ROUTE_INDEX_KEY, 'json')) || []
    if (!index.includes(id)) {
      index.push(id)
      await this.kv.put(ROUTE_INDEX_KEY, JSON.stringify(index))
    }
  }

  async deleteRoute(id: string): Promise<boolean> {
    const exists = await this.getRoute(id)
    if (!exists) {
      return false
    }

    // Delete route
    await this.kv.delete(`${ROUTE_PREFIX}${id}`)

    // Update index
    const index = (await this.kv.get<string[]>(ROUTE_INDEX_KEY, 'json')) || []
    const newIndex = index.filter((i) => i !== id)
    await this.kv.put(ROUTE_INDEX_KEY, JSON.stringify(newIndex))

    return true
  }

  async getSettings(): Promise<GlobalSettings> {
    const now = Date.now()
    // Return cached settings if still valid (reduces KV reads for burst traffic)
    if (this.settingsCache && (now - this.settingsCache.timestamp < KVAdapter.SETTINGS_CACHE_TTL)) {
      // Return a copy to prevent mutation of cached data
      return { ...this.settingsCache.settings }
    }

    const settings = await this.kv.get<GlobalSettings>(SETTINGS_KEY, 'json')
    // Clone DEFAULT_SETTINGS to prevent mutation of the constant
    const result = settings ? { ...settings } : { ...DEFAULT_SETTINGS }

    // Cache a copy of the result
    this.settingsCache = { settings: { ...result }, timestamp: now }
    return result
  }

  async setSettings(settings: GlobalSettings): Promise<void> {
    await this.kv.put(SETTINGS_KEY, JSON.stringify(settings))
    // Invalidate cache on update
    this.settingsCache = null
  }
}
