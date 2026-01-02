# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in Gr8hopper, please report it responsibly:

1. **Do not** open a public issue
2. Email the maintainers directly with:
   - A description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (optional)

We will acknowledge receipt within 48 hours and provide a timeline for addressing the issue.

## Security Considerations

### Authentication

- **HTTPS Required**: Always deploy behind HTTPS. HTTP Basic Auth credentials are sent as base64-encoded text and are vulnerable to interception over unencrypted connections.
- **Change Default Password**: The default password `changeme` should **never** be used in production. Set a strong, unique password via the `ADMIN_PASSWORD` environment variable.
- **Hide Admin Path**: Consider changing the default admin path (`/admin`) to something unique via the `ADMIN_PATH` environment variable.

### Open Redirect Nature

By design, Gr8hopper redirects users to URLs configured in route templates. This is intentional functionality but could be abused for phishing if:

1. An attacker gains access to the admin panel
2. Route templates are modified to point to malicious sites

**Mitigations:**
- Use strong admin credentials
- Restrict access to the admin panel (e.g., via IP allowlist at the proxy/CDN level)
- Monitor for unexpected route changes
- Consider adding domain allowlists for template URLs in security-critical deployments

### Data Storage

#### Cloudflare Workers (KV)
- Data is stored in Cloudflare KV, encrypted at rest
- Access is controlled via Cloudflare account permissions
- No local file system exposure

#### VPS (JSON File)
- Routes are stored in a local JSON file
- Set restrictive file permissions: `chmod 600 routes.json`
- Ensure the file is not web-accessible
- Back up the file regularly

### Input Validation

- Route IDs are sanitized to alphanumeric characters and hyphens only
- Template URLs are validated to prevent `javascript:`, `data:`, and other dangerous schemes
- Query parameters are URL-encoded in redirects

### Cache Security

- Redirects are cached aggressively (301 with long TTL)
- Cache invalidation requires CDN purge for Cloudflare deployments
- Browser caches cannot be remotely invalidated once a redirect is cached

If a redirect destination is compromised:
1. Update the route in the admin panel
2. Purge the CDN cache (Cloudflare Dashboard > Caching > Purge)
3. Note: Users with cached redirects will continue using the old destination until their cache expires

### Security Headers

For production VPS deployments, configure your reverse proxy (nginx, Caddy) to add security headers:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer" always;
```

**Note:** The `Strict-Transport-Security` (HSTS) header ensures browsers always use HTTPS, preventing protocol downgrade attacks.

For Cloudflare Workers, add security headers via Transform Rules in the Cloudflare Dashboard, or directly in your Worker code using Hono middleware.

## Security Changelog

### v1.1.0
- Runtime URL scheme validation in redirect handler (blocks javascript:, data:, vbscript:, file:, about:, blob:, filesystem:)
- Improved domain detection heuristic to prevent treating filenames as domains
- Settings rollback protection during import operations
- Route ID collision detection to prevent silent overwrites

### v1.0.0
- Timing-safe password comparison to prevent timing attacks
- URL scheme validation for template URLs (blocks javascript:, data:, etc.)
- Control character sanitization to prevent null byte injection bypasses
- URL length limits (2048 chars) to prevent abuse
- Protocol-relative URL blocking for defense in depth
- Error handling improvements to prevent information leakage
- XSS prevention using safe DOM methods in admin UI
