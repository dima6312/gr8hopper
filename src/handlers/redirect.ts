import { Hono, type Context } from 'hono'
import type { StorageAdapter } from '../storage/adapter.js'
import type { GlobalSettings, RouteConfig, StoredRoute } from '../types.js'
import { sanitizeRouteId } from '../utils/sanitize.js'
import { DANGEROUS_SCHEMES } from '../utils/validation.js'
import { matchRoute, getPatternParamNames } from '../utils/matcher.js'

/**
 * Substitute placeholders in template with values.
 * Missing placeholders are left as-is (e.g., {param}) to make errors visible.
 */
function substituteTemplate(
  template: string,
  params: Record<string, string>
): string {
  return template.replace(/\{([^}]+)\}/g, (match, key) => {
    const paramKey = String(key)
    return params[paramKey] ?? match
  })
}

/**
 * Ensure URL has a protocol. Adds https:// only if URL looks like a domain.
 * Blocks dangerous schemes (javascript:, data:, etc.) for security.
 * Handles edge cases: empty strings, relative paths, protocol-relative URLs.
 */
function ensureProtocol(url: string): string {
  const trimmed = url.trim()

  // Empty URL - return as-is (will fail redirect, but visible error)
  if (!trimmed) {
    return url
  }

  const lower = trimmed.toLowerCase()

  // SECURITY: Block dangerous URL schemes (could be injected via query params)
  for (const scheme of DANGEROUS_SCHEMES) {
    if (lower.startsWith(scheme)) {
      // Return safe fallback - will show "Route not found" to user
      return ''
    }
  }

  // Case-insensitive protocol check - already has http(s) protocol
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    return trimmed
  }

  // Absolute paths (start with /) - leave as-is for browser to resolve
  if (trimmed.startsWith('/')) {
    return trimmed
  }

  // Protocol-relative URLs (//example.com) - blocked (explicit decision)
  if (trimmed.startsWith('//')) {
    return ''
  }

  // Heuristic: if first segment looks like a domain, prepend https://
  // Domain pattern: contains dot, has alphanumeric before dot, ends with 2+ letter TLD
  // e.g., "example.com/path" -> prepend https://
  // e.g., "example.com:8080/path" -> prepend https:// (port stripped for TLD check)
  // e.g., "page/{id}" -> leave as-is (relative path)
  // e.g., "./file" or "../path" -> leave as-is (relative navigation)
  // e.g., "page.html" or "report.pdf" -> leave as-is (filename, not domain)
  const firstSegment = trimmed.split('/')[0]
  // Strip port if present (e.g., example.com:8080 -> example.com)
  const hostPart = firstSegment.split(':')[0]
  if (hostPart.includes('.') && !hostPart.startsWith('.')) {
    const parts = hostPart.split('.')
    const lastPart = parts[parts.length - 1].toLowerCase()

    // Common file extensions to exclude (would otherwise look like TLDs)
    const fileExtensions = new Set([
      'html', 'htm', 'php', 'asp', 'aspx', 'jsp', 'cgi',
      'css', 'js', 'ts', 'jsx', 'tsx', 'vue', 'svelte',
      'json', 'xml', 'yaml', 'yml', 'toml', 'csv', 'txt', 'md',
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
      'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp',
      'mp3', 'mp4', 'wav', 'avi', 'mov', 'webm', 'ogg',
      'zip', 'tar', 'gz', 'rar', 'exe', 'dmg', 'pkg', 'deb', 'rpm',
      'woff', 'woff2', 'ttf', 'eot', 'otf'
    ])

    // TLD must be 2+ alphabetic characters AND not a known file extension
    if (lastPart.length >= 2 && /^[a-zA-Z]+$/.test(lastPart) && !fileExtensions.has(lastPart)) {
      return `https://${trimmed}`
    }
  }

  // Relative path - leave as-is for browser to resolve
  return trimmed
}

