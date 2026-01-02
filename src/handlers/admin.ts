import { Hono } from 'hono'
import type { StorageAdapter } from '../storage/adapter.js'
import type { RouteConfig, GlobalSettings } from '../types.js'
import { basicAuth, type AuthConfig } from '../middleware/auth.js'
import { sanitizeRouteId } from '../utils/sanitize.js'

/**
 * Allowed URL schemes for template URLs
 */
const ALLOWED_URL_SCHEMES = ['http:', 'https:']

/**
 * Dangerous URL schemes that should be blocked
 */
const DANGEROUS_SCHEMES = [
  'javascript:', 'data:', 'vbscript:', 'file:',
  'about:', 'blob:', 'filesystem:'
]

/**
 * Maximum allowed URL length to prevent abuse
 */
const MAX_URL_LENGTH = 2048

/**
 * Validate URL scheme is safe (http or https only).
 * Blocks dangerous schemes and control character injection.
 */
function isValidUrlScheme(url: string): boolean {
  // Remove control characters (null bytes, newlines, etc.) to prevent injection
  const sanitized = url.replace(/[\x00-\x1F\x7F]/g, '')

  // Enforce maximum URL length
  if (sanitized.length > MAX_URL_LENGTH) {
    return false
  }

  try {
    const parsed = new URL(sanitized)
    return ALLOWED_URL_SCHEMES.includes(parsed.protocol)
  } catch {
    // For template URLs with placeholders, check for dangerous schemes
    const lowercaseUrl = sanitized.toLowerCase().trim()

    // Block all dangerous schemes
    if (DANGEROUS_SCHEMES.some(scheme => lowercaseUrl.startsWith(scheme))) {
      return false
    }

    // Block protocol-relative URLs for defense in depth
    if (lowercaseUrl.startsWith('//')) {
      return false
    }

    // Allow relative paths and templates with {placeholders}
    return true
  }
}

/**
 * Validate route configuration
 */
function validateRouteConfig(config: unknown): RouteConfig | null {
  if (!config || typeof config !== 'object') return null

  const c = config as Record<string, unknown>

  if (typeof c.template !== 'string' || !c.template.trim()) return null
  if (typeof c.active !== 'boolean') return null

  // Validate URL scheme for template
  if (!isValidUrlScheme(c.template)) {
    return null
  }

  return {
    template: c.template.trim(),
    active: c.active
  }
}

/**
 * Validate global settings
 */
function validateSettings(settings: unknown): GlobalSettings | null {
  if (!settings || typeof settings !== 'object') return null

  const s = settings as Record<string, unknown>

  if (typeof s.fallback_url !== 'string') return null
  if (typeof s.cache_ttl !== 'number' || s.cache_ttl < 0) return null
  if (typeof s.route_param !== 'string' || !s.route_param.trim()) return null

  // Sanitize route_param to alphanumeric only
  const routeParam = s.route_param.trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  if (!routeParam) return null

  return {
    fallback_url: s.fallback_url,
    cache_ttl: s.cache_ttl,
    route_param: routeParam
  }
}

export interface CloudflareConfig {
  apiToken?: string
  zoneId?: string
}

export interface AdminHandlerOptions {
  storage: StorageAdapter
  auth: AuthConfig
  cloudflare?: CloudflareConfig
}

/**
 * Create admin API routes
 */
