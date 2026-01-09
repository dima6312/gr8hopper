/**
 * Shared validation utilities for URL and route configuration
 */

import type { RouteConfig, GlobalSettings } from '../types.js'

/**
 * Allowed URL schemes for template URLs
 */
export const ALLOWED_URL_SCHEMES = ['http:', 'https:']

/**
 * Dangerous URL schemes that should be blocked
 */
export const DANGEROUS_SCHEMES = [
  'javascript:', 'data:', 'vbscript:', 'file:',
  'about:', 'blob:', 'filesystem:'
]

/**
 * Maximum allowed URL length to prevent abuse
 */
export const MAX_URL_LENGTH = 2048

/**
 * Validation result type
 */
export type ValidationResult =
  | { valid: true }
  | { valid: false; reason: string }

/**
 * Validate route ID pattern syntax.
 * Ensures placeholders have non-empty names, braces are balanced,
 * and query specs are well-formed.
 * 
 * NOTE: Does not check for pattern collisions. Multiple patterns may match
 * the same path; the redirect handler uses scoring to determine precedence.
 * More specific patterns (more literal segments, longer length) win.
 * See getPatternScore in redirect.ts for precedence rules.
 */
export function validateRouteIdPattern(id: string): ValidationResult {
  if (!id) {
    return { valid: false, reason: 'Route ID is required' }
  }

  let braceDepth = 0
  for (let i = 0; i < id.length; i += 1) {
    const char = id[i]
    if (char === '{') {
      if (braceDepth > 0) {
        return { valid: false, reason: 'Nested "{" in route ID' }
      }
      braceDepth += 1
      continue
    }
    if (char === '}') {
      if (braceDepth === 0) {
        return { valid: false, reason: 'Unmatched "}" in route ID' }
      }
      braceDepth -= 1
    }
  }

  if (braceDepth !== 0) {
    return { valid: false, reason: 'Unmatched "{" in route ID' }
  }

  const { pathPattern, queryString } = splitRoutePattern(id)

  const normPath = pathPattern.replace(/^\/+|\/+$/g, '')
  if (normPath) {
    const segments = normPath.split('/')
    for (const segment of segments) {
      const result = validatePathSegment(segment)
      if (!result.valid) {
        return result
      }
    }
  }

  if (queryString) {
    const result = validateQueryString(queryString)
    if (!result.valid) {
      return result
    }
  }

  return { valid: true }
}

/**
 * Sanitize URL by removing control characters that could enable HTTP header injection.
 * Must be applied before storing URLs to prevent CRLF injection attacks.
 */
export function sanitizeUrl(url: string): string {
  // eslint-disable-next-line no-control-regex -- intentionally detecting control chars for security
  return url.replace(/[\x00-\x1F\x7F]/g, '').trim()
}

/**
 * Validate URL scheme is safe (http or https only).
 * Blocks dangerous schemes and control character injection.
 * Returns detailed validation result for error reporting.
 */
export function isValidUrlScheme(url: string): ValidationResult {
  // Remove control characters (null bytes, newlines, etc.) to prevent injection
  // eslint-disable-next-line no-control-regex -- intentionally detecting control chars for security
  const sanitized = url.replace(/[\x00-\x1F\x7F]/g, '')

  // Enforce maximum URL length
  if (sanitized.length > MAX_URL_LENGTH) {
    return { valid: false, reason: `URL exceeds maximum length of ${MAX_URL_LENGTH}` }
  }

  const lowercaseUrl = sanitized.toLowerCase().trim()

  // Block all dangerous schemes
  for (const scheme of DANGEROUS_SCHEMES) {
    if (lowercaseUrl.startsWith(scheme)) {
      return { valid: false, reason: `Dangerous URL scheme: ${scheme}` }
    }
  }

  // Block protocol-relative URLs for defense in depth
  if (lowercaseUrl.startsWith('//')) {
    return { valid: false, reason: 'Protocol-relative URLs not allowed' }
  }

  // Try parsing as URL to validate scheme if it has one
  try {
    const parsed = new URL(sanitized)
    if (!ALLOWED_URL_SCHEMES.includes(parsed.protocol)) {
      return { valid: false, reason: `URL scheme '${parsed.protocol}' not allowed` }
    }
  } catch {
    // Not a valid URL (likely a template with placeholders) - allowed
  }

  return { valid: true }
}

