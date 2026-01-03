import type { Context, Next } from 'hono'

export interface AuthConfig {
  username: string
  password: string
}

/**
 * Constant-time string comparison to prevent timing attacks
 * Works in both Node.js and Cloudflare Workers environments
 */
function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a)
  const bBytes = new TextEncoder().encode(b)

  // Use bitwise XOR for length check to avoid data-dependent branching
  let result = aBytes.length ^ bBytes.length

  // Pad to same length to prevent timing leaks from length differences
  const maxLength = Math.max(aBytes.length, bBytes.length)
  const aPadded = new Uint8Array(maxLength)
  const bPadded = new Uint8Array(maxLength)

  aPadded.set(aBytes)
  bPadded.set(bBytes)

  // XOR all bytes - this takes constant time regardless of content
  for (let i = 0; i < maxLength; i++) {
    result |= aPadded[i] ^ bPadded[i]
  }

  return result === 0
}

/**
 * Basic auth middleware for admin routes
 */
export function basicAuth(
  config: AuthConfig
): (c: Context, next: Next) => Promise<Response | void> {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return unauthorizedResponse()
    }

    const base64Credentials = authHeader.slice(6)
    let credentials: string

    try {
      // Handle both browser and Node.js environments
      if (typeof atob === 'function') {
        credentials = atob(base64Credentials)
      } else {
        credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8')
      }
    } catch {
      return unauthorizedResponse()
    }

    const [username, password] = credentials.split(':')

    // Use timing-safe comparison to prevent timing attacks
    const usernameMatch = timingSafeEqual(username, config.username)
    const passwordMatch = timingSafeEqual(password, config.password)

    if (!usernameMatch || !passwordMatch) {
      return unauthorizedResponse()
    }

    await next()
  }
}

function unauthorizedResponse(): Response {
  return new Response('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Admin"'
    }
  })
}
