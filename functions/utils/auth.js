/**
 * Authentication utilities for API endpoints
 */

import { requireValidToken } from './jwt.js';

/**
 * Extract and validate user from JWT token
 * @param {Request} request - The incoming request
 * @param {string} jwtSecret - JWT secret from environment
 * @returns {Promise<Object>} The authenticated user data from token
 * @throws {Error} If authentication fails
 */
export async function requireAuth(request, jwtSecret) {
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  try {
    const payload = await requireValidToken(request, jwtSecret);

    // Return user data from token
    return {
      userId: payload.userId,
      email: payload.email,
      walletHash: payload.walletHash,
      isAdmin: payload.isAdmin || false,
      isHost: payload.isHost || false,
      isSponsor: payload.isSponsor || false,
    };
  } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

/**
 * LEGACY: Extract email from Authorization header (DEPRECATED - INSECURE)
 * @deprecated Use requireAuth instead
 * This function is kept temporarily for backward compatibility during migration
 * @param {Request} request - The incoming request
 * @returns {string} The email from header (UNVERIFIED - DO NOT USE FOR AUTH)
 */
export function extractEmailLegacy(request) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  const email = authHeader.substring(7);

  if (!email || !email.includes('@')) {
    throw new Error('Invalid email in Authorization header');
  }

  return email;
}

/**
 * Create a JSON error response
 */
export function errorResponse(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * Create a JSON success response
 */
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