function splitRoutePattern(pattern: string): { pathPattern: string; queryString: string } {
  let queryIndex = -1
  let braceDepth = 0
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i]
    if (char === '{') {
      braceDepth += 1
      continue
    }
    if (char === '}' && braceDepth > 0) {
      braceDepth -= 1
      continue
    }
    if (char === '?' && braceDepth === 0) {
      const segmentStart = pattern.lastIndexOf('/', i - 1) + 1
      const segment = pattern.slice(segmentStart, i)
      if (segment.startsWith(':')) {
        const nextChar = pattern[i + 1]
        if (nextChar === undefined || nextChar === '/') {
          continue
        }
      }
      queryIndex = i
      break
    }
  }

  return {
    pathPattern: queryIndex >= 0 ? pattern.slice(0, queryIndex) : pattern,
    queryString: queryIndex >= 0 ? pattern.slice(queryIndex + 1) : ''
  }
}

function hasInvalidParamChars(name: string): boolean {
  return /[?={}\s]/.test(name)
}

function validatePathSegment(segment: string): ValidationResult {
  if (!segment) {
    return { valid: true }
  }

  if (segment === '*' || segment === '**') {
    return { valid: true }
  }

  if (segment.startsWith('{') || segment.endsWith('}')) {
    if (!segment.startsWith('{') || !segment.endsWith('}')) {
      return { valid: false, reason: 'Malformed path placeholder' }
    }

    const inner = segment.slice(1, -1)
    if (!inner) {
      return { valid: false, reason: 'Empty path parameter name' }
    }
    if (inner.includes('{') || inner.includes('}')) {
      return { valid: false, reason: 'Malformed path placeholder' }
    }

    let name = inner
    const defaultIndex = inner.indexOf('=')
    if (defaultIndex >= 0) {
      name = inner.slice(0, defaultIndex)
    } else if (inner.endsWith('?')) {
      name = inner.slice(0, -1)
    }

    if (!name) {
      return { valid: false, reason: 'Empty path parameter name' }
    }
    if (hasInvalidParamChars(name)) {
      return { valid: false, reason: 'Invalid path parameter name' }
    }

    return { valid: true }
  }

  if (segment.startsWith(':')) {
    const rawName = segment.slice(1)
    if (!rawName) {
      return { valid: false, reason: 'Empty path parameter name' }
    }

    const optional = rawName.endsWith('?')
    const name = optional ? rawName.slice(0, -1) : rawName
    if (!name) {
      return { valid: false, reason: 'Empty path parameter name' }
    }
    if (hasInvalidParamChars(name)) {
      return { valid: false, reason: 'Invalid path parameter name' }
    }
    if (!optional && rawName.includes('?')) {
      return { valid: false, reason: 'Invalid path parameter name' }
    }

    return { valid: true }
  }

  if (segment.includes('{') || segment.includes('}')) {
    return { valid: false, reason: 'Malformed path placeholder' }
  }

  return { valid: true }
}

