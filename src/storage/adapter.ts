import type { RouteConfig, GlobalSettings, StoredRoute } from '../types.js'

/**
 * Storage adapter interface for route and settings persistence
 */
export interface StorageAdapter {
  /** Get a single route by ID */
  getRoute(id: string): Promise<RouteConfig | null>

  /** Get all routes */
  getAllRoutes(): Promise<StoredRoute[]>

  /** Create or update a route */
  setRoute(id: string, config: RouteConfig): Promise<void>

  /** Delete a route */
  deleteRoute(id: string): Promise<boolean>

  /** Get global settings */
  getSettings(): Promise<GlobalSettings>

  /** Update global settings */
  setSettings(settings: GlobalSettings): Promise<void>

  /**
   * Bulk create/update routes (more efficient than individual setRoute calls)
   * Replaces all existing routes atomically when clearExisting is true
   */
  setRoutes(routes: Array<{ id: string; config: RouteConfig }>, clearExisting?: boolean): Promise<void>

  /**
   * Bulk delete routes by IDs (more efficient than individual deleteRoute calls)
   */
  deleteRoutes(ids: string[]): Promise<void>
}

/**
 * Default global settings
 */
export const DEFAULT_SETTINGS: GlobalSettings = {
  fallback_url: '/not-found',
  cache_ttl: 604800, // 1 week
  route_param: 'r'
}
