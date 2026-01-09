/**
 * Checks if a route ID is a pattern route.
 * Pattern routes contain `{`, `*`, `**`, `?`, or `:` characters.
 */
export function isPattern(id: string): boolean {
  return id.includes('{') || id.includes('*') || id.includes('?') || id.includes(':')
}
