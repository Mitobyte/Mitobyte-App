/**
 * Cloudflare Pages Function: /api/auth/register
 * Handles user registration with JWT token generation
 */

import { encryptWallet, hashWallet } from '../../utils/encryption.js';
import { generateTokenPair } from '../../utils/jwt.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/auth/register - Create new user and return JWT tokens
 * Body: { walletAddress: string, email?: string, displayName?: string }
 */
export async function onRequestPost(context) {
  try {
    const { walletAddress, email, displayName } = await context.request.json();

    if (!walletAddress) {
      return jsonResponse({ error: 'walletAddress is required' }, 400);
    }

    // Check JWT secret is configured
    if (!context.env.JWT_SECRET) {
      console.error('JWT_SECRET not configured in environment');
      return jsonResponse(
        { error: 'Authentication system not configured' },
        500
      );
    }

    // Hash and encrypt wallet
    const walletHash = await hashWallet(walletAddress);
    const walletEncrypted = await encryptWallet(
      walletAddress,
      context.env.WALLET_ENCRYPTION_KEY
    );

    // Check if user already exists
    const existing = await context.env.DB.prepare(
      'SELECT id, email, is_admin, is_host, is_sponsor FROM users WHERE wallet_hash = ?'
    )
      .bind(walletHash)
      .first();

    if (existing) {
      // User exists - generate tokens and return
      const tokens = await generateTokenPair(
        {
          userId: existing.id,
          email: existing.email,
          walletHash: walletHash,
          isAdmin: existing.is_admin === 1,
          isHost: existing.is_host === 1,
          isSponsor: existing.is_sponsor === 1,
        },
        context.env.JWT_SECRET
      );

      return jsonResponse({
        success: true,
        message: 'User already exists - logged in',
        user: {
          id: existing.id,
          email: existing.email,
          isAdmin: existing.is_admin === 1,
          isHost: existing.is_host === 1,
          isSponsor: existing.is_sponsor === 1,
        },
        ...tokens,
      });
    }

    // Insert new user
    const result = await context.env.DB.prepare(
      'INSERT INTO users (wallet_hash, wallet_encrypted, email, display_name) VALUES (?, ?, ?, ?)'
    )
      .bind(walletHash, walletEncrypted, email || null, displayName || null)
      .run();

    const userId = result.meta.last_row_id;

    // Generate JWT tokens for new user
    const tokens = await generateTokenPair(
      {
        userId: userId,
        email: email,
        walletHash: walletHash,
        isAdmin: false,
        isHost: false,
        isSponsor: false,
      },
      context.env.JWT_SECRET
    );

    return jsonResponse(
      {
        success: true,
        user: {
          id: userId,
          email: email,
          displayName: displayName,
          isAdmin: false,
          isHost: false,
          isSponsor: false,
        },
        ...tokens,
      },
      201
    );
  } catch (error) {
    console.error('Register error:', error);
    return jsonResponse(
      { error: 'Failed to create user', details: error.message },
      500
    );
  }
}
