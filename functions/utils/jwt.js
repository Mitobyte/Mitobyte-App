/**
 * JWT Authentication Utility
 * Handles JWT token generation and validation using jose library
 */

import * as jose from 'jose';

/**
 * Token configuration
 */
const TOKEN_EXPIRY = '24h'; // Access token expires in 24 hours
const REFRESH_TOKEN_EXPIRY = '30d'; // Refresh token expires in 30 days
const TOKEN_ISSUER = 'mitobyte-voting';
const TOKEN_AUDIENCE = 'mitobyte-app';

/**
 * Get JWT secret as Uint8Array
 * @param {string} secret - Base64 or hex encoded secret from environment
 * @returns {Uint8Array}
 */
function getSecretKey(secret) {
  if (!secret) {
    throw new Error('JWT_SECRET not configured in environment');
  }

  // Convert hex string to Uint8Array
  // Expected format: 64-character hex string (32 bytes)
  if (secret.length === 64) {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(secret.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  // Fallback: use TextEncoder for string secrets (less secure)
  const encoder = new TextEncoder();
  return encoder.encode(secret);
}

/**
 * Generate a JWT access token for a user
 * @param {Object} payload - User data to encode in token
 * @param {string} payload.userId - User ID
 * @param {string} payload.email - User email
 * @param {string} payload.walletHash - User wallet hash (for verification)
 * @param {boolean} payload.isAdmin - Admin status
 * @param {boolean} payload.isHost - Host status
 * @param {boolean} payload.isSponsor - Sponsor status
 * @param {string} jwtSecret - JWT secret key
 * @returns {Promise<string>} JWT token
 */
export async function generateAccessToken(payload, jwtSecret) {
  const secretKey = getSecretKey(jwtSecret);

  const token = await new jose.SignJWT({
    userId: payload.userId,
    email: payload.email,
    walletHash: payload.walletHash,
    isAdmin: payload.isAdmin || false,
    isHost: payload.isHost || false,
    isSponsor: payload.isSponsor || false,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secretKey);

  return token;
}

/**
 * Generate a refresh token for long-term authentication
 * @param {Object} payload - Minimal user data
 * @param {string} payload.userId - User ID
 * @param {string} payload.email - User email
 * @param {string} jwtSecret - JWT secret key
 * @returns {Promise<string>} Refresh token
 */
export async function generateRefreshToken(payload, jwtSecret) {
  const secretKey = getSecretKey(jwtSecret);

  const token = await new jose.SignJWT({
    userId: payload.userId,
    email: payload.email,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(secretKey);

  return token;
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @param {string} jwtSecret - JWT secret key
 * @returns {Promise<Object>} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export async function verifyToken(token, jwtSecret) {
  const secretKey = getSecretKey(jwtSecret);

  try {
    const { payload } = await jose.jwtVerify(token, secretKey, {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    });

    return payload;
  } catch (error) {
    // Provide specific error messages
    if (error.code === 'ERR_JWT_EXPIRED') {
      throw new Error('Token has expired');
    }
    if (error.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
      throw new Error('Invalid token signature');
    }
    if (error.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED') {
      throw new Error('Token claim validation failed');
    }

    throw new Error('Invalid token');
  }
}

/**
 * Extract token from Authorization header
 * @param {Request} request - HTTP request
 * @returns {string|null} Token or null if not found
 */
export function extractToken(request) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return null;
  }

  // Support "Bearer <token>" format
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Support plain token
  return authHeader;
}

/**
 * Verify token and return user data
 * @param {Request} request - HTTP request
 * @param {string} jwtSecret - JWT secret key
 * @returns {Promise<Object>} User data from token
 * @throws {Error} If token is missing or invalid
 */
export async function requireValidToken(request, jwtSecret) {
  const token = extractToken(request);

  if (!token) {
    throw new Error('Missing authentication token');
  }

  const payload = await verifyToken(token, jwtSecret);

  // Ensure token is not a refresh token being used as access token
  if (payload.type === 'refresh') {
    throw new Error('Cannot use refresh token for API access');
  }

  return payload;
}

/**
 * Generate both access and refresh tokens
 * @param {Object} userData - User data for token generation
 * @param {string} jwtSecret - JWT secret key
 * @returns {Promise<Object>} { accessToken, refreshToken }
 */
export async function generateTokenPair(userData, jwtSecret) {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(userData, jwtSecret),
    generateRefreshToken(
      {
        userId: userData.userId,
        email: userData.email,
      },
      jwtSecret
    ),
  ]);

  return {
    accessToken,
    refreshToken,
    expiresIn: 86400, // 24 hours in seconds
    tokenType: 'Bearer',
  };
}