export function createAdminHandler(options: AdminHandlerOptions) {
  const app = new Hono()
  const { storage, auth, cloudflare } = options

  // Apply basic auth to all admin routes
  app.use('/*', basicAuth(auth))

  // List all routes
  app.get('/routes', async (c) => {
    try {
      const routes = await storage.getAllRoutes()
      return c.json({ routes })
    } catch (error) {
      console.error('[Admin] Failed to get all routes:', error)
      return c.json({ error: 'Failed to retrieve routes' }, 500)
    }
  })

  // Get single route
  app.get('/routes/:id', async (c) => {
    try {
      const id = sanitizeRouteId(c.req.param('id'))
      const route = await storage.getRoute(id)

      if (!route) {
        return c.json({ error: 'Route not found' }, 404)
      }

      return c.json({ id, ...route })
    } catch (error) {
      console.error('[Admin] Failed to get route:', error)
      return c.json({ error: 'Failed to retrieve route' }, 500)
    }
  })

  // Create/update route
  app.post('/routes', async (c) => {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON' }, 400)
    }

    try {
      const id = sanitizeRouteId((body as Record<string, unknown>).id as string || '')

      if (!id) {
        return c.json({ error: 'Route ID is required' }, 400)
      }

      const config = validateRouteConfig(body)
      if (!config) {
        return c.json({ error: 'Invalid route configuration' }, 400)
      }

      await storage.setRoute(id, config)
      return c.json({ id, ...config }, 201)
    } catch (error) {
      console.error('[Admin] Failed to create route:', error)
      return c.json({ error: 'Failed to create route' }, 500)
    }
  })

  // Update route
  app.put('/routes/:id', async (c) => {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON' }, 400)
    }

    try {
      const id = sanitizeRouteId(c.req.param('id'))
      const existing = await storage.getRoute(id)

      if (!existing) {
        return c.json({ error: 'Route not found' }, 404)
      }

      const config = validateRouteConfig(body)

      if (!config) {
        return c.json({ error: 'Invalid route configuration' }, 400)
      }

      await storage.setRoute(id, config)
      return c.json({ id, ...config })
    } catch (error) {
      console.error('[Admin] Failed to update route:', error)
      return c.json({ error: 'Failed to update route' }, 500)
    }
  })

  // Delete route
  app.delete('/routes/:id', async (c) => {
    try {
      const id = sanitizeRouteId(c.req.param('id'))
      const deleted = await storage.deleteRoute(id)

      if (!deleted) {
        return c.json({ error: 'Route not found' }, 404)
      }

      return c.json({ deleted: true, id })
    } catch (error) {
      console.error('[Admin] Failed to delete route:', error)
      return c.json({ error: 'Failed to delete route' }, 500)
    }
  })

  // Get global settings
  app.get('/settings', async (c) => {
    try {
      const settings = await storage.getSettings()
      return c.json(settings)
    } catch (error) {
      console.error('[Admin] Failed to get settings:', error)
      return c.json({ error: 'Failed to retrieve settings' }, 500)
    }
  })

  // Update global settings
  app.put('/settings', async (c) => {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON' }, 400)
    }

    try {
      const settings = validateSettings(body)

      if (!settings) {
        return c.json({ error: 'Invalid settings' }, 400)
      }

      await storage.setSettings(settings)
      return c.json(settings)
    } catch (error) {
      console.error('[Admin] Failed to update settings:', error)
      return c.json({ error: 'Failed to update settings' }, 500)
    }
  })

  // Export all routes and settings as JSON
  app.get('/export', async (c) => {
    try {
      const routes = await storage.getAllRoutes()
      const settings = await storage.getSettings()

      // Convert to routes.json format
      const routesObj: Record<string, { template: string; active: boolean }> = {}
      for (const route of routes) {
        routesObj[route.id] = {
          template: route.template,
          active: route.active
        }
      }

      return c.json({
        routes: routesObj,
        settings
      })
    } catch (error) {
      console.error('[Admin] Failed to export:', error)
      return c.json({ error: 'Failed to export configuration' }, 500)
    }
  })

  // Import routes (replaces all existing routes; settings updated only if provided)
  app.post('/import', async (c) => {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON' }, 400)
    }

    try {
      const data = body as Record<string, unknown>

      if (!data.routes || typeof data.routes !== 'object' || Array.isArray(data.routes)) {
        return c.json({ error: 'Invalid import format: routes must be an object (not an array)' }, 400)
      }

      const routesObj = data.routes as Record<string, unknown>
      const routeIds = Object.keys(routesObj)

      // Validate all routes before importing
      const validatedRoutes: Array<{ id: string; config: RouteConfig }> = []
      const seenIds = new Map<string, string>() // sanitizedId -> originalId

      for (const id of routeIds) {
        const sanitizedId = sanitizeRouteId(id)
        if (!sanitizedId) {
          return c.json({ error: `Invalid route ID: "${id}". IDs must contain only letters, numbers, and hyphens.` }, 400)
        }

        // Check for ID collisions after sanitization
        const existingOriginal = seenIds.get(sanitizedId)
        if (existingOriginal) {
          return c.json({
            error: `Route ID collision: "${id}" and "${existingOriginal}" both sanitize to "${sanitizedId}". Please use unique IDs.`
          }, 400)
        }
        seenIds.set(sanitizedId, id)

        const config = validateRouteConfig(routesObj[id])
        if (!config) {
          return c.json({ error: `Invalid configuration for route: "${id}". Ensure template is a valid URL and active is true/false.` }, 400)
        }

        validatedRoutes.push({ id: sanitizedId, config })
      }

      // Prevent importing empty route sets
      if (validatedRoutes.length === 0) {
        return c.json({ error: 'Import file contains no valid routes' }, 400)
      }

      // Validate settings upfront if provided
      let validatedSettings: GlobalSettings | null = null
      if (data.settings) {
        validatedSettings = validateSettings(data.settings)
        if (!validatedSettings) {
          return c.json({ error: 'Invalid settings format. Ensure fallback_url is a string, cache_ttl is a positive number, and route_param is alphanumeric.' }, 400)
        }
      }

      // BACKUP: Save existing routes and settings before any changes for rollback
      const existingRoutes = await storage.getAllRoutes()
      const existingSettings = await storage.getSettings()
      const routeBackup = existingRoutes.map(r => ({
        id: r.id,
        config: { template: r.template, active: r.active }
      }))
      const settingsBackup = { ...existingSettings }

      // Helper function to restore route backup
      const restoreRouteBackup = async (): Promise<string[]> => {
        const failedRestores: string[] = []
        for (const { id, config } of routeBackup) {
          try {
            await storage.setRoute(id, config)
          } catch (rollbackError) {
            console.error(`[Admin] Rollback failed for route ${id}:`, rollbackError)
            failedRestores.push(id)
          }
        }
        return failedRestores
      }

      // Helper function to restore settings backup
      const restoreSettingsBackup = async (): Promise<boolean> => {
        try {
          await storage.setSettings(settingsBackup)
          return true
        } catch (rollbackError) {
          console.error('[Admin] Failed to restore settings backup:', rollbackError)
          return false
        }
      }

      // Helper function to delete routes (for cleanup during rollback)
      const deleteRoutes = async (routes: Array<{ id: string }>): Promise<void> => {
        for (const { id } of routes) {
          try {
            await storage.deleteRoute(id)
          } catch (deleteError) {
            // Log but continue - best effort cleanup during rollback
            console.error(`[Admin] Rollback cleanup: failed to delete route ${id}:`, deleteError)
          }
        }
      }

      // Delete all existing routes (with rollback on failure)
      try {
        for (const route of existingRoutes) {
          await storage.deleteRoute(route.id)
        }
      } catch (deleteError) {
        console.error('[Admin] Delete failed mid-operation, attempting rollback:', deleteError)
        const failedRestores = await restoreRouteBackup()
        const rollbackStatus = failedRestores.length > 0
          ? ` Failed to restore routes: ${failedRestores.join(', ')}.`
          : ' Previous routes restored successfully.'
        return c.json({
          error: `Failed to clear existing routes.${rollbackStatus} Please verify your configuration.`
        }, 500)
      }

      // Import new routes with rollback on failure
      try {
        for (const { id, config } of validatedRoutes) {
          await storage.setRoute(id, config)
        }
      } catch (importError) {
        // ROLLBACK: First delete any partially imported routes, then restore backup
        console.error('[Admin] Import failed mid-operation, attempting rollback:', importError)
        await deleteRoutes(validatedRoutes)
        const failedRestores = await restoreRouteBackup()
        const rollbackStatus = failedRestores.length > 0
          ? ` Failed to restore routes: ${failedRestores.join(', ')}.`
          : ' Previous routes restored successfully.'
        return c.json({
          error: `Import failed mid-operation.${rollbackStatus} Please verify your configuration.`
        }, 500)
      }

      // Import settings if provided and validated (with rollback on failure)
      if (validatedSettings) {
        try {
          await storage.setSettings(validatedSettings)
        } catch (settingsError) {
          // ROLLBACK: Delete newly imported routes, restore route backup, restore settings backup
          console.error('[Admin] Settings import failed, rolling back:', settingsError)
          await deleteRoutes(validatedRoutes)
          const failedRestores = await restoreRouteBackup()
          const settingsRestored = await restoreSettingsBackup()
          const routeStatus = failedRestores.length > 0
            ? ` Failed to restore routes: ${failedRestores.join(', ')}.`
            : ' Routes restored.'
          const settingsStatus = settingsRestored ? ' Settings restored.' : ' Failed to restore settings.'
          return c.json({
            error: `Settings import failed.${routeStatus}${settingsStatus} Please verify your configuration.`
          }, 500)
        }
      }

      return c.json({
        success: true,
        imported: validatedRoutes.length,
        message: `Imported ${validatedRoutes.length} routes`
      })
    } catch (error) {
      console.error('[Admin] Failed to import:', error)
      return c.json({ error: 'Failed to import configuration. Check server logs for details.' }, 500)
    }
  })

  // Check if cache purging is available
  app.get('/purge-cache/status', (c) => {
    const configured = !!(cloudflare?.apiToken && cloudflare?.zoneId)
    return c.json({ available: configured })
  })

  // Purge all CDN cache (Cloudflare only)
  app.post('/purge-cache', async (c) => {
    if (!cloudflare?.apiToken || !cloudflare?.zoneId) {
      return c.json({
        error: 'Cache purging not configured. Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID environment variables.'
      }, 400)
    }

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${cloudflare.zoneId}/purge_cache`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cloudflare.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ purge_everything: true })
        }
      )

      const result = await response.json() as { success: boolean; errors?: Array<{ message: string }> }

      if (!result.success) {
        const errorMsg = result.errors?.[0]?.message || 'Unknown error'
        return c.json({ error: `Cloudflare API error: ${errorMsg}` }, 500)
      }

      return c.json({ success: true, message: 'All cached redirects have been purged' })
    } catch (error) {
      console.error('[Admin] Failed to purge cache:', error)
      return c.json({ error: 'Failed to purge cache' }, 500)
    }
  })

  return app
}
