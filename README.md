# Gr8hopper
[![npm version](https://img.shields.io/npm/v/gr8hopper.svg)](https://www.npmjs.com/package/gr8hopper) [![Docker Image](https://img.shields.io/badge/docker-ghcr.io-blue.svg)](https://github.com/dima6312/gr8hopper/pkgs/container/gr8hopper) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight, high-performance URL redirect service with configurable route templates. Deploy to Cloudflare Workers for global edge distribution or run on any VPS with Node.js/Bun.

## Why Gr8hopper?

- **High Performance**: Handles millions of requests through aggressive edge caching. First request per unique URL executes code; all subsequent requests are served from cache.
- **Portable**: Single codebase runs on Cloudflare Workers (edge) or any VPS (Node.js/Bun).
- **Flexible Templates**: Dynamic URL construction with `{param}` placeholders.
- **Simple Admin**: Clean, user-friendly web interface for managing routes without touching code.
- **Customizable**: Configure your own URL parameter name for cleaner redirect links.
- **Minimal Footprint**: ~14KB framework (Hono), zero runtime dependencies beyond that.

## Who Is This For?

- **Email/SMS marketers** needing dynamic link personalization beyond platform limitations
- **Agencies** managing multiple clients with centralized link control
- **E-commerce teams** sending personalized product recommendations
- **Developers** wanting self-hosted alternative to enterprise link management tools

## Use Cases

- Email/SMS marketing with dynamic personalization (works with any ESP)
- Affiliate link management
- Multi-partner/vendor routing (route to different partners based on context)
- Regional URL routing
- Campaign tracking links
- A/B testing traffic distribution
- Personalized landing page routing
- QR code campaigns with context-aware routing

## Quick Start

### NPM Package (Easiest)

```bash
# Install globally
npm install -g gr8hopper

# Or install locally in your project
npm install gr8hopper

# Set environment variables
export ADMIN_USERNAME=your-username
export ADMIN_PASSWORD=your-secure-password

# Run the server
npx gr8hopper
# Or if installed globally: gr8hopper
```

> **Tip:** Variables set with `export` are temporary. For a persistent setup, add them to your shell profile (`.zshrc` or `.bashrc`), or run inline:
> `ADMIN_USERNAME=user ADMIN_PASSWORD=pass npx gr8hopper`

### Docker (Pre-built Image)

```bash
# Pull the latest image from GitHub Container Registry
docker pull ghcr.io/dima6312/gr8hopper:latest

# Or pull a specific version
docker pull ghcr.io/dima6312/gr8hopper:1.2.1

# Run with Docker (ADMIN_USERNAME and ADMIN_PASSWORD are required!)
docker run -d --restart unless-stopped \
  -p 3000:3000 \
  -e ADMIN_USERNAME=your-username \
  -e ADMIN_PASSWORD=your-secure-password \
  -v gr8hopper-data:/app/data \
  --name gr8hopper \
  ghcr.io/dima6312/gr8hopper:latest

# Or use Docker Compose (create docker-compose.yml - see Deployment section)
docker compose up -d
```

> **Important:** `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables are **required**. The container will fail to start without them. Username cannot be 'admin' for security reasons.
>
> **Note:** Pre-built images are automatically published to GitHub Container Registry on each release. For building from source, see the [Deployment](#deployment) section.

### Cloudflare Workers (Recommended for production)

```bash
# Clone and install
git clone https://github.com/your-org/gr8hopper.git
cd gr8hopper
npm install

# Create KV namespace for storing routes
npx wrangler kv namespace create ROUTES_KV
# Copy the ID from output, then:
cp wrangler.production.toml.example wrangler.production.toml
# Edit wrangler.production.toml and replace "your-production-kv-namespace-id" with your actual ID

# Set admin credentials (stored as encrypted secrets)
npx wrangler secret put ADMIN_USERNAME
npx wrangler secret put ADMIN_PASSWORD

# Deploy to Cloudflare's global edge network
npm run deploy
```

### Local Development (Cloudflare Workers)

```bash
# Copy the example configs for local dev
cp wrangler.toml.example wrangler.toml
cp .dev.vars.example .dev.vars

# Edit wrangler.toml - set your KV namespace ID
# Edit .dev.vars - set your ADMIN_PASSWORD (and optionally ADMIN_USERNAME)

# Run local dev server
npm run dev
```

> **Note:** `wrangler.toml` and `.dev.vars` are gitignored. The `.dev.vars` file overrides `wrangler.toml` `[vars]` for local development - this is where you set sensitive values like `ADMIN_PASSWORD`.

### Node.js (VPS/Self-hosted)

```bash
# Clone and install
git clone https://github.com/your-org/gr8hopper.git
cd gr8hopper
npm install

# Configure environment (via export or .dev.vars file)
export ADMIN_USERNAME=your-username
export ADMIN_PASSWORD=your-secure-password
export PORT=3000

# Development (with hot reload)
npm run dev:node

# Production
npm run build
npm start
```

### Bun

```bash
bun install
ADMIN_USERNAME=your-username ADMIN_PASSWORD=your-password bun run src/server.ts
```

## How It Works

### Redirect Flow

```
Request: /?r=partner-a&id=12345
                    │
                    ▼
         ┌──────────────────┐
         │  Edge Cache Hit? │
         └────────┬─────────┘
                  │
     ┌────────────┴────────────┐
     │                         │
     ▼ YES                     ▼ NO
┌─────────┐            ┌──────────────┐
│ Return  │            │ Look up      │
│ cached  │            │ route config │
│ 301     │            └──────┬───────┘
│ (<1ms)  │                   │
└─────────┘                   ▼
                      ┌──────────────┐
                      │ Substitute   │
                      │ {params}     │
                      └──────┬───────┘
                             │
                             ▼
                      ┌──────────────┐
                      │ Return 301   │
                      │ + cache it   │
                      └──────────────┘
```

### Example

**Route Configuration:**
```json
{
  "id": "partner-a",
  "template": "https://partner-a.com/product/{id}?ref={route}",
  "active": true
}
```

**Request:**
```
https://your-domain.com/?r=partner-a&id=12345
```

**Result:**
```
301 Redirect → https://partner-a.com/product/12345?ref=partner-a
```

> **Note:** The `{route}` placeholder is automatically replaced with the route ID (e.g., `partner-a`), useful for tracking which route was used.

## Configuration

### Route Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `template` | string | Yes | Target URL with `{param}` placeholders |
| `active` | boolean | Yes | Enable/disable this route |

### Template Placeholders

Use `{param}` syntax in your destination URL template:

| Placeholder | Source | Example |
|-------------|--------|---------|
| `{route}` | Route ID (automatic) | `partner-a` |
| `{anyParam}` | URL query parameter | `?anyParam=value` |

Missing placeholders are left as-is (e.g., `{id}` stays `{id}`) to make configuration errors visible in the destination URL.

Example template: `https://site.com/{route}/product/{id}`

### Global Settings

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `fallback_url` | string | `/not-found` | Redirect when no route param or route not found (must be absolute URL like `https://...` to redirect) |
| `cache_ttl` | number | `604800` | Cache duration in seconds (1 week) |
| `route_param` | string | `r` | URL parameter name for route selection |

### URL Parameter Name

By default, Gr8hopper uses `r` as the URL parameter for route selection:
```
https://your-domain.com/?r=my-route&id=123
```

You can customize this in the admin settings. For example, setting it to `route`:
```
https://your-domain.com/?route=my-route&id=123
```

### Environment Variables

| Variable | Default | Platform | Description |
|----------|---------|----------|-------------|
| `PORT` | `3000` | VPS | HTTP server port |
| `CONFIG_FILE` | `./routes.json` | VPS | Path to routes config file |
| `ADMIN_USERNAME` | **(required)** | Both | Admin panel username |
| `ADMIN_PASSWORD` | **(required)** | Both | Admin panel password |
| `ADMIN_PATH` | `admin` | Both | Admin URL path (customize to hide admin) |

## Admin Panel

Access the admin interface at `/admin` (requires authentication).

The admin panel features:
- **Routes management**: Add, edit, and delete redirect routes
- **Visual status**: Toggle routes on/off with a simple switch or one-click toggle in the list
- **Mobile Optimized**: Responsive design for managing redirects on the go
- **Settings**: Configure fallback URL, cache duration, and URL parameter name
- **Import/Export**: Backup and restore routes as JSON files (replaces all routes on import)

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/routes` | List all routes |
| `GET` | `/admin/routes/:id` | Get single route |
| `POST` | `/admin/routes` | Create new route |
| `PUT` | `/admin/routes/:id` | Update existing route |
| `DELETE` | `/admin/routes/:id` | Delete route |
| `GET` | `/admin/settings` | Get global settings |
| `PUT` | `/admin/settings` | Update global settings |
| `GET` | `/admin/export` | Export all routes and settings as JSON |
| `POST` | `/admin/import` | Import routes and settings (replaces all) |

### API Example

```bash
# Create a route
curl -X POST https://your-domain.com/admin/routes \
  -u admin:password \
  -H "Content-Type: application/json" \
  -d '{
    "id": "my-route",
    "template": "https://example.com/{id}",
    "active": true
  }'
```

## Performance

### Caching Strategy

Gr8hopper uses aggressive caching to minimize compute costs:

1. **First request** per unique URL: Worker executes, reads config, returns 301 with cache headers
2. **All subsequent requests**: Served directly from edge cache (no code execution)

**Cache Headers:**
```
Cache-Control: public, max-age=604800, s-maxage=604800
CDN-Cache-Control: max-age=4233600
```

> **Note:** The `CDN-Cache-Control` header uses a 7x multiplier on the configured TTL, so CDN edge servers cache redirects 7 times longer than browsers (e.g., 1 week browser cache = 7 weeks edge cache).

### Cache Invalidation

**CDN Cache (Cloudflare):**
If you need to update a redirect destination mid-campaign, purge the CDN cache:

*Option 1: Built-in Admin Button (Recommended)*
1. Configure cache purge credentials (see below)
2. Use the "Purge All" button in Settings

*Option 2: Cloudflare Dashboard*
1. Go to Cloudflare Dashboard → your domain → **Caching** → **Configuration**
2. Click **Purge Everything**

To enable the built-in purge button:
```bash
npx wrangler secret put CLOUDFLARE_API_TOKEN  # Token with Zone.Cache Purge permission
npx wrangler secret put CLOUDFLARE_ZONE_ID    # Your zone ID from CF dashboard
```

**Browser Cache:**
Once a user's browser caches a 301 redirect, it **cannot be remotely invalidated**. The browser will use the cached redirect until:
- The cache TTL expires (default: 1 week)
- The user manually clears their browser cache

**Best practice:** Finalize your redirect destinations before launching campaigns. If you anticipate needing to change destinations frequently, consider using a shorter cache TTL in settings.

### Capacity Example

For an email campaign with:
- 250 routes × 50 IDs per email = 12,500 unique URLs
- 1,000,000 recipients
- ~4 security bot scans per recipient

**Result:**
- Total requests: ~200,000,000
- Actual Worker invocations: ~12,500 (one per unique URL)
- Cache hit rate: 99.99%
- Cost: Cloudflare free tier handles this easily

## Project Structure

```
gr8hopper/
├── src/
│   ├── index.ts              # Cloudflare Workers entry
│   ├── server.ts             # Node.js/Bun entry
│   ├── types.ts              # TypeScript interfaces
│   ├── admin-html.ts         # Admin UI (embedded)
│   ├── handlers/
│   │   ├── redirect.ts       # Redirect logic + template engine
│   │   └── admin.ts          # Admin API endpoints
│   ├── storage/
│   │   ├── adapter.ts        # Storage interface
│   │   ├── kv.ts             # Cloudflare KV adapter
│   │   └── json-file.ts      # JSON file adapter
│   ├── middleware/
│   │   └── auth.ts           # Basic auth
│   └── utils/
│       ├── sanitize.ts       # Route ID sanitization
│       └── validation.ts     # URL and config validation
├── wrangler.toml.example     # Cloudflare config template (copy to wrangler.toml)
├── wrangler.production.toml.example  # Production config template
├── routes.json               # Local routes (VPS mode)
├── package.json
└── tsconfig.json
```

## Development

```bash
# Install dependencies
npm install

# Cloudflare Workers local dev
npm run dev

# Node.js local dev (hot reload)
npm run dev:node

# Type checking
npx tsc --noEmit

# Build for production
npm run build
```

## Data Storage

### Cloudflare Workers
Routes and settings are stored in **Cloudflare KV** - a globally distributed key-value store. Data persists across deployments and is replicated worldwide.

### VPS (Node.js/Bun)
Routes and settings are stored in a local **JSON file** (`routes.json` by default).
- Data persists across server restarts
- Back up this file regularly
- Change location with `CONFIG_FILE` environment variable

## Bulk Import Routes

Import routes directly to Cloudflare KV without using the admin UI. This is useful for:
- Initial deployment with pre-configured routes
- CI/CD pipelines
- Migrating from another system

### Usage

```bash
# Import routes.json to production KV
npm run import:routes routes.json

# Import to local dev KV
npm run import:routes routes.json --local

# Import from custom path
npm run import:routes /path/to/my-routes.json
```

### File Format

```json
{
  "routes": {
    "my-route": {
      "template": "https://example.com/product/{id}",
      "active": true
    },
    "another-route": {
      "template": "https://partner.com/{category}/{id}?ref={route}",
      "active": true
    }
  },
  "settings": {
    "fallback_url": "https://example.com/not-found",
    "cache_ttl": 604800,
    "route_param": "r"
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `routes` | Yes | Object of route ID → config |
| `routes.*.template` | Yes | Target URL with `{placeholders}` |
| `routes.*.active` | Yes | Enable/disable route |
| `settings` | No | Global settings (uses defaults if omitted) |

> **Note:** The script reads KV namespace ID from `wrangler.production.toml` or `wrangler.toml`.

## Deployment

### Cloudflare Workers

1. Create a KV namespace:
   ```bash
   npx wrangler kv namespace create ROUTES_KV
   ```

2. Copy the example production config and add your KV namespace ID:
   ```bash
   cp wrangler.production.toml.example wrangler.production.toml
   # Edit wrangler.production.toml and replace "your-production-kv-namespace-id" with your actual ID
   ```

   > **Note:** `wrangler.production.toml` is gitignored to keep your namespace ID private. The example file (`wrangler.production.toml.example`) serves as a template.

3. Set admin credentials:
   ```bash
   npx wrangler secret put ADMIN_USERNAME
   npx wrangler secret put ADMIN_PASSWORD
   ```

4. **(Optional) Pre-configure routes:**
   ```bash
   # Import routes from a JSON file (skips UI setup)
   npm run import:routes routes.json
   ```
   See [Bulk Import Routes](#bulk-import-routes) for file format.

5. Deploy:
   ```bash
   npm run deploy
   ```

6. **(Optional) Add custom domain:**
   - Go to Cloudflare Dashboard → Workers & Pages → gr8hopper
   - Settings → Triggers → Custom Domains
   - Add your domain (e.g., `go.yourdomain.com`)

### Docker (VPS)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist

# Create a non-root user and data directory
RUN addgroup -g 1001 -S nodejs && \
    adduser -S gr8hopper -u 1001 -G nodejs && \
    mkdir -p /app/data && \
    chown gr8hopper:nodejs /app/data

USER gr8hopper

# Set default environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV CONFIG_FILE=/app/data/routes.json

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Docker Compose (Recommended)

Create a `docker-compose.yml` in your root:

```yaml
services:
  gr8hopper:
    build:
      context: .
      dockerfile: examples/Dockerfile
    container_name: gr8hopper
    ports:
      - "3000:3000"
    environment:
      # Required - will fail if not provided via .env file or shell
      - ADMIN_USERNAME=${ADMIN_USERNAME:?ADMIN_USERNAME is required}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD:?ADMIN_PASSWORD is required}
      # Optional settings
      - ADMIN_PATH=${ADMIN_PATH:-admin}
      - CONFIG_FILE=/app/data/routes.json
      - PORT=3000
    volumes:
      # Use named volume to avoid permission issues with non-root user
      - gr8hopper-data:/app/data
    restart: unless-stopped
    healthcheck:
      test: [ "CMD", "node", "-e", "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))" ]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  gr8hopper-data:
```

> **Note:** Create a `.env` file with `ADMIN_USERNAME` and `ADMIN_PASSWORD` before running `docker compose up`. The compose file will fail if these are not set, preventing accidental deployment without credentials.

### Systemd (VPS)

Create an environment file at `/etc/gr8hopper/.env`:

```bash
# /etc/gr8hopper/.env
ADMIN_USERNAME=your-username
ADMIN_PASSWORD=your-secure-password
ADMIN_PATH=admin
```

Then create the systemd service:

```ini
[Unit]
Description=Gr8hopper
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/gr8hopper
ExecStart=/usr/bin/node dist/server.js
EnvironmentFile=/etc/gr8hopper/.env
Environment=PORT=3000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

**Setup:**
```bash
# Create environment file directory
sudo mkdir -p /etc/gr8hopper
sudo nano /etc/gr8hopper/.env
# Add your credentials, then save

# Secure the environment file
sudo chmod 600 /etc/gr8hopper/.env
sudo chown www-data:www-data /etc/gr8hopper/.env

# Enable and start the service
sudo systemctl enable gr8hopper
sudo systemctl start gr8hopper
```

### Nginx Reverse Proxy (VPS)

For HTTPS and custom domain on VPS, use Nginx as a reverse proxy:

```nginx
server {
    listen 443 ssl http2;
    server_name go.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/go.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/go.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name go.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## Security

- Admin endpoints require HTTP Basic Authentication
- All traffic should use HTTPS (Cloudflare enforces this; for VPS, use a reverse proxy)
- Route IDs are sanitized to lowercase alphanumeric + hyphens only
- Destination URLs enforced to use HTTPS
- Template URLs validated to block dangerous schemes (javascript:, data:, etc.)
- No user data is stored; the service is stateless
- XSS protection: All dynamic content uses safe DOM methods

See [SECURITY.md](SECURITY.md) for detailed security considerations and vulnerability reporting.

### Rate Limiting

Rate limiting is recommended for production deployments to prevent brute-force attacks on the admin panel.

**Cloudflare Workers:**

Use Cloudflare's built-in rate limiting (more efficient than application-level):

1. Go to Cloudflare Dashboard → Security → WAF → Rate limiting rules
2. Create a rule for your admin path:
   - **If**: URI Path contains `/admin`
   - **Then**: Block for 1 minute when rate exceeds 10 requests per minute per IP

**VPS (Nginx):**

Add rate limiting to your Nginx configuration:

```nginx
# Define rate limit zone (10 requests/minute for admin)
limit_req_zone $binary_remote_addr zone=admin:10m rate=10r/m;

server {
    # ... existing config ...

    location /admin {
        limit_req zone=admin burst=5 nodelay;
        proxy_pass http://127.0.0.1:3000;
        # ... other proxy settings ...
    }
}
```

## License

MIT License - see [LICENSE](LICENSE) for details.
