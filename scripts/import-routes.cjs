#!/usr/bin/env node
/**
 * Import routes.json to Cloudflare KV
 * Usage: npm run import:routes [path/to/routes.json] [--local]
 */

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

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
 * Sanitize route ID to alphanumeric + hyphens only (matching sanitize.ts)
 */
function sanitizeRouteId(id) {
  return id.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()
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

  const schemeCheck = isValidUrlScheme(config.template)
  if (!schemeCheck.valid) {
    return schemeCheck
  }

  return { valid: true }
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

  // Trim and validate fallback_url for dangerous schemes
  const fallbackUrl = settings.fallback_url.trim()
  if (fallbackUrl) {
    const schemeCheck = isValidUrlScheme(fallbackUrl)
    if (!schemeCheck.valid) {
      return { valid: false, reason: `fallback_url: ${schemeCheck.reason}` }
    }
  }

  if (typeof settings.cache_ttl !== 'number' || settings.cache_ttl < 0) {
    return { valid: false, reason: 'cache_ttl must be a non-negative number' }
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

for (const id of routeIds) {
  const sanitizedId = sanitizeRouteId(id)

  if (!sanitizedId) {
    validationErrors.push(`  - "${id}": Invalid route ID (must contain letters, numbers, or hyphens)`)
    continue
  }

  if (sanitizedId !== id) {
    console.log(yellow(`  ⚠ Route ID "${id}" sanitized to "${sanitizedId}"`))
  }

  const validation = validateRouteConfig(routes[id])
  if (!validation.valid) {
    validationErrors.push(`  - "${id}": ${validation.reason}`)
    continue
  }

  sanitizedRoutes.push({
    id: sanitizedId,
    config: {
      template: routes[id].template.trim(),
      active: routes[id].active
    }
  })
}

if (validationErrors.length > 0) {
  console.error(red('\n❌ Validation failed:'))
  validationErrors.forEach(err => console.error(red(err)))
  process.exit(1)
}

console.log(green(`✓ All ${sanitizedRoutes.length} routes validated\n`))

// Get KV namespace ID from wrangler.toml
let namespaceId
let configUsed
try {
  // Try production config first, then regular
  const configFiles = ['wrangler.production.toml', 'wrangler.toml']
  let configContent = null

  for (const configFile of configFiles) {
    const configPath = path.join(process.cwd(), configFile)
    if (fs.existsSync(configPath)) {
      configContent = fs.readFileSync(configPath, 'utf-8')
      configUsed = configFile
      break
    }
  }

  if (!configContent) {
    throw new Error('No wrangler config found')
  }

  // Extract KV namespace ID (simple regex, works for most cases)
  const match = configContent.match(/\[\[kv_namespaces\]\][\s\S]*?id\s*=\s*"([^"]+)"/)
  if (!match || match[1] === 'your-kv-namespace-id') {
    throw new Error('KV namespace ID not configured in wrangler config')
  }
  namespaceId = match[1]
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

if (!isLocal) {
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
