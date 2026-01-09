/**
 * Query parameter specification
 */
interface QueryParamSpec {
  name: string
  required: boolean
  defaultValue?: string
  isWildcard?: boolean
  outputName?: string
  literalValue?: string
}

/**
 * Parsed route pattern components
 */
interface ParsedPattern {
  pathPattern: string
  querySpecs: QueryParamSpec[]
  hasQueryWildcard: boolean
}

// Memoization cache for parsePattern (avoids re-parsing on every request)
const parsePatternCache = new Map<string, ParsedPattern>()
const MAX_PARSE_CACHE_SIZE = 500

// ReDoS protection: limit backtracking depth for globstar matching
// 500 provides safety margin while allowing reasonable pattern complexity
const MAX_BACKTRACK_DEPTH = 500

/**
 * Parse a route pattern into path and query components.
 * 
 * @param pattern Full route pattern (e.g., "product/{id}?lang={lang}&country={country?}")
 * @returns Parsed pattern with path and query specs
 */
function parsePattern(pattern: string): ParsedPattern {
  // Check memoization cache first (with LRU update)
  const cached = parsePatternCache.get(pattern)
  if (cached) {
    // Move to end for LRU (most recently used)
    parsePatternCache.delete(pattern)
    parsePatternCache.set(pattern, cached)
    return cached
  }

  // Evict least recently used (first entry in Map) if cache is full
  if (parsePatternCache.size >= MAX_PARSE_CACHE_SIZE) {
    const oldestKey = parsePatternCache.keys().next().value
    if (oldestKey) parsePatternCache.delete(oldestKey)
  }

  // Split pattern into path and query parts.
  // Only treat '?' as query separator when it's not inside { } or :param? segments.
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
        // Only treat ? as part of the segment (optional marker) if it's at the end
        // of the segment (followed by / or end of string).
        // Otherwise, it's a query separator (e.g. :id?sort=asc).
        const nextChar = pattern[i + 1]
        if (nextChar === undefined || nextChar === '/') {
          continue
        }
      }
      queryIndex = i
      break
    }
  }
  const pathPattern = queryIndex >= 0 ? pattern.slice(0, queryIndex) : pattern
  const queryString = queryIndex >= 0 ? pattern.slice(queryIndex + 1) : ''

  const querySpecs: QueryParamSpec[] = []
  let hasQueryWildcard = false

  if (queryString) {
    // Check for query wildcard
    if (queryString === '*' || queryString.startsWith('*&') || queryString.endsWith('&*') || queryString.includes('&*&')) {
      hasQueryWildcard = true
    }

    // Parse query parameters
    const pairs = queryString.split('&')
    for (const pair of pairs) {
      if (pair === '*' || pair.trim() === '') {
        continue // Wildcard or empty, already handled
      }

      const equalIndex = pair.indexOf('=')
      if (equalIndex < 0) {
        // No equals sign - treat as simple required param name
        const paramName = pair.trim()
        if (paramName) {
          querySpecs.push({ name: paramName, required: true, outputName: paramName })
        }
        continue
      }

      const paramName = pair.slice(0, equalIndex).trim()
      const valueSpec = pair.slice(equalIndex + 1).trim()

      if (!paramName) continue

      // Check for wildcard value: param=*
      if (valueSpec === '*') {
        querySpecs.push({ name: paramName, required: false, isWildcard: true, outputName: paramName })
        continue
      }

      // Parse value spec: {name}, {name?}, or {name=default}
      if (valueSpec.startsWith('{') && valueSpec.endsWith('}')) {
        const inner = valueSpec.slice(1, -1)
        let outputName = paramName
        let required = true
        let defaultValue: string | undefined

        // Check for default value: {name=default}
        const defaultIndex = inner.indexOf('=')
        if (defaultIndex >= 0) {
          const placeholderName = inner.slice(0, defaultIndex).trim()
          const fallbackName = placeholderName || paramName
          outputName = fallbackName
          defaultValue = inner.slice(defaultIndex + 1)
          required = false
        } else if (inner.endsWith('?')) {
          // Optional: {name?}
          const placeholderName = inner.slice(0, -1).trim()
          outputName = placeholderName || paramName
          required = false
        } else {
          // Required: {name}
          const placeholderName = inner.trim()
          outputName = placeholderName || paramName
        }

        querySpecs.push({ name: paramName, required, defaultValue, outputName })
      } else {
        // Literal value (not a placeholder) - exact match required
        // This is for patterns like ?lang=en
        querySpecs.push({ name: paramName, required: true, outputName: paramName, literalValue: valueSpec })
      }
    }
  }

  const result = { pathPattern, querySpecs, hasQueryWildcard }
  parsePatternCache.set(pattern, result)
  return result
}

