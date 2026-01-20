/**
 * Cloudflare Pages Function: /api/users/:wallet
 * Handles get, update, delete for specific users
 */

import { decryptWallet, hashWallet } from '../../utils/encryption.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/users/:wallet - Get user by wallet address
 */
export async function onRequestGet(context) {
  try {
    const walletAddress = decodeURIComponent(context.params.wallet);
    const walletHash = await hashWallet(walletAddress);

    const user = await context.env.DB.prepare(
      'SELECT id, wallet_encrypted, email, display_name, created_at, is_admin, is_host, is_sponsor FROM users WHERE wallet_hash = ?'
    )
      .bind(walletHash)
      .first();

    if (!user) {
      return jsonResponse({ error: 'User not found' }, 404);
    }

    // Decrypt wallet for response
    const decryptedWallet = await decryptWallet(
      user.wallet_encrypted,
      context.env.WALLET_ENCRYPTION_KEY
    );

    return jsonResponse({
      id: user.id,
      walletAddress: decryptedWallet,
      email: user.email,
      displayName: user.display_name,
      createdAt: user.created_at,
      is_admin: user.is_admin,
      is_host: user.is_host,
      is_sponsor: user.is_sponsor,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return jsonResponse({ error: 'Failed to retrieve user' }, 500);
  }
}

/**
 * PUT /api/users/:wallet - Update user profile
 */
export async function onRequestPut(context) {
  try {
    const walletAddress = decodeURIComponent(context.params.wallet);
    const { email, displayName } = await context.request.json();
    const walletHash = await hashWallet(walletAddress);

    // Check if user exists
    const user = await context.env.DB.prepare(
      'SELECT id FROM users WHERE wallet_hash = ?'
    )
      .bind(walletHash)
      .first();

    if (!user) {
      return jsonResponse({ error: 'User not found' }, 404);
    }

    // Build update query
    const updates = [];
    const values = [];

    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (displayName !== undefined) {
      updates.push('display_name = ?');
      values.push(displayName);
    }

    if (updates.length === 0) {
      return jsonResponse({ error: 'No fields to update' }, 400);
    }

    values.push(walletHash);

    await context.env.DB.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE wallet_hash = ?`
    )
      .bind(...values)
      .run();

    return jsonResponse({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    return jsonResponse({ error: 'Failed to update user' }, 500);
  }
}

/**
 * DELETE /api/users/:wallet - Delete user
 */
export async function onRequestDelete(context) {
  try {
    const walletAddress = decodeURIComponent(context.params.wallet);
    const walletHash = await hashWallet(walletAddress);

    const result = await context.env.DB.prepare(
      'DELETE FROM users WHERE wallet_hash = ?'
    )
      .bind(walletHash)
      .run();

    if (result.meta.changes === 0) {
      return jsonResponse({ error: 'User not found' }, 404);
    }

    return jsonResponse({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return jsonResponse({ error: 'Failed to delete user' }, 500);
  }
}
