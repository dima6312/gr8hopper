/**
 * Shared sanitization utilities
 */

/**
 * Sanitize route ID.
 * Allows alphanumeric, hyphens, slashes, curly braces, asterisks, dots, colons, question marks, ampersands, and equals signs.
 * Converts to lowercase for consistent lookups.
 *
 * Allowed characters: a-z 0-9 - / { } * . : ? & =
 *
 * @example
 * sanitizeRouteId('My Route!') // returns 'myroute'
 * sanitizeRouteId('shop/{id}') // returns 'shop/{id}'
 * sanitizeRouteId('files/*')   // returns 'files/*'
 * sanitizeRouteId('image.png') // returns 'image.png'
 * sanitizeRouteId('product/{id}?lang={lang}') // returns 'product/{id}?lang={lang}'
 */
export function sanitizeRouteId(id: string): string {
  // Allow letters, numbers, hyphens, slashes, braces, asterisks, dots, colons, question marks, ampersands, and equals signs
  return id.replace(/[^a-zA-Z0-9/{}.?&=:*-]/g, '').toLowerCase()
}