/**
 * Match path segments against pattern segments, handling optional parameters.
 * 
 * @param patternParts Pattern segments
 * @param pathParts Actual path segments
 * @returns Matched parameters and whether all segments were consumed, or null if no match
 */
function matchPathSegments(
  patternParts: string[],
  pathParts: string[],
  rawParts: string[]
): { params: Record<string, string>; pathIndex: number } | null {
  let backtrackDepth = 0
  const starIndexMap = new Map<number, number>()
  const globstarIndexMap = new Map<number, number>()

  let starOrdinal = 0
  let globstarOrdinal = 0
  for (let i = 0; i < patternParts.length; i += 1) {
    if (patternParts[i] === '*') {
      starIndexMap.set(i, starOrdinal)
      starOrdinal += 1
    } else if (patternParts[i] === '**') {
      globstarIndexMap.set(i, globstarOrdinal)
      globstarOrdinal += 1
    }
  }

  const visit = (
    patternIndex: number,
    pathIndex: number,
    params: Record<string, string>
  ): { params: Record<string, string>; pathIndex: number } | null => {
    // ReDoS protection: limit backtracking depth
    backtrackDepth++
    if (backtrackDepth > MAX_BACKTRACK_DEPTH) {
      console.warn(`[Matcher] Pattern exceeded backtrack depth (${MAX_BACKTRACK_DEPTH}), match aborted`)
      return null
    }

    if (patternIndex >= patternParts.length) {
      return { params, pathIndex }
    }

    const patternPart = patternParts[patternIndex]

    // Globstar match (zero or more segments)
    if (patternPart === '**') {
      const isLast = patternIndex === patternParts.length - 1
      const globstarOrdinalKey = globstarIndexMap.get(patternIndex) || 0
      const globstarKey = globstarOrdinalKey === 0 ? '**' : `**${globstarOrdinalKey}`

      if (isLast) {
        const remainingPath = rawParts.slice(pathIndex).join('/')
        return { params: { ...params, [globstarKey]: remainingPath }, pathIndex: pathParts.length }
      }

      for (let nextPathIndex = pathIndex; nextPathIndex <= pathParts.length; nextPathIndex += 1) {
        const captured = rawParts.slice(pathIndex, nextPathIndex).join('/')
        const consumed = visit(
          patternIndex + 1,
          nextPathIndex,
          { ...params, [globstarKey]: captured }
        )
        if (consumed) {
          return consumed
        }
      }
      return null
    }

    // Wildcard match (requires exactly one segment)
    if (patternPart === '*') {
      if (pathIndex >= pathParts.length) {
        return null
      }
      const starOrdinalKey = starIndexMap.get(patternIndex) || 0
      const starKey = starOrdinalKey === 0 ? '*' : `*${starOrdinalKey}`
      return visit(
        patternIndex + 1,
        pathIndex + 1,
        { ...params, [starKey]: rawParts[pathIndex] }
      )
    }

    // Reserved keyword check for custom parameters
    // If user defined a param named 'route', it would be overwritten later.
    // We explicitly allow it here but will warn in docs.

    // Parse path parameter (optional or with default)
    const pathParam = parsePathParam(patternPart)
    if (pathParam) {
      if (pathParam.name === 'route') {
        // Warning: 'route' is a reserved placeholder that auto-populates with the route ID.
        // User-defined params named 'route' will be silently overwritten.
      }
      if (pathParam.optional) {
        // Prefer consuming a segment if it leads to a valid match
        if (pathIndex < pathParts.length) {
          const consumed = visit(
            patternIndex + 1,
            pathIndex + 1,
            { ...params, [pathParam.name]: rawParts[pathIndex] }
          )
          if (consumed) {
            return consumed
          }
        }

        const skippedParams = { ...params }
        if (pathParam.defaultValue !== undefined) {
          skippedParams[pathParam.name] = pathParam.defaultValue
        }
        return visit(patternIndex + 1, pathIndex, skippedParams)
      }

      if (pathIndex >= pathParts.length) {
        return null
      }

      return visit(
        patternIndex + 1,
        pathIndex + 1,
        { ...params, [pathParam.name]: rawParts[pathIndex] }
      )
    }

    // Regular path segment - exact match required
    if (pathIndex >= pathParts.length || patternPart !== pathParts[pathIndex]) {
      return null
    }

    return visit(patternIndex + 1, pathIndex + 1, params)
  }

  return visit(0, 0, {})
}

