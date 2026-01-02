/**
 * Configuration for a single redirect route
 */
export interface RouteConfig {
  /** URL template with {param} placeholders */
  template: string
  /** Whether this route is active */
  active: boolean
}

/**
 * Global settings for the redirect service
 */
export interface GlobalSettings {
  /** Fallback URL when route not found (can contain {param} placeholders) */
  fallback_url: string
  /** Cache TTL in seconds (default: 604800 = 1 week) */
  cache_ttl: number
  /** URL parameter name for route selection (default: 'r') */
  route_param: string
}

/**
 * Stored route with its ID
 */
export interface StoredRoute extends RouteConfig {
  id: string
}

/**
 * Environment bindings for Cloudflare Workers
 */
export interface Env {
  ROUTES_KV?: KVNamespace
  ADMIN_USERNAME?: string
  ADMIN_PASSWORD?: string
  ADMIN_PATH?: string
  /** Cloudflare API token for cache purging (optional) */
  CLOUDFLARE_API_TOKEN?: string
  /** Cloudflare Zone ID for cache purging (optional) */
  CLOUDFLARE_ZONE_ID?: string
}

/**
 * Combined configuration file format (for JSON storage)
 */
export interface ConfigFile {
  routes: Record<string, RouteConfig>
  settings: GlobalSettings
}