/**
 * Merge passthrough query parameters into destination URL.
 * Handles relative URLs, placeholders, and edge cases safely.
 * 
 * IMPORTANT: This function expects the destination URL to already have
 * placeholders substituted. It only merges query parameters.
 * Supports repeated parameters (e.g., ?tag=a&tag=b).
 * 
 * @param destinationUrl Destination URL (may be relative, placeholders already substituted)
 * @param sourceParams Source URL query parameters (from request, not allParams)
 * @param routeParamName Route parameter name to exclude (e.g., 'r')
 * @param excludeParams Set of parameter names to exclude from passthrough
 * @returns URL with merged query parameters
 */
function mergePassthroughParams(
  destinationUrl: string,
  sourceParams: URLSearchParams,
  routeParamName: string,
  excludeParams: Set<string>
): string {
  // Safe URL parsing: split into path?query#hash components
  const hashIndex = destinationUrl.indexOf('#')
  const queryIndex = destinationUrl.indexOf('?')

  let pathPart: string
  let existingQuery: string
  let hashPart: string

  if (hashIndex >= 0) {
    hashPart = destinationUrl.slice(hashIndex)
    const beforeHash = destinationUrl.slice(0, hashIndex)
    if (queryIndex >= 0 && queryIndex < hashIndex) {
      pathPart = beforeHash.slice(0, queryIndex)
      existingQuery = beforeHash.slice(queryIndex + 1)
    } else {
      pathPart = beforeHash
      existingQuery = ''
    }
  } else {
    hashPart = ''
    if (queryIndex >= 0) {
      pathPart = destinationUrl.slice(0, queryIndex)
      existingQuery = destinationUrl.slice(queryIndex + 1)
    } else {
      pathPart = destinationUrl
      existingQuery = ''
    }
  }

  // Use URLSearchParams for robust query merging
  const finalParams = new URLSearchParams(existingQuery)

  // Track which keys we've already matched from the destination template
  // (to avoid duplicate passthrough if they were already explicitly in the template)
  const existingKeys = new Set<string>()
  for (const key of finalParams.keys()) {
    existingKeys.add(key)
  }

  // Add all source params that are not excluded
  for (const [key, value] of sourceParams.entries()) {
    if (key === routeParamName) continue
    if (excludeParams.has(key)) continue

    // Template param takes precedence - don't overwrite with source param
    if (existingKeys.has(key)) continue

    finalParams.append(key, value)
  }

  const queryString = finalParams.toString()
  return pathPart + (queryString ? '?' + queryString : '') + hashPart
}

/**
 * Build cache headers for redirect response
 */
function buildCacheHeaders(cacheTtl: number, edgeTtl: number = cacheTtl * 7): Record<string, string> {
  return {
    'Cache-Control': `public, max-age=${cacheTtl}, s-maxage=${cacheTtl}`,
    'CDN-Cache-Control': `max-age=${edgeTtl}`, // 7x longer at edge by default
    Vary: 'Accept-Encoding'
  }
}

/**
 * Common logic to build redirect response:
 * 1. Substitute placeholders
 * 2. Merge passthrough query params
 * 3. Ensure protocol
 * 4. Build response with cache headers
 */
function buildRedirectResponse(
  route: RouteConfig,
  routeId: string,
  url: URL,
  routeParamName: string,
  settings: GlobalSettings,
  matchedParams: Record<string, string> = {}
): Response | null {
  // Collect all parameters for substitution
  const allParams: Record<string, string> = { ...matchedParams }
  for (const [key, value] of url.searchParams.entries()) {
    if (key !== routeParamName && !(key in allParams)) {
      allParams[key] = value
    }
  }
  allParams.route = encodeURIComponent(routeId)

  // 1. Substitute template FIRST
  let targetUrl = substituteTemplate(route.template, allParams)
  if (!targetUrl) return null

  // 2. Merge passthrough SECOND (if enabled)
  if (route.passthrough) {
    // Extract template placeholders to exclude from passthrough
    const templatePlaceholders = (route.template.match(/\{([^}]+)\}/g) || [])
      .map(m => m.slice(1, -1))
    const excludeParams = new Set<string>(['route', ...templatePlaceholders])

    // Also exclude pattern parameter names
    const patternExcludes = getPatternParamNames(routeId)
    patternExcludes.forEach(p => excludeParams.add(p))

    targetUrl = mergePassthroughParams(
      targetUrl,
      url.searchParams,
      routeParamName,
      excludeParams
    )
  }

  // 3. Ensure protocol LAST
  targetUrl = ensureProtocol(targetUrl)
  if (!targetUrl) return null

  const cacheHeaders = buildCacheHeaders(settings.cache_ttl)
  return new Response(null, {
    status: 301,
    headers: { Location: targetUrl, ...cacheHeaders }
  })
}

