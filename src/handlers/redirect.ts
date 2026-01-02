import { Hono, type Context } from 'hono'
import type { StorageAdapter } from '../storage/adapter.js'
import type { GlobalSettings } from '../types.js'
import { sanitizeRouteId } from '../utils/sanitize.js'

/**
 * Substitute placeholders in template with values.
 * Missing placeholders are left as-is (e.g., {param}) to make errors visible.
 */
function substituteTemplate(
  template: string,
  params: Record<string, string>
): string {
  return template.replace(/\{([^}]+)\}/g, (match, key) => {
    return params[key] ?? match
  })
}

/**
 * Ensure URL has a protocol. Adds https:// only if URL looks like a domain.
 * Handles edge cases: empty strings, relative paths, protocol-relative URLs.
 */
function ensureProtocol(url: string): string {
  const trimmed = url.trim()

  // Empty URL - return as-is (will fail redirect, but visible error)
  if (!trimmed) {
    return url
  }

  // Case-insensitive protocol check - already has protocol
  const lower = trimmed.toLowerCase()
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    return trimmed
  }

  // Absolute paths (start with /) - leave as-is for browser to resolve
  if (trimmed.startsWith('/')) {
    return trimmed
  }

  // Protocol-relative URLs (//example.com) - add https: only
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`
  }

  // Heuristic: if first segment looks like a domain (contains dot, but not . or ..)
  // e.g., "example.com/path" -> prepend https://
  // e.g., "page/{id}" -> leave as-is (relative path)
  // e.g., "./file" or "../path" -> leave as-is (relative navigation)
  const firstSegment = trimmed.split('/')[0]
  if (firstSegment.includes('.') && !firstSegment.startsWith('.')) {
    return `https://${trimmed}`
  }

  // Relative path - leave as-is for browser to resolve
  return trimmed
}

/**
 * Build cache headers for redirect response
 */
function buildCacheHeaders(cacheTtl: number): Record<string, string> {
  return {
    'Cache-Control': `public, max-age=${cacheTtl}, s-maxage=${cacheTtl}`,
    'CDN-Cache-Control': `max-age=${cacheTtl * 7}`, // 7x longer at edge
    Vary: 'Accept-Encoding'
  }
}

export interface RedirectHandlerOptions {
  storage: StorageAdapter
}

/**
 * Create redirect handler routes
 */
export function createRedirectHandler(options: RedirectHandlerOptions) {
  const app = new Hono()
  const { storage } = options

  // Main redirect endpoint
  app.get('/', async (c) => {
    // Get settings first to know the route parameter name
    const settings = await storage.getSettings()
    const routeParamName = settings.route_param || 'r'

    const routeId = c.req.query(routeParamName)

    // No route specified - use fallback
    if (!routeId) {
      return handleFallback(c, settings, c.req.queries())
    }

    const sanitizedId = sanitizeRouteId(routeId)
    const route = await storage.getRoute(sanitizedId)

    // Route not found or inactive
    if (!route || !route.active) {
      return handleFallback(c, settings, c.req.queries())
    }

    // Collect all query params except the route param
    const allParams: Record<string, string> = {}
    const url = new URL(c.req.url)
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== routeParamName) {
        allParams[key] = value
      }
    }

    // Add route ID as {route} placeholder
    allParams.route = sanitizedId

    // Build target URL (missing placeholders are left as-is)
    // Ensure protocol is present (add https:// if missing)
    const targetUrl = ensureProtocol(substituteTemplate(route.template, allParams))

    // Return 301 redirect with aggressive cache headers
    const cacheHeaders = buildCacheHeaders(settings.cache_ttl)
    return new Response(null, {
      status: 301,
      headers: {
        Location: targetUrl,
        ...cacheHeaders
      }
    })
  })

  // Health check endpoint
  app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  return app
}

/**
 * Handle fallback redirect when route not found or inactive.
 * Substitutes placeholders in fallback_url with query params.
 * Returns cached 301 redirect for absolute URLs.
 * Returns 404 for relative paths or non-HTTP URLs.
 */
function handleFallback(
  c: Context,
  settings: GlobalSettings,
  queryParams: Record<string, string | string[] | undefined>
): Response {
  // Convert query params to simple string record
  const params: Record<string, string> = {}
  for (const [key, value] of Object.entries(queryParams)) {
    if (value) {
      params[key] = Array.isArray(value) ? value[0] : value
    }
  }

  // Substitute any placeholders in fallback URL
  const fallbackUrl = substituteTemplate(settings.fallback_url, params)

  // If fallback is a relative path, return 404
  if (!fallbackUrl.startsWith('http')) {
    return c.text('Route not found', 404)
  }

  // Return cached 301 redirect
  const cacheHeaders = buildCacheHeaders(settings.cache_ttl)
  return new Response(null, {
    status: 301,
    headers: {
      Location: fallbackUrl,
      ...cacheHeaders
    }
  })
}
