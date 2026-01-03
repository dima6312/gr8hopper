import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createRedirectHandler } from './handlers/redirect.js'
import { createAdminHandler } from './handlers/admin.js'
import { KVAdapter } from './storage/kv.js'
import { basicAuth, type AuthConfig } from './middleware/auth.js'
import type { Env } from './types.js'
import packageJson from '../package.json' with { type: 'json' }

// HTML for admin UI (embedded for CF Workers compatibility)
import { getAdminHtml } from './admin-html.js'

const app = new Hono<{ Bindings: Env }>()

// Cached handlers to avoid re-creation on every request
let redirectHandler: ReturnType<typeof createRedirectHandler> | null = null
let adminHandler: ReturnType<typeof createAdminHandler> | null = null
let authConfig: AuthConfig | null = null
let adminBase: string | null = null
let corsMiddleware: ReturnType<typeof cors> | null = null
const APP_VERSION = packageJson.version || 'dev'

// Mount routes dynamically based on environment
app.all('/*', async (c, _next) => {
  const env = c.env

  // Initialize handlers on first request (cold start)
  if (!redirectHandler || !adminHandler) {
    if (!env.ROUTES_KV) {
      return c.text('ROUTES_KV binding not configured', 500)
    }

    const storage = new KVAdapter(env.ROUTES_KV)

    // Get config from environment
    const adminPath = env.ADMIN_PATH || 'admin'

    // ADMIN_USERNAME and ADMIN_PASSWORD are required for security - no defaults
    if (!env.ADMIN_USERNAME) {
      console.error('[FATAL] ADMIN_USERNAME environment variable is required. Set it via: npx wrangler secret put ADMIN_USERNAME')
      return c.text('Server misconfiguration: ADMIN_USERNAME not set', 500)
    }
    if (!env.ADMIN_PASSWORD) {
      console.error('[FATAL] ADMIN_PASSWORD environment variable is required. Set it via: npx wrangler secret put ADMIN_PASSWORD')
      return c.text('Server misconfiguration: ADMIN_PASSWORD not set', 500)
    }
    const username = env.ADMIN_USERNAME
    const password = env.ADMIN_PASSWORD

    adminBase = `/${adminPath}`
    authConfig = { username, password }

    // Cloudflare config for cache purging (optional)
    const cloudflareConfig = env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_ZONE_ID
      ? { apiToken: env.CLOUDFLARE_API_TOKEN, zoneId: env.CLOUDFLARE_ZONE_ID }
      : undefined

    // Create handlers once
    redirectHandler = createRedirectHandler({ storage })
    adminHandler = createAdminHandler({ storage, auth: authConfig, cloudflare: cloudflareConfig })
    corsMiddleware = cors()
  }

  // Route to appropriate handler
  const path = new URL(c.req.url).pathname

  // Apply CORS for admin routes (dynamic path support)
  if (path === adminBase || path === `${adminBase}/` || path.startsWith(`${adminBase}/`)) {
    // Handle CORS preflight
    await corsMiddleware!(c, async () => { })

    // All admin routes require authentication
    const authMiddleware = basicAuth(authConfig!)
    const authResult = await authMiddleware(c, async () => { })
    if (authResult) return authResult // Return 401 if auth failed
  }

  // Serve admin UI
  if (path === adminBase || path === `${adminBase}/`) {
    return c.html(getAdminHtml(adminBase!, APP_VERSION))
  }

  // Admin API
  if (path.startsWith(`${adminBase}/`)) {
    const apiPath = path.replace(adminBase!, '')
    const newUrl = new URL(c.req.url)
    newUrl.pathname = apiPath
    const newRequest = new Request(newUrl.toString(), c.req.raw)
    return adminHandler.fetch(newRequest, env)
  }

  // Public redirect
  return redirectHandler.fetch(c.req.raw, env)
})

export default app
