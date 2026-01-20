/**
 * Cloudflare Pages Function: /api/users
 * Handles user creation
 */

import { encryptWallet, hashWallet } from '../utils/encryption.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/users - Create new user
 */
export async function onRequestPost(context) {
  try {
    const { walletAddress, email, displayName } = await context.request.json();

    if (!walletAddress) {
      return jsonResponse({ error: 'walletAddress is required' }, 400);
    }

    // Hash and encrypt wallet
    const walletHash = await hashWallet(walletAddress);
    const walletEncrypted = await encryptWallet(
      walletAddress,
      context.env.WALLET_ENCRYPTION_KEY
    );

    // Check if user already exists
    const existing = await context.env.DB.prepare(
      'SELECT id FROM users WHERE wallet_hash = ?'
    )
      .bind(walletHash)
      .first();

    if (existing) {
      return jsonResponse({ error: 'User already exists' }, 409);
    }

    // Insert user
    const result = await context.env.DB.prepare(
      'INSERT INTO users (wallet_hash, wallet_encrypted, email, display_name) VALUES (?, ?, ?, ?)'
    )
      .bind(walletHash, walletEncrypted, email || null, displayName || null)
      .run();

    return jsonResponse(
      {
        id: result.meta.last_row_id,
        walletAddress,
        email,
        displayName,
        createdAt: new Date().toISOString(),
        is_admin: 0,
        is_host: 0,
      },
      201
    );
  } catch (error) {
    console.error('Create user error:', error);
    return jsonResponse({ error: 'Failed to create user' }, 500);
  }
}
