import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname } from 'node:path'
import type { StorageAdapter } from './adapter.js'
import { DEFAULT_SETTINGS } from './adapter.js'
import type { RouteConfig, GlobalSettings, StoredRoute, ConfigFile } from '../types.js'

/**
 * JSON file storage adapter for VPS deployment
 */
export class JsonFileAdapter implements StorageAdapter {
  private data: ConfigFile = { routes: {}, settings: DEFAULT_SETTINGS }

  constructor(private filePath: string) {
    // Initial data load is handled via await storage.init()
    // In this simple case, we'll keep it as a placeholder and let it load on first use or in server.ts
  }

  async init(): Promise<void> {
    this.data = await this.loadFile()
  }

  private async loadFile(): Promise<ConfigFile> {
    if (!existsSync(this.filePath)) {
      console.info(`[JsonFileAdapter] Config file not found at ${this.filePath}, creating with defaults`)
      const defaultData: ConfigFile = {
        routes: {},
        settings: DEFAULT_SETTINGS
      }
      await this.saveFile(defaultData)
      return defaultData
    }

    try {
      const content = await readFile(this.filePath, 'utf-8')
      return JSON.parse(content) as ConfigFile
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[JsonFileAdapter] Failed to parse config file at ${this.filePath}: ${errorMessage}`)
      throw new Error(`Failed to load configuration file: ${errorMessage}`)
    }
  }

  private async saveFile(data: ConfigFile): Promise<void> {
    try {
      const dir = dirname(this.filePath)
      await mkdir(dir, { recursive: true })
      await writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[JsonFileAdapter] Failed to save config file to ${this.filePath}: ${errorMessage}`)
      throw new Error(`Failed to save configuration file: ${errorMessage}`)
    }
  }

  private async persist(): Promise<void> {
    await this.saveFile(this.data)
  }

  async getRoute(id: string): Promise<RouteConfig | null> {
    return this.data.routes[id] || null
  }

  async getAllRoutes(): Promise<StoredRoute[]> {
    const routes = Object.entries(this.data.routes).map(([id, config]) => ({
      ...config,
      id
    }))
    return routes
  }

  setRoute(id: string, config: RouteConfig): Promise<void> {
    this.data.routes[id] = config
    return this.persist()
  }

  async deleteRoute(id: string): Promise<boolean> {
    if (!this.data.routes[id]) {
      return false
    }
    delete this.data.routes[id]
    await this.persist()
    return true
  }

  async getSettings(): Promise<GlobalSettings> {
    return this.data.settings || DEFAULT_SETTINGS
  }

  setSettings(settings: GlobalSettings): Promise<void> {
    this.data.settings = settings
    return this.persist()
  }

  setRoutes(routes: Array<{ id: string; config: RouteConfig }>, clearExisting = false): Promise<void> {
    if (clearExisting) {
      this.data.routes = {}
    }

    for (const { id, config } of routes) {
      this.data.routes[id] = config
    }

    return this.persist()
  }

  deleteRoutes(ids: string[]): Promise<void> {
    for (const id of ids) {
      delete this.data.routes[id]
    }
    return this.persist()
  }

  /** Reload config from file (useful for hot-reloading) */
  async reload(): Promise<void> {
    this.data = await this.loadFile()
  }
}
