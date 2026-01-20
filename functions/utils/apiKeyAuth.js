/**
 * API Key Authentication Utility
 * Validates API keys and tracks usage
 */

/**
 * Validates an API key from the request
 * @param {Request} request - The incoming request
 * @param {Object} env - Environment bindings (DB, etc.)
 * @returns {Promise<Object>} - { valid: boolean, error?: string, keyInfo?: Object }
 */
export async function validateApiKey(request, env) {
  // Extract API key from header
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!apiKey) {
    return {
      valid: false,
      error: 'Missing API key. Provide X-API-Key header or Authorization: Bearer <key>'
    };
  }

  try {
    // Query the database for the API key
    const { results } = await env.DB.prepare(
      `SELECT id, key_name, created_by, expires_at, is_active, scopes, rate_limit
       FROM api_keys
       WHERE api_key = ?`
    ).bind(apiKey).all();

    if (results.length === 0) {
      return {
        valid: false,
        error: 'Invalid API key'
      };
    }

    const keyInfo = results[0];

    // Check if key is active
    if (keyInfo.is_active !== 1) {
      return {
        valid: false,
        error: 'API key has been deactivated'
      };
    }

    // Check expiration
    if (keyInfo.expires_at) {
      const expiresAt = new Date(keyInfo.expires_at);
      const now = new Date();
      if (now > expiresAt) {
        return {
          valid: false,
          error: 'API key has expired'
        };
      }
    }

    // Check rate limit (simple hourly check)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { results: usageResults } = await env.DB.prepare(
      `SELECT COUNT(*) as count
       FROM api_key_usage
       WHERE api_key_id = ? AND requested_at > ?`
    ).bind(keyInfo.id, oneHourAgo).all();

    if (usageResults[0].count >= keyInfo.rate_limit) {
      return {
        valid: false,
        error: 'Rate limit exceeded. Try again later.'
      };
    }

    // Update last_used_at
    await env.DB.prepare(
      'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(keyInfo.id).run();

    // Log usage
    const url = new URL(request.url);
    await env.DB.prepare(
      `INSERT INTO api_key_usage (api_key_id, endpoint, method, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(
      keyInfo.id,
      url.pathname,
      request.method,
      request.headers.get('CF-Connecting-IP') || 'unknown',
      request.headers.get('User-Agent') || 'unknown'
    ).run();

    return {
      valid: true,
      keyInfo: {
        id: keyInfo.id,
        name: keyInfo.key_name,
        createdBy: keyInfo.created_by,
        scopes: keyInfo.scopes ? JSON.parse(keyInfo.scopes) : []
      }
    };
  } catch (error) {
    console.error('API key validation error:', error);
    return {
      valid: false,
      error: 'Internal server error during authentication'
    };
  }
}

/**
 * Middleware wrapper for API key authentication
 * @param {Function} handler - The actual request handler
 * @returns {Function} - Wrapped handler with auth check
 */
export function requireApiKey(handler) {
  return async (context) => {
    const validation = await validateApiKey(context.request, context.env);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: validation.error
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer realm="API"'
          }
        }
      );
    }

    // Attach key info to context for use in handler
    context.apiKeyInfo = validation.keyInfo;

    // Call the actual handler
    return handler(context);
  };
}

/**
 * Generate a secure API key
 * @returns {string} - A secure random API key
 */
export function generateApiKey() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return 'mbv_' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
