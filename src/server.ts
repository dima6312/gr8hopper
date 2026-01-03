/**
 * Node.js/Bun server entry point for VPS deployment
 */
import { serve } from '@hono/node-server'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createRedirectHandler } from './handlers/redirect.js'
import { createAdminHandler } from './handlers/admin.js'
import { JsonFileAdapter } from './storage/json-file.js'
import { getAdminHtml } from './admin-html.js'
import { basicAuth } from './middleware/auth.js'

// Load environment variables from .dev.vars if it exists (for development convenience)
function loadDevVars() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const devVarsPath = join(__dirname, '..', '.dev.vars')

  if (!existsSync(devVarsPath)) {
    return
  }

  const nodeEnv = (process.env.NODE_ENV || '').toLowerCase()
  if (nodeEnv === 'production') {
    console.warn(`[DevVars] .dev.vars found at ${devVarsPath} but NODE_ENV=production; skipping.`)
    return
  }

  const envLabel = nodeEnv || 'unspecified'
  console.warn(`[DevVars] Loading environment variables from ${devVarsPath} (NODE_ENV=${envLabel}).`)
  const content = readFileSync(devVarsPath, 'utf-8')
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) continue

    const equalsIndex = trimmed.indexOf('=')
    if (equalsIndex > 0) {
      const key = trimmed.substring(0, equalsIndex).trim()
      let value = trimmed.substring(equalsIndex + 1).trim()

      // Strip quotes if they exist
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1)
      }

      // Only set if not already set (respect explicit exports)
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  }
}

// Load .dev.vars for development convenience
loadDevVars()

// Configuration from environment variables
const PORT = parseInt(process.env.PORT || '3000')
const CONFIG_FILE = process.env.CONFIG_FILE || './routes.json'
const ADMIN_PATH = process.env.ADMIN_PATH || 'admin' // Customizable admin URL path

// ADMIN_USERNAME and ADMIN_PASSWORD are required for security - no defaults
if (!process.env.ADMIN_USERNAME) {
  console.error(`
╔════════════════════════════════════════════════════════════════════════════╗
║  ❌ FATAL: ADMIN_USERNAME environment variable is required!                ║
║                                                                            ║
║  Set it with: export ADMIN_USERNAME=your-username                          ║
╚════════════════════════════════════════════════════════════════════════════╝
`)
  process.exit(1)
}
if (!process.env.ADMIN_PASSWORD) {
  console.error(`
╔════════════════════════════════════════════════════════════════════════════╗
║  ❌ FATAL: ADMIN_PASSWORD environment variable is required!                ║
║                                                                            ║
║  Set it with: export ADMIN_PASSWORD=your-secure-password                   ║
╚════════════════════════════════════════════════════════════════════════════╝
`)
  process.exit(1)
}
const ADMIN_USERNAME = process.env.ADMIN_USERNAME
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

// Create storage adapter
const storage = new JsonFileAdapter(CONFIG_FILE)

// Create Hono app
const app = new Hono()

// Auth config
const authConfig = { username: ADMIN_USERNAME, password: ADMIN_PASSWORD }

// Enable CORS and auth for all admin routes (both exact path and subpaths)
app.use(`/${ADMIN_PATH}`, cors())
app.use(`/${ADMIN_PATH}/*`, cors())
app.use(`/${ADMIN_PATH}`, basicAuth(authConfig))
app.use(`/${ADMIN_PATH}/*`, basicAuth(authConfig))

// Create handlers
const redirectHandler = createRedirectHandler({ storage })
const adminHandler = createAdminHandler({ storage, auth: authConfig })

// Serve admin UI (auth applied via middleware above)
app.get(`/${ADMIN_PATH}`, (c) => c.html(getAdminHtml(`/${ADMIN_PATH}`)))
app.get(`/${ADMIN_PATH}/`, (c) => c.html(getAdminHtml(`/${ADMIN_PATH}`)))

// Admin API routes
app.route(`/${ADMIN_PATH}`, adminHandler)

// Public redirect routes
app.route('/', redirectHandler)

// Start server
const adminUrl = `http://localhost:${PORT}/${ADMIN_PATH}`
console.log(`
╔═══════════════════════════════════════════════════════════╗
║                     GR8HOPPER                              ║
║           Lightweight URL Redirect Service                 ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT.toString().padEnd(20)}║
║  Admin panel:       ${adminUrl.padEnd(36)}║
║  Config file:       ${CONFIG_FILE.padEnd(35)}║
╚═══════════════════════════════════════════════════════════╝
`)

serve({
  fetch: app.fetch,
  port: PORT
})