function validateQueryString(queryString: string): ValidationResult {
  const pairs = queryString.split('&')
  for (const rawPair of pairs) {
    const pair = rawPair.trim()
    if (!pair) {
      return { valid: false, reason: 'Empty query parameter in route ID' }
    }
    if (pair === '*') {
      continue
    }

    const equalIndex = pair.indexOf('=')
    if (equalIndex < 0) {
      if (pair.includes('{') || pair.includes('}')) {
        return { valid: false, reason: 'Malformed query parameter name' }
      }
      continue
    }

    const paramName = pair.slice(0, equalIndex).trim()
    const valueSpec = pair.slice(equalIndex + 1).trim()
    if (!paramName) {
      return { valid: false, reason: 'Empty query parameter name' }
    }
    if (paramName.includes('{') || paramName.includes('}')) {
      return { valid: false, reason: 'Malformed query parameter name' }
    }

    if (!valueSpec) {
      continue
    }
    if (valueSpec === '*') {
      continue
    }

    if (valueSpec.startsWith('{') || valueSpec.endsWith('}')) {
      if (!valueSpec.startsWith('{') || !valueSpec.endsWith('}')) {
        return { valid: false, reason: 'Malformed query parameter placeholder' }
      }
      const inner = valueSpec.slice(1, -1)
      if (!inner) {
        return { valid: false, reason: 'Empty query parameter name' }
      }
      if (inner.includes('{') || inner.includes('}')) {
        return { valid: false, reason: 'Malformed query parameter placeholder' }
      }

      let name = inner
      const defaultIndex = inner.indexOf('=')
      if (defaultIndex >= 0) {
        name = inner.slice(0, defaultIndex)
      } else if (inner.endsWith('?')) {
        name = inner.slice(0, -1)
      }

      if (!name) {
        return { valid: false, reason: 'Empty query parameter name' }
      }
      if (hasInvalidParamChars(name)) {
        return { valid: false, reason: 'Invalid query parameter name' }
      }
      continue
    }

    if (valueSpec.includes('{') || valueSpec.includes('}')) {
      return { valid: false, reason: 'Malformed query parameter placeholder' }
    }
  }

  return { valid: true }
}

/**
 * Validate route configuration.
 * Returns validated RouteConfig on success, null on failure.
 */
export function validateRouteConfig(config: unknown): RouteConfig | null {
  if (!config || typeof config !== 'object') return null

  const c = config as Record<string, unknown>

  if (typeof c.template !== 'string' || !c.template.trim()) return null
  if (typeof c.active !== 'boolean') return null

  // Sanitize template to remove control characters (prevents CRLF injection)
  const template = sanitizeUrl(c.template)
  if (!template) return null

  // Validate URL scheme for template
  const schemeCheck = isValidUrlScheme(template)
  if (!schemeCheck.valid) {
    return null
  }

  if ('passthrough' in c && typeof c.passthrough !== 'boolean') {
    return null
  }

  // Validate passthrough (optional boolean, default false)
  const passthrough = typeof c.passthrough === 'boolean' ? c.passthrough : false

  return {
    template,
    active: c.active,
    passthrough
  }
}

/**
 * Validate a partial route update payload.
 * Returns sanitized partial RouteConfig on success, null on failure.
 */
export function validateRoutePatch(config: unknown): Partial<RouteConfig> | null {
  if (!config || typeof config !== 'object') return null

  const c = config as Record<string, unknown>
  const patch: Partial<RouteConfig> = {}

  if ('template' in c) {
    if (typeof c.template !== 'string' || !c.template.trim()) return null
    const template = sanitizeUrl(c.template)
    if (!template) return null
    const schemeCheck = isValidUrlScheme(template)
    if (!schemeCheck.valid) return null
    patch.template = template
  }

  if ('active' in c) {
    if (typeof c.active !== 'boolean') return null
    patch.active = c.active
  }

  if ('passthrough' in c) {
    if (typeof c.passthrough !== 'boolean') return null
    patch.passthrough = c.passthrough
  }

  if (Object.keys(patch).length === 0) return null
  return patch
}

/**
 * Validate route configuration with detailed error.
 * Returns error reason string if invalid, null if valid.
 */
