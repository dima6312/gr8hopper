import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import type { StorageAdapter } from './adapter.js'
import { DEFAULT_SETTINGS } from './adapter.js'
import type { RouteConfig, GlobalSettings, StoredRoute, ConfigFile } from '../types.js'

/**
 * JSON file storage adapter for VPS deployment
 */
export class JsonFileAdapter implements StorageAdapter {
  private data: ConfigFile

  constructor(private filePath: string) {
    this.data = this.loadFile()
  }

  private loadFile(): ConfigFile {
    if (!existsSync(this.filePath)) {
      console.log(`[JsonFileAdapter] Config file not found at ${this.filePath}, creating with defaults`)
      const defaultData: ConfigFile = {
        routes: {},
        settings: DEFAULT_SETTINGS
      }
      this.saveFile(defaultData)
      return defaultData
    }

    try {
      const content = readFileSync(this.filePath, 'utf-8')
      return JSON.parse(content) as ConfigFile
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[JsonFileAdapter] Failed to parse config file at ${this.filePath}: ${errorMessage}`)
      throw new Error(`Failed to load configuration file: ${errorMessage}`)
    }
  }

  private saveFile(data: ConfigFile): void {
    try {
      writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[JsonFileAdapter] Failed to save config file to ${this.filePath}: ${errorMessage}`)
      throw new Error(`Failed to save configuration file: ${errorMessage}`)
    }
  }

  private persist(): void {
    this.saveFile(this.data)
  }

  async getRoute(id: string): Promise<RouteConfig | null> {
    return this.data.routes[id] || null
  }

  async getAllRoutes(): Promise<StoredRoute[]> {
    return Object.entries(this.data.routes).map(([id, config]) => ({
      ...config,
      id
    }))
  }

  async setRoute(id: string, config: RouteConfig): Promise<void> {
    this.data.routes[id] = config
    this.persist()
  }

  async deleteRoute(id: string): Promise<boolean> {
    if (!this.data.routes[id]) {
      return false
    }
    delete this.data.routes[id]
    this.persist()
    return true
  }

  async getSettings(): Promise<GlobalSettings> {
    return this.data.settings || DEFAULT_SETTINGS
  }

  async setSettings(settings: GlobalSettings): Promise<void> {
    this.data.settings = settings
    this.persist()
  }

  async setRoutes(routes: Array<{ id: string; config: RouteConfig }>, clearExisting = false): Promise<void> {
    if (clearExisting) {
      this.data.routes = {}
    }

    for (const { id, config } of routes) {
      this.data.routes[id] = config
    }

    this.persist()
  }

  async deleteRoutes(ids: string[]): Promise<void> {
    for (const id of ids) {
      delete this.data.routes[id]
    }
    this.persist()
  }

  /** Reload config from file (useful for hot-reloading) */
  reload(): void {
    this.data = this.loadFile()
  }
}