/**
 * Parse a path parameter segment to extract name, optional flag, and default value.
 * 
 * @param segment Pattern segment (e.g., "{id}", "{year?}", "{lang=en}")
 * @returns Object with name, optional flag, and default value
 */
function parsePathParam(segment: string): { name: string; optional: boolean; defaultValue?: string } | null {
  if (!segment.startsWith('{') || !segment.endsWith('}')) {
    if (!segment.startsWith(':')) {
      return null
    }

    const rawName = segment.slice(1)
    if (!rawName) {
      return null
    }

    const optional = rawName.endsWith('?')
    const name = optional ? rawName.slice(0, -1) : rawName
    if (!name) {
      return null
    }

    return { name, optional }
  }

  const inner = segment.slice(1, -1)

  // Check for default value: {name=default}
  const defaultIndex = inner.indexOf('=')
  if (defaultIndex >= 0) {
    const name = inner.slice(0, defaultIndex)
    const defaultValue = inner.slice(defaultIndex + 1)
    return { name, optional: true, defaultValue }
  }

  // Check for optional: {name?}
  if (inner.endsWith('?')) {
    const name = inner.slice(0, -1)
    return { name, optional: true }
  }

  // Required: {name}
  return { name: inner, optional: false }
}

// Memoization cache for pattern parameter names
const patternParamCache = new Map<string, Set<string>>()

/**
 * Extract all parameter names declared in a route pattern.
 * Returns Set of parameter names (both path and query params).
 * Memoized to avoid re-parsing on every request.
 * 
 * @param pattern Route pattern (e.g., "product/{id}?lang={lang}")
 * @returns Set of parameter names used in the pattern
 */
export function getPatternParamNames(pattern: string): Set<string> {
  // Check cache first
  if (patternParamCache.has(pattern)) {
    return patternParamCache.get(pattern)!
  }

  const paramNames = new Set<string>()

  // Always include 'route' (reserved placeholder, exclude from passthrough to prevent spoofing)
  paramNames.add('route')

  // Parse pattern into path and query components
  const parsed = parsePattern(pattern)

  // Extract path param names: {id}, {slug}, {year?}, {lang=en} → id, slug, year, lang
  const normPattern = parsed.pathPattern.replace(/^\/+|\/+$/g, '')
  if (normPattern) {
    const patternParts = normPattern.split('/')
    for (const part of patternParts) {
      const pathParam = parsePathParam(part)
      if (pathParam) {
        paramNames.add(pathParam.name)
      }
    }
  }

  // Extract query param names from pattern
  // For ?lang={lang} → lang (the param name, not placeholder)
  // For ?utm={campaign} → utm (param name), not campaign (placeholder)
  // For ?lang=en → lang (param name, even though it's literal)
  for (const spec of parsed.querySpecs) {
    paramNames.add(spec.name) // Always use the param name, not outputName
  }

  // Cache result
  patternParamCache.set(pattern, paramNames)
  return paramNames
}