export function validateRouteConfigWithReason(config: unknown): { config: RouteConfig | null; reason: string | null } {
  if (!config || typeof config !== 'object') {
    return { config: null, reason: 'Config must be an object' }
  }

  const c = config as Record<string, unknown>

  if (typeof c.template !== 'string' || !c.template.trim()) {
    return { config: null, reason: 'Template must be a non-empty string' }
  }

  if (typeof c.active !== 'boolean') {
    return { config: null, reason: 'Active must be a boolean' }
  }

  // Sanitize template to remove control characters (prevents CRLF injection)
  const template = sanitizeUrl(c.template)
  if (!template) {
    return { config: null, reason: 'Template must be a non-empty string' }
  }

  const schemeCheck = isValidUrlScheme(template)
  if (!schemeCheck.valid) {
    return { config: null, reason: schemeCheck.reason }
  }

  if ('passthrough' in c && typeof c.passthrough !== 'boolean') {
    return { config: null, reason: 'Passthrough must be a boolean if provided' }
  }

  // Validate passthrough (optional boolean, default false)
  const passthrough = typeof c.passthrough === 'boolean' ? c.passthrough : false

  return {
    config: {
      template,
      active: c.active,
      passthrough
    },
    reason: null
  }
}

/**
 * Validate global settings.
 * Returns validated GlobalSettings on success, null on failure.
 */
export function validateSettings(settings: unknown): GlobalSettings | null {
  if (!settings || typeof settings !== 'object') return null

  const s = settings as Record<string, unknown>

  if (typeof s.fallback_url !== 'string') return null
  // Use Number.isFinite to reject NaN, Infinity, -Infinity
  if (typeof s.cache_ttl !== 'number' || !Number.isFinite(s.cache_ttl) || s.cache_ttl < 0) return null
  if (typeof s.route_param !== 'string' || !s.route_param.trim()) return null

  // Sanitize fallback_url to remove control characters (prevents CRLF injection)
  const fallbackUrl = sanitizeUrl(s.fallback_url)
  // Allow empty fallback_url (results in 404 instead of redirect)
  // but validate scheme if a URL is provided
  if (fallbackUrl) {
    const schemeCheck = isValidUrlScheme(fallbackUrl)
    if (!schemeCheck.valid) {
      return null
    }
  }

  // Sanitize route_param to alphanumeric only
  const routeParam = s.route_param.trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  if (!routeParam) return null

  return {
    fallback_url: fallbackUrl,
    cache_ttl: s.cache_ttl,
    route_param: routeParam
  }
}

/**
 * Validate global settings with detailed error.
 * Returns error reason string if invalid, null if valid.
 */
export function validateSettingsWithReason(settings: unknown): { settings: GlobalSettings | null; reason: string | null } {
  if (!settings || typeof settings !== 'object') {
    return { settings: null, reason: 'Settings must be an object' }
  }

  const s = settings as Record<string, unknown>

  if (typeof s.fallback_url !== 'string') {
    return { settings: null, reason: 'fallback_url must be a string' }
  }

  // Use Number.isFinite to reject NaN, Infinity, -Infinity
  if (typeof s.cache_ttl !== 'number' || !Number.isFinite(s.cache_ttl) || s.cache_ttl < 0) {
    return { settings: null, reason: 'cache_ttl must be a finite non-negative number' }
  }

  if (typeof s.route_param !== 'string' || !s.route_param.trim()) {
    return { settings: null, reason: 'route_param must be a non-empty string' }
  }

  // Sanitize fallback_url to remove control characters (prevents CRLF injection)
  const fallbackUrl = sanitizeUrl(s.fallback_url)
  if (fallbackUrl) {
    const schemeCheck = isValidUrlScheme(fallbackUrl)
    if (!schemeCheck.valid) {
      return { settings: null, reason: `fallback_url: ${schemeCheck.reason}` }
    }
  }

  // Sanitize route_param to alphanumeric only
  const routeParam = s.route_param.trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  if (!routeParam) {
    return { settings: null, reason: 'route_param must contain at least one alphanumeric character' }
  }

  return {
    settings: {
      fallback_url: fallbackUrl,
      cache_ttl: s.cache_ttl,
      route_param: routeParam
    },
    reason: null
  }
}
