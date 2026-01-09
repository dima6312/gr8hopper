import type { StorageAdapter } from './adapter.js'
import { DEFAULT_SETTINGS } from './adapter.js'
import type { RouteConfig, GlobalSettings, StoredRoute } from '../types.js'
import { isPattern } from '../utils/pattern.js'

export const ROUTE_PREFIX = 'route:'
export const SETTINGS_KEY = 'settings:global'
export const ROUTE_INDEX_KEY = 'routes:index'
export const ROUTE_PATTERNS_KEY = 'routes:patterns'

/**
 * Cloudflare KV storage adapter with settings caching.
 * 
 * ⚠️ CONCURRENCY NOTE: KV does not support transactions. Read-modify-write
 * operations on indexes (routes:index, routes:patterns) may lose updates if
 * multiple admins edit routes simultaneously. Consider serializing edits or
 * using import/export for batch updates in high-concurrency scenarios.
 * 
 * ⚠️ CACHE NOTE: Settings are shallow-cloned. If adding nested objects to
 * GlobalSettings in the future, implement deep cloning in getSettings/setSettings.
 */
export class KVAdapter implements StorageAdapter {
  private settingsCache: { settings: GlobalSettings; timestamp: number } | null = null
  private static readonly SETTINGS_CACHE_TTL = 5000 // 5 seconds

  constructor(private kv: KVNamespace) { }

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
    // Note: For very large indexes (>100 routes), this may hit sub-request limits.
    // However, the admin UI is the primary consumer of getAllRoutes.
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

  /**
   * Optimized: Fetches all pattern routes in a single KV read.
   * This is critical for performance as it's called on every request.
   */
  async getPatternRoutes(): Promise<StoredRoute[]> {
    const data = await this.kv.get<StoredRoute[] | string[]>(ROUTE_PATTERNS_KEY, 'json')

    // Handle null (missing key) - lazy rebuild
    if (data === null) {
      console.info('[KV] Pattern index missing, rebuilding from all routes...')
      const patterns = (await this.getAllRoutes()).filter(r => isPattern(r.id))
      // Always write the index (even when empty) to prevent repeated expensive rebuilds
      await this.kv.put(ROUTE_PATTERNS_KEY, JSON.stringify(patterns))
      return patterns
    }

    // Handle legacy string[] format (older KV data or pre-migration import)
    if (data.length > 0 && data.some(item => typeof item === 'string')) {
      const patterns = (await this.getAllRoutes()).filter(r => isPattern(r.id))
      await this.kv.put(ROUTE_PATTERNS_KEY, JSON.stringify(patterns))
      return patterns
    }

    return (data as StoredRoute[]) || []
  }

  /**
   * ⚠️ CONCURRENCY WARNING: KV does not support transactions.
   * Read-modify-write on indexes may cause lost updates if multiple admins 
   * edit routes simultaneously.
   */
  async setRoute(id: string, config: RouteConfig): Promise<void> {
    // Update route data
    await this.kv.put(`${ROUTE_PREFIX}${id}`, JSON.stringify(config))

    // Update main index
    const index = (await this.kv.get<string[]>(ROUTE_INDEX_KEY, 'json')) || []
    if (!index.includes(id)) {
      index.push(id)
      await this.kv.put(ROUTE_INDEX_KEY, JSON.stringify(index))
    }

    // Update patterns data
    // We store the full StoredRoute object for pattern routes to avoid N+1 reads
    if (isPattern(id)) {
      const patterns = await this.getPatternRoutes()
      const existingIndex = patterns.findIndex(p => p.id === id)

      const routeData: StoredRoute = { ...config, id }
      if (existingIndex >= 0) {
        patterns[existingIndex] = routeData
      } else {
        patterns.push(routeData)
      }
      await this.kv.put(ROUTE_PATTERNS_KEY, JSON.stringify(patterns))
    }
  }

  async deleteRoute(id: string): Promise<boolean> {
    const exists = await this.getRoute(id)
    if (!exists) {
      return false
    }

    // Delete route
    await this.kv.delete(`${ROUTE_PREFIX}${id}`)

    // Update main index
    const index = (await this.kv.get<string[]>(ROUTE_INDEX_KEY, 'json')) || []
    const newIndex = index.filter((i) => i !== id)
    if (index.length !== newIndex.length) {
      await this.kv.put(ROUTE_INDEX_KEY, JSON.stringify(newIndex))
    }

    // Update patterns data
    if (isPattern(id)) {
      const patterns = await this.getPatternRoutes()
      const newPatterns = patterns.filter((p) => p.id !== id)
      if (patterns.length !== newPatterns.length) {
        await this.kv.put(ROUTE_PATTERNS_KEY, JSON.stringify(newPatterns))
      }
    }

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

  async setRoutes(routes: Array<{ id: string; config: RouteConfig }>, clearExisting = false): Promise<void> {
    if (clearExisting) {
      // Get current routes and delete them first
      const existingIndex = (await this.kv.get<string[]>(ROUTE_INDEX_KEY, 'json')) || []
      if (existingIndex.length > 0) {
        await Promise.all(
          existingIndex.map(id => this.kv.delete(`${ROUTE_PREFIX}${id}`))
        )
      }
    }

    // Write all new routes in parallel
    await Promise.all(
      routes.map(({ id, config }) =>
        this.kv.put(`${ROUTE_PREFIX}${id}`, JSON.stringify(config))
      )
    )

    // Build new indexes
    let newIndex: string[]
    const routeIds = routes.map(r => r.id)

    if (clearExisting) {
      newIndex = routeIds
    } else {
      const existingIndex = (await this.kv.get<string[]>(ROUTE_INDEX_KEY, 'json')) || []
      const newIdsSet = new Set(routeIds)
      newIndex = [...existingIndex.filter(id => !newIdsSet.has(id)), ...routeIds]
    }

    await this.kv.put(ROUTE_INDEX_KEY, JSON.stringify(newIndex))

    // Efficiently rebuild patterns data from input (avoids N+1 KV reads)
    // Preserve existing pattern configs when clearExisting is false.
    const importedRoutes = new Map(routes.map(r => [r.id, r.config]))
    const existingPatterns = clearExisting ? [] : await this.getPatternRoutes()
    const existingPatternMap = new Map(existingPatterns.map(route => [route.id, route]))
    const patternRoutes = newIndex
      .filter(id => isPattern(id))
      .map(id => {
        const config = importedRoutes.get(id)
        if (config) {
          return { ...config, id }
        }
        const existing = existingPatternMap.get(id)
        return existing || null
      })
      .filter((p): p is StoredRoute => p !== null)
    await this.kv.put(ROUTE_PATTERNS_KEY, JSON.stringify(patternRoutes))
  }

  async deleteRoutes(ids: string[]): Promise<void> {
    if (ids.length === 0) return

    // Delete all routes in parallel
    await Promise.all(
      ids.map(id => this.kv.delete(`${ROUTE_PREFIX}${id}`))
    )

    // Update the index
    const existingIndex = (await this.kv.get<string[]>(ROUTE_INDEX_KEY, 'json')) || []
    const idsToDelete = new Set(ids)
    const newIndex = existingIndex.filter(id => !idsToDelete.has(id))
    await this.kv.put(ROUTE_INDEX_KEY, JSON.stringify(newIndex))

    // Update patterns data
    const existingPatterns = await this.getPatternRoutes()
    const newPatterns = existingPatterns.filter(p => !idsToDelete.has(p.id))
    await this.kv.put(ROUTE_PATTERNS_KEY, JSON.stringify(newPatterns))
  }
}
