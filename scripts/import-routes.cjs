#!/usr/bin/env node
/**
 * Import routes.json to Cloudflare KV
 * Usage: npm run import:routes [path/to/routes.json] [--local]
 *
 * NOTE: Validation logic (sanitizeRouteId, validateRouteIdPattern, isValidUrlScheme,
 * validateRouteConfig, validateSettings, DANGEROUS_SCHEMES) is intentionally duplicated here from
 * src/utils/validation.ts and src/utils/sanitize.ts. This script is CommonJS
 * for standalone execution without a build step, while the main codebase uses
 * ES modules. Keeping validation logic inline ensures the script works
 * independently without requiring module bundling.
 *
 * SYNC NOTE: When updating validation logic, ensure both this file and the source
 * files (src/utils/validation.ts, src/utils/sanitize.ts) stay in sync.
 */

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const TOML = require('@iarna/toml')

// Parse arguments
const args = process.argv.slice(2)
const isLocal = args.includes('--local')
const filePath = args.find(a => !a.startsWith('--')) || 'routes.json'

// Colors for output
const green = (s) => `\x1b[32m${s}\x1b[0m`
const red = (s) => `\x1b[31m${s}\x1b[0m`
const yellow = (s) => `\x1b[33m${s}\x1b[0m`
const cyan = (s) => `\x1b[36m${s}\x1b[0m`

// Validation constants (matching admin.ts)
const DANGEROUS_SCHEMES = [
  'javascript:', 'data:', 'vbscript:', 'file:',
  'about:', 'blob:', 'filesystem:'
]
const MAX_URL_LENGTH = 2048

/**
 * Sanitize route ID (matching src/utils/sanitize.ts).
 */
function sanitizeRouteId(id) {
  // Allow letters, numbers, hyphens, slashes, braces, asterisks, dots, colons, question marks, ampersands, and equals signs
  return id.replace(/[^a-zA-Z0-9/{}.?&=:*-]/g, '').toLowerCase()
}

/**
 * Validate route ID pattern syntax.
 */
