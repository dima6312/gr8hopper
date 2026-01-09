import { Hono, type Context } from 'hono'
import type { StorageAdapter } from '../storage/adapter.js'
import type { RouteConfig, GlobalSettings } from '../types.js'
import { basicAuth, type AuthConfig } from '../middleware/auth.js'
import { sanitizeRouteId } from '../utils/sanitize.js'
import { validateRouteConfig, validateRouteIdPattern, validateRoutePatch, validateSettings } from '../utils/validation.js'

export interface CloudflareConfig {
  apiToken?: string
  zoneId?: string
}

interface CloudflareApiResponse {
  success: boolean
  errors?: Array<{ message: string }>
}

export interface AdminHandlerOptions {
  storage: StorageAdapter
  auth: AuthConfig
  cloudflare?: CloudflareConfig
}

function getRouteIdFromRequest(c: Context): string {
  let rawId = ''

  try {
    rawId = c.req.param('id')
  } catch {
    rawId = ''
  }

  if (!rawId) {
    try {
      rawId = c.req.param('*')
    } catch {
      rawId = ''
    }
  }

  if (!rawId) {
    rawId = c.req.query('id') || ''
  }

  if (rawId.startsWith('/')) {
    rawId = rawId.slice(1)
  }

  let decodedId = rawId
  if (rawId.includes('%')) {
    try {
      decodedId = decodeURIComponent(rawId)
    } catch {
      decodedId = rawId
    }
  }

  return sanitizeRouteId(decodedId)
}

/**
 * Create admin API routes
 */
export function createAdminHandler(options: AdminHandlerOptions): Hono {
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

  // Get single route - :id for simple routes
  app.get('/routes/:id', async (c) => {
    const id = getRouteIdFromRequest(c)
    if (!id) {
      return c.json({ error: 'Route ID is required' }, 400)
    }

    try {
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

  // Get single route - wildcard catches pattern routes containing slashes (e.g., "shop/{id}")
  app.get('/routes/*', async (c) => {
    const id = getRouteIdFromRequest(c)
    if (!id) {
      return c.json({ error: 'Route ID is required' }, 400)
    }

    try {
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
      const idValidation = validateRouteIdPattern(id)
      if (!idValidation.valid) {
        return c.json({ error: `Invalid route ID: ${idValidation.reason}` }, 400)
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

  // Update route - :id for simple routes
  app.patch('/routes/:id', async (c) => {
    const id = getRouteIdFromRequest(c)
    if (!id) {
      return c.json({ error: 'Route ID is required' }, 400)
    }

    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON' }, 400)
    }

    try {
      const existing = await storage.getRoute(id)

      if (!existing) {
        return c.json({ error: 'Route not found' }, 404)
      }

      const patch = validateRoutePatch(body)
      if (!patch) {
        return c.json({ error: 'Invalid route configuration' }, 400)
      }

      // Merge existing with updates (partial update support)
      const merged: RouteConfig = { ...existing, ...patch }

      await storage.setRoute(id, merged)
      return c.json({ id, ...merged })
    } catch (error) {
      console.error('[Admin] Failed to update route:', error)
      return c.json({ error: 'Failed to update route' }, 500)
    }
  })

  // Update route - wildcard catches pattern routes containing slashes
  app.patch('/routes/*', async (c) => {
    const id = getRouteIdFromRequest(c)
    if (!id) {
      return c.json({ error: 'Route ID is required' }, 400)
    }

    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON' }, 400)
    }

    try {
      const existing = await storage.getRoute(id)

      if (!existing) {
        return c.json({ error: 'Route not found' }, 404)
      }

      const patch = validateRoutePatch(body)
      if (!patch) {
        return c.json({ error: 'Invalid route configuration' }, 400)
      }

      // Merge existing with updates (partial update support)
      const merged: RouteConfig = { ...existing, ...patch }

      await storage.setRoute(id, merged)
      return c.json({ id, ...merged })
    } catch (error) {
      console.error('[Admin] Failed to update route:', error)
      return c.json({ error: 'Failed to update route' }, 500)
    }
  })

  // Delete route - :id for simple routes
  app.delete('/routes/:id', async (c) => {
    const id = getRouteIdFromRequest(c)
    if (!id) {
      return c.json({ error: 'Route ID is required' }, 400)
    }

    try {
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

  // Delete route - wildcard catches pattern routes containing slashes
  app.delete('/routes/*', async (c) => {
    const id = getRouteIdFromRequest(c)
    if (!id) {
      return c.json({ error: 'Route ID is required' }, 400)
    }

    try {
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
      const routesObj: Record<string, RouteConfig> = {}
      for (const route of routes) {
        routesObj[route.id] = {
          template: route.template,
          active: route.active,
          passthrough: route.passthrough === true // Include passthrough (even if false/undefined)
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
          return c.json({ error: `Invalid route ID: "${id}". IDs may include letters, numbers, hyphens, slashes, braces, asterisks, dots, colons, and query symbols (? & =).` }, 400)
        }
        const idValidation = validateRouteIdPattern(sanitizedId)
        if (!idValidation.valid) {
          return c.json({ error: `Invalid route ID: "${id}". ${idValidation.reason}` }, 400)
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
        config: {
          template: r.template,
          active: r.active,
          passthrough: r.passthrough === true // Preserve passthrough in backup
        }
      }))
      const settingsBackup = { ...existingSettings }

      // Helper function to restore route backup using bulk operation
      const restoreRouteBackup = async (): Promise<boolean> => {
        try {
          await storage.setRoutes(routeBackup, true)
          return true
        } catch (rollbackError) {
          console.error('[Admin] Failed to restore route backup:', rollbackError)
          return false
        }
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

      // Import all routes at once using bulk operation (more efficient)
      try {
        await storage.setRoutes(validatedRoutes, true) // clearExisting=true replaces all routes
      } catch (importError) {
        // ROLLBACK: Restore original routes
        console.error('[Admin] Import failed, attempting rollback:', importError)
        const routesRestored = await restoreRouteBackup()
        const rollbackStatus = routesRestored
          ? ' Previous routes restored successfully.'
          : ' Failed to restore previous routes.'
        return c.json({
          error: `Import failed.${rollbackStatus} Please verify your configuration.`
        }, 500)
      }

      // Import settings if provided and validated (with rollback on failure)
      if (validatedSettings) {
        try {
          await storage.setSettings(validatedSettings)
        } catch (settingsError) {
          // ROLLBACK: Restore original routes and settings
          console.error('[Admin] Settings import failed, rolling back:', settingsError)
          const routesRestored = await restoreRouteBackup()
          const settingsRestored = await restoreSettingsBackup()
          const routeStatus = routesRestored ? ' Routes restored.' : ' FAILED to restore routes - new routes may still be active.'
          const settingsStatus = settingsRestored ? ' Settings restored.' : ' FAILED to restore settings.'
          const nextStep = (!routesRestored || !settingsRestored)
            ? ' Use /admin/export to backup current state, then re-import from a known good configuration.'
            : ''
          return c.json({
            error: `Settings import failed.${routeStatus}${settingsStatus}${nextStep}`
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

      const result: CloudflareApiResponse = await response.json()

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