export interface RedirectHandlerOptions {
  storage: StorageAdapter
}

/**
 * Create redirect handler routes
 */
export function createRedirectHandler(options: RedirectHandlerOptions): Hono {
  const app = new Hono()
  const { storage } = options

  // Health check endpoint for monitoring and load balancers
  app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // Pattern cache to avoid re-sorting on every request
  let cachedPatterns: StoredRoute[] | null = null
  let cacheTimestamp = 0
  let cacheRefreshPromise: Promise<void> | null = null // Latch to prevent thundering herd
  let lastRefreshError = 0 // Timestamp of last refresh failure
  const CACHE_TTL = 10000 // 10 seconds
  const ERROR_BACKOFF = 5000 // 5 second backoff on errors

  const getPatternScore = (patternId: string): number => {
    const queryIndex = patternId.indexOf('?')
    const pathPattern = queryIndex >= 0 ? patternId.slice(0, queryIndex) : patternId
    const queryPattern = queryIndex >= 0 ? patternId.slice(queryIndex + 1) : ''

    const pathSegments = pathPattern.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)
    let score = 0

    for (const segment of pathSegments) {
      if (segment === '**') {
        score += 1
      } else if (segment === '*') {
        score += 10
      } else if (segment.startsWith('{') && segment.endsWith('}')) {
        score += segment.includes('?') || segment.includes('=') ? 25 : 50
      } else if (segment.startsWith(':')) {
        score += segment.endsWith('?') ? 25 : 50
      } else {
        score += 100
      }
    }

    if (queryPattern) {
      const pairs = queryPattern.split('&')
      for (const pair of pairs) {
        if (!pair || pair === '*') continue
        const equalIndex = pair.indexOf('=')
        if (equalIndex < 0) {
          score += 6
          continue
        }

        const valueSpec = pair.slice(equalIndex + 1).trim()
        if (valueSpec === '*') {
          score += 1
        } else if (valueSpec.startsWith('{') && valueSpec.endsWith('}')) {
          const inner = valueSpec.slice(1, -1).trim()
          score += inner.includes('=') || inner.endsWith('?') ? 3 : 6
        } else {
          score += 10
        }
      }
    }

    return score * 1000 + Math.min(patternId.length, 999)
  }

  // Main redirect endpoint
  app.get('*', async (c) => {
    // Get settings first to know the route parameter name
    const settings = await storage.getSettings()
    const routeParamName = settings.route_param || 'r'
    const url = new URL(c.req.url)

    // 1. QUERY PARAMETER MATCH
    const queryRouteId = c.req.query(routeParamName)
    if (queryRouteId) {
      const sanitizedId = sanitizeRouteId(queryRouteId)
      const route = await storage.getRoute(sanitizedId)

      if (route && route.active) {
        const response = buildRedirectResponse(route, sanitizedId, url, routeParamName, settings)
        if (response) return response
      }
      return handleFallback(c, settings, c.req.queries())
    }

    // 2. PATH MATCHING (Exact & Pattern)
    const path = url.pathname.slice(1) // remove leading slash

    // Skip favicon.ico automatic requests
    if (path === 'favicon.ico') {
      return c.text('Not found', 404)
    }

    const sanitizedPath = sanitizeRouteId(path)

    // 2a. EXACT MATCH
    if (sanitizedPath) {
      const exactRoute = await storage.getRoute(sanitizedPath)
      if (exactRoute && exactRoute.active) {
        const response = buildRedirectResponse(exactRoute, sanitizedPath, url, routeParamName, settings)
        if (response) return response
      }
    }

    // 2b. PATTERN MATCH
    const now = Date.now()
    if (!cachedPatterns || now - cacheTimestamp > CACHE_TTL) {
      // Skip refresh if recently failed (basic circuit breaker)
      const shouldSkipRefresh = lastRefreshError && now - lastRefreshError < ERROR_BACKOFF

      // Use latch to prevent thundering herd - only one refresh at a time
      if (!shouldSkipRefresh && !cacheRefreshPromise) {
        cacheRefreshPromise = (async (): Promise<void> => {
          try {
            const patterns = typeof storage.getPatternRoutes === 'function'
              ? await storage.getPatternRoutes()
              : (await storage.getAllRoutes()).filter((route) =>
                route.id.includes('{') || route.id.includes('*') || route.id.includes('?') || route.id.includes(':'))

            patterns.sort((a, b) => getPatternScore(b.id) - getPatternScore(a.id))
            cachedPatterns = patterns
            cacheTimestamp = Date.now()
            lastRefreshError = 0 // Clear error on success
          } catch (err) {
            console.error('[Redirect] Pattern cache refresh failed:', err)
            lastRefreshError = Date.now()
            // Clear cache on failure to force fallback instead of serving stale data
            cachedPatterns = null
          } finally {
            cacheRefreshPromise = null
          }
        })()
      }
      if (cacheRefreshPromise) {
        await cacheRefreshPromise
      }
    }

    // Safety check (cachedPatterns is guaranteed non-null after latch completes)
    if (!cachedPatterns) {
      return handleFallback(c, settings, c.req.queries())
    }

    for (const patternRoute of cachedPatterns) {
      if (!patternRoute.active) continue

      const match = matchRoute(patternRoute.id, path, url.searchParams)
      if (match) {
        const response = buildRedirectResponse(patternRoute, patternRoute.id, url, routeParamName, settings, match)
        if (response) return response
      }
    }

    // No match found
    return handleFallback(c, settings, c.req.queries())
  })

  return app
}