function validateRouteIdPattern(id) {
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

function splitRoutePattern(pattern) {
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

function hasInvalidParamChars(name) {
  return /[?={}\s]/.test(name)
}

function validatePathSegment(segment) {
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

function validateQueryString(queryString) {
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
 * Determine whether a route ID is a pattern (matching storage adapters).
 * 
 * NOTE: This is intentionally duplicated from src/utils/pattern.ts because
 * this CommonJS script cannot import ES modules. Keep in sync with the
 * canonical implementation in src/utils/pattern.ts.
 */
function isPattern(id) {
  return id.includes('{') || id.includes('*') || id.includes('?') || id.includes(':')
}

/**
 * Sanitize URL by removing control characters (prevents CRLF injection)
 */
function sanitizeUrl(url) {
  return url.replace(/[\x00-\x1F\x7F]/g, '').trim()
}

/**
 * Validate URL scheme is safe (matching admin.ts logic)
 */
function isValidUrlScheme(url) {
  const sanitized = url.replace(/[\x00-\x1F\x7F]/g, '')

  if (sanitized.length > MAX_URL_LENGTH) {
    return { valid: false, reason: `URL exceeds maximum length of ${MAX_URL_LENGTH}` }
  }

  const lowercaseUrl = sanitized.toLowerCase().trim()

  for (const scheme of DANGEROUS_SCHEMES) {
    if (lowercaseUrl.startsWith(scheme)) {
      return { valid: false, reason: `Dangerous URL scheme: ${scheme}` }
    }
  }

  if (lowercaseUrl.startsWith('//')) {
    return { valid: false, reason: 'Protocol-relative URLs not allowed' }
  }

  return { valid: true }
}

/**
 * Validate route configuration (matching admin.ts logic)
 */
function validateRouteConfig(config) {
  if (!config || typeof config !== 'object') {
    return { valid: false, reason: 'Config must be an object' }
  }

  if (typeof config.template !== 'string' || !config.template.trim()) {
    return { valid: false, reason: 'Template must be a non-empty string' }
  }

  if (typeof config.active !== 'boolean') {
    return { valid: false, reason: 'Active must be a boolean' }
  }

  // Validate passthrough (optional boolean, default false)
  if (config.passthrough !== undefined && typeof config.passthrough !== 'boolean') {
    return { valid: false, reason: 'Passthrough must be a boolean if provided' }
  }

  // Sanitize template to remove control characters (prevents CRLF injection)
  const template = sanitizeUrl(config.template)
  if (!template) {
    return { valid: false, reason: 'Template must be a non-empty string' }
  }

  const schemeCheck = isValidUrlScheme(template)
  if (!schemeCheck.valid) {
    return schemeCheck
  }

  return { valid: true, sanitizedTemplate: template }
}

/**
 * Validate settings (matching admin.ts logic)
 */
function validateSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    return { valid: false, reason: 'Settings must be an object' }
  }

  if (typeof settings.fallback_url !== 'string') {
    return { valid: false, reason: 'fallback_url must be a string' }
  }

  // Sanitize fallback_url to remove control characters (prevents CRLF injection)
  const fallbackUrl = sanitizeUrl(settings.fallback_url)
  if (fallbackUrl) {
    const schemeCheck = isValidUrlScheme(fallbackUrl)
    if (!schemeCheck.valid) {
      return { valid: false, reason: `fallback_url: ${schemeCheck.reason}` }
    }
  }

  // Use Number.isFinite to reject NaN, Infinity, -Infinity
  if (typeof settings.cache_ttl !== 'number' || !Number.isFinite(settings.cache_ttl) || settings.cache_ttl < 0) {
    return { valid: false, reason: 'cache_ttl must be a finite non-negative number' }
  }

  if (typeof settings.route_param !== 'string' || !settings.route_param.trim()) {
    return { valid: false, reason: 'route_param must be a non-empty string' }
  }

  // Sanitize route_param to alphanumeric only
  const routeParam = settings.route_param.trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  if (!routeParam) {
    return { valid: false, reason: 'route_param must contain at least one alphanumeric character' }
  }

  return {
    valid: true,
    sanitized: {
      fallback_url: fallbackUrl,
      cache_ttl: settings.cache_ttl,
      route_param: routeParam
    }
  }
}

console.log(cyan('\n📦 Gr8hopper Route Importer\n'))

// Check if file exists
const fullPath = path.resolve(filePath)
if (!fs.existsSync(fullPath)) {
  console.error(red(`Error: File not found: ${fullPath}`))
  console.log(`\nUsage: npm run import:routes [path/to/routes.json] [--local]`)
  console.log(`  --local  Import to local dev KV instead of production`)
  process.exit(1)
}

// Read and parse routes.json
let data
try {
  const content = fs.readFileSync(fullPath, 'utf-8')
  data = JSON.parse(content)
} catch (err) {
  console.error(red(`Error: Failed to parse JSON: ${err.message}`))
  process.exit(1)
}

if (!data.routes || typeof data.routes !== 'object') {
  console.error(red('Error: Invalid format - missing "routes" object'))
  process.exit(1)
}

const routes = data.routes
const settings = data.settings
const routeIds = Object.keys(routes)

if (routeIds.length === 0) {
  console.error(red('Error: No routes found in file'))
  process.exit(1)
}

console.log(`📄 File: ${cyan(fullPath)}`)
console.log(`📊 Routes: ${green(routeIds.length)}`)
console.log(`⚙️  Settings: ${settings ? green('Yes') : yellow('No')}`)
console.log(`🎯 Target: ${isLocal ? yellow('Local KV') : green('Production KV')}\n`)

// Validate all routes before proceeding
console.log('🔍 Validating routes...')
const validationErrors = []
const sanitizedRoutes = []
const seenIds = new Map() // sanitizedId -> originalId

for (const id of routeIds) {
  const sanitizedId = sanitizeRouteId(id)

  if (!sanitizedId) {
    validationErrors.push(`  - "${id}": Invalid route ID (must contain at least one allowed character)`)
    continue
  }

  const idValidation = validateRouteIdPattern(sanitizedId)
  if (!idValidation.valid) {
    validationErrors.push(`  - "${id}": ${idValidation.reason}`)
    continue
  }

  // Check for ID collisions after sanitization
  const existingOriginal = seenIds.get(sanitizedId)
  if (existingOriginal) {
    validationErrors.push(`  - "${id}": Collision with "${existingOriginal}" (both become "${sanitizedId}")`)
    continue
  }
  seenIds.set(sanitizedId, id)

  if (sanitizedId !== id) {
    console.log(yellow(`  ⚠ Route ID "${id}" sanitized to "${sanitizedId}"`))
  }

  const validation = validateRouteConfig(routes[id])
  if (!validation.valid) {
    validationErrors.push(`  - "${id}": ${validation.reason}`)
    continue
  }

  const config = {
    template: validation.sanitizedTemplate,
    active: routes[id].active
  }
  // Only add passthrough to config if explicitly set to true
  // (keeps export consistent with validateRouteConfig which defaults to false)
  if (routes[id].passthrough === true) {
    config.passthrough = true
  }

  sanitizedRoutes.push({
    id: sanitizedId,
    config
  })
}

if (validationErrors.length > 0) {
  console.error(red('\n❌ Validation failed:'))
  validationErrors.forEach(err => console.error(red(err)))
  process.exit(1)
}

console.log(green(`✓ All ${sanitizedRoutes.length} routes validated\n`))

// Get KV namespace ID from wrangler.toml using proper TOML parsing
let namespaceId
let configUsed
try {
  // Try production config first, then regular
  const configFiles = ['wrangler.production.toml', 'wrangler.toml']
  let config = null

  for (const configFile of configFiles) {
    const configPath = path.join(process.cwd(), configFile)
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf-8')
      try {
        config = TOML.parse(configContent)
        configUsed = configFile
        break
      } catch (parseErr) {
        console.error(yellow(`Warning: Failed to parse ${configFile}: ${parseErr.message}`))
        // Continue to next config file
      }
    }
  }

  if (!config) {
    throw new Error('No valid wrangler config found')
  }

  // Extract KV namespace ID from parsed config
  const kvNamespaces = config.kv_namespaces
  if (!kvNamespaces || !Array.isArray(kvNamespaces) || kvNamespaces.length === 0) {
    throw new Error('No kv_namespaces configured in wrangler config')
  }

  namespaceId = kvNamespaces[0].id
  if (!namespaceId || namespaceId === 'your-kv-namespace-id') {
    throw new Error('KV namespace ID not configured in wrangler config')
  }

  // Validate namespace ID format (should be 32 hex characters)
  if (!/^[a-f0-9]{32}$/i.test(namespaceId)) {
    console.error(red(`Error: Invalid namespace ID format.`))
    console.log(`\nExpected: 32 hexadecimal characters (e.g., a1b2c3d4e5f6789012345678abcdef90)`)
    console.log(`Got: ${namespaceId}`)
    if (namespaceId.includes('-') || namespaceId === 'your-production-kv-namespace-id' || namespaceId === 'your-kv-namespace-id') {
      console.log(`\n${yellow('This looks like a placeholder!')} Update your ${configUsed} with your actual KV namespace ID.`)
      console.log(`Run: ${cyan('npx wrangler kv namespace create ROUTES_KV')}`)
    }
    process.exit(1)
  }
} catch (err) {
  console.error(red(`Error: ${err.message}`))
  console.log(`\nMake sure your wrangler.toml or wrangler.production.toml has a valid KV namespace ID`)
  process.exit(1)
}

console.log(`📋 Config: ${cyan(configUsed)}`)
console.log(`🔑 Namespace: ${cyan(namespaceId.substring(0, 8))}...\n`)

// Build KV bulk format using validated/sanitized routes
const bulk = []

// Add routes with route: prefix
for (const { id, config } of sanitizedRoutes) {
  bulk.push({
    key: `route:${id}`,
    value: JSON.stringify(config)
  })
}

// Add routes index (using sanitized IDs)
const sanitizedIds = sanitizedRoutes.map(r => r.id)
bulk.push({
  key: 'routes:index',
  value: JSON.stringify(sanitizedIds)
})

// Add routes patterns index (full StoredRoute[] format for kv.ts compatibility)
const patternRoutes = sanitizedRoutes
  .filter(r => isPattern(r.id))
  .map(r => ({ ...r.config, id: r.id }))
bulk.push({
  key: 'routes:patterns',
  value: JSON.stringify(patternRoutes)
})

// Validate and add settings if provided
if (settings) {
  const settingsValidation = validateSettings(settings)
  if (!settingsValidation.valid) {
    console.error(red(`\n❌ Invalid settings: ${settingsValidation.reason}`))
    process.exit(1)
  }
  console.log(green(`✓ Settings validated\n`))
  bulk.push({
    key: 'settings:global',
    value: JSON.stringify(settingsValidation.sanitized)
  })
}

// Write temp bulk file
const tempFile = path.join(process.cwd(), '.kv-bulk-import.json')
fs.writeFileSync(tempFile, JSON.stringify(bulk, null, 2))

// Build wrangler arguments
const wranglerArgs = [
  'wrangler',
  'kv',
  'bulk',
  'put',
  tempFile,
  `--namespace-id=${namespaceId}`
]

if (isLocal) {
  wranglerArgs.push('--local')
} else {
  wranglerArgs.push('--remote')
}

console.log(`⏳ Importing ${bulk.length} entries...\n`)

try {
  execFileSync('npx', wranglerArgs, { stdio: 'inherit' })
  console.log(green(`\n✅ Successfully imported ${sanitizedRoutes.length} routes!`))
} catch (err) {
  console.error(red('\n❌ Import failed'))
  console.error(red(`   ${err.message || 'Unknown error'}`))
  process.exit(1)
} finally {
  // Cleanup temp file
  if (fs.existsSync(tempFile)) {
    fs.unlinkSync(tempFile)
  }
}