/**
 * Match a URL path and query parameters against a route pattern.
 * Supports:
 * - Exact matches: /foo/bar
 * - Named parameters: /shop/{category}/{id}
 * - Optional path segments: /blog/{year?}/{slug}
 * - Default values: /blog/{year=2024}/{slug}
 * - Wildcards: /files/*
 * - Query parameters: product/{id}?lang={lang}
 * - Optional query parameters: product/{id}?lang={lang?}
 * - Query wildcards: product/{id}?*
 * - Default query values: product/{id}?lang={lang=en}
 *
 * @param pattern The route pattern (e.g., "shop/{id}?lang={lang}")
 * @param path The actual request path (e.g., "shop/123")
 * @param queryParams The request query parameters
 * @returns extracted parameters (e.g., { id: "123", lang: "en" }) or null if no match
 */
export function matchRoute(
  pattern: string,
  path: string,
  queryParams?: URLSearchParams
): Record<string, string> | null {
  // Parse pattern into path and query components
  const parsed = parsePattern(pattern)

  // Normalize: remove leading/trailing slashes for consistent splitting
  const normPattern = parsed.pathPattern.replace(/^\/+|\/+$/g, '')
  const normPath = path.replace(/^\/+|\/+$/g, '')
  const matchPath = normPath.toLowerCase()
  const rawPath = normPath

  // Handle root path special case
  if (normPattern === '' && normPath === '') {
    // Still need to check query params
    const params: Record<string, string> = {}
    if (!matchQueryParams(parsed, queryParams, params)) {
      return null
    }
    return params
  }

  const patternParts = normPattern ? normPattern.split('/') : []
  const pathParts = matchPath ? matchPath.split('/') : []
  const rawParts = rawPath ? rawPath.split('/') : []

  // Match path segments with support for optional parameters
  const matchResult = matchPathSegments(patternParts, pathParts, rawParts)
  if (!matchResult) {
    return null
  }

  const params = matchResult.params

  // Ensure all path segments were consumed
  // Note: matchPathSegments already handles inner consumption, but we verify 
  // that the entire requested path was matched against the pattern.
  if (matchResult.pathIndex < pathParts.length) {
    return null
  }

  // Match query parameters
  if (!matchQueryParams(parsed, queryParams, params)) {
    return null
  }

  return params
}

/**
 * Match query parameters against query specifications.
 * 
 * @param parsed Parsed pattern with query specs
 * @param queryParams Request query parameters
 * @param params Output parameter object to populate
 * @returns true if query params match, false otherwise
 */
function matchQueryParams(
  parsed: ParsedPattern,
  queryParams: URLSearchParams | undefined,
  params: Record<string, string>
): boolean {
  // If no query specs, any query params are fine (backward compatible)
  if (parsed.querySpecs.length === 0 && !parsed.hasQueryWildcard) {
    return true
  }

  // If query wildcard is present, all query params are optional
  if (parsed.hasQueryWildcard) {
    // Copy all query params to params
    if (queryParams) {
      for (const [key, value] of queryParams.entries()) {
        params[key] = value
      }
    }
    // Still need to check required specs
  }

  // Check each query spec
  for (const spec of parsed.querySpecs) {
    const outputName = spec.outputName || spec.name

    if (spec.isWildcard) {
      // Wildcard param - matches any value, optional
      if (queryParams && queryParams.has(spec.name)) {
        params[outputName] = queryParams.get(spec.name) || ''
      }
      continue
    }

    const value = queryParams?.get(spec.name)

    if (spec.literalValue !== undefined) {
      if (value === null || value === undefined) {
        return false
      }
      if (value !== spec.literalValue) {
        return false
      }
      params[outputName] = value
      continue
    }

    if (value !== null && value !== undefined) {
      // Param exists - use it
      params[outputName] = value
    } else if (spec.required) {
      // Required param missing - no match
      return false
    } else if (spec.defaultValue !== undefined) {
      // Optional param with default - use default
      params[outputName] = spec.defaultValue
    }
    // Optional param without default - skip it
  }

  // If query wildcard, copy any remaining query params
  if (parsed.hasQueryWildcard && queryParams) {
    const specNames = new Set(parsed.querySpecs.map(s => s.name))
    for (const [key, value] of queryParams.entries()) {
      if (!specNames.has(key)) {
        params[key] = value
      }
    }
  }

  return true
}