/**
 * Handle fallback redirect when route not found or inactive.
 * Substitutes placeholders in fallback_url with query params.
 * Returns cached 301 redirect for absolute or relative URLs.
 * Returns 404 for empty or blocked URLs.
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
  let fallbackUrl = substituteTemplate(settings.fallback_url, params)

  // Remove query param entries with unmatched placeholders (e.g., ?missing={id}&source=foo -> ?source=foo)
  // This avoids broken URLs with empty values like ?missing=&source=foo
  fallbackUrl = fallbackUrl.replace(/([?&])([^=&]+)=\{[^}]+\}(&|$)/g, (_match, prefix: string, _key: string, suffix: string): string => {
    // If there's a following param, keep the prefix; otherwise remove entirely
    return suffix === '&' ? prefix : ''
  })
  // Clean up any remaining edge cases (double ampersands, trailing ampersands/question marks)
  fallbackUrl = fallbackUrl.replace(/[?&]$/, '').replace(/&&+/g, '&').replace(/\?&/, '?')
  // Strip any remaining placeholders in path segments
  fallbackUrl = fallbackUrl.replace(/\{[^}]+\}/g, '')

  fallbackUrl = ensureProtocol(fallbackUrl)

  // Empty or blocked fallback = 404
  if (!fallbackUrl) {
    return c.text('Route not found', 404)
  }

  // Return cached 301 redirect (works for both absolute and relative URLs)
  // Cap fallback cache at 30 minutes to allow new routes to take effect
  const fallbackTtl = Math.min(settings.cache_ttl, 1800)
  const cacheHeaders = buildCacheHeaders(fallbackTtl, fallbackTtl)
  return new Response(null, {
    status: 301,
    headers: {
      Location: fallbackUrl,
      ...cacheHeaders
    }
  })
}
