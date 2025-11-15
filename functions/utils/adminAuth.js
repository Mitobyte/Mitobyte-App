/**
 * Admin Authorization Utility
 * Handles admin validation using JWT tokens
 */

import { requireAuth } from './auth.js';

/**
 * Check if user has admin privileges
 * @param {Object} user - User object from JWT token
 * @returns {boolean} True if user is admin
 */
export function isAdmin(user) {
  if (!user || typeof user !== 'object') {
    return false;
  }

  // Bootstrap admin - always allow
  if (user.email && user.email.startsWith('carl@craftthefuture.xyz')) {
    return true;
  }

  // Check admin flag from token
  return user.isAdmin === true;
}

/**
 * Validate admin authorization from JWT token
 * Returns user data if authorized admin, throws error if not
 *
 * @param {Request} request - HTTP request object
 * @param {string} jwtSecret - JWT secret from environment
 * @returns {Promise<Object>} Admin user data
 * @throws {Error} If not authorized
 */
export async function requireAdmin(request, jwtSecret) {
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  // Verify JWT token and get user data
  let user;
  try {
    user = await requireAuth(request, jwtSecret);
  } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }

  // Check if user has admin privileges
  if (!isAdmin(user)) {
    throw new Error('Unauthorized: Admin access required');
  }

  return user;
}

/**
 * LEGACY: Extract email from Authorization header (DEPRECATED - INSECURE)
 * @deprecated Use requireAdmin with JWT instead
 * @param {Request} request - HTTP request object
 * @returns {string|null} Email or null if not found
 */
export function getEmailFromRequest(request) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return null;
  }

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
}

/**
 * Create standardized JSON error response
 *
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @returns {Response} JSON error response
 */
export function errorResponse(message, status = 400) {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': status === 401 ? 'Bearer realm="Admin API"' : undefined,
      },
    }
  );
}
