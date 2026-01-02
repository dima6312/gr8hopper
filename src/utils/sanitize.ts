/**
 * Shared sanitization utilities
 */

/**
 * Sanitize route ID to alphanumeric + hyphens only.
 * Converts to lowercase for consistent lookups.
 *
 * @example
 * sanitizeRouteId('My Route!') // returns 'myroute'
 * sanitizeRouteId('partner-a') // returns 'partner-a'
 */
export function sanitizeRouteId(id: string): string {
  return id.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()
}
