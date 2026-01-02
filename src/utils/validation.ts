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
 * Sanitize URL by removing control characters that could enable HTTP header injection.
 * Must be applied before storing URLs to prevent CRLF injection attacks.
 */
export function sanitizeUrl(url: string): string {
  return url.replace(/[\x00-\x1F\x7F]/g, '').trim()
}

/**
 * Validate URL scheme is safe (http or https only).
 * Blocks dangerous schemes and control character injection.
 * Returns detailed validation result for error reporting.
 */
export function isValidUrlScheme(url: string): ValidationResult {
  // Remove control characters (null bytes, newlines, etc.) to prevent injection
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

  return {
    template,
    active: c.active
  }
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

  return {
    config: {
      template,
      active: c.active
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
