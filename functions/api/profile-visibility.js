/**
 * Profile Visibility API
 * PATCH /api/profile-visibility - Toggle profile visibility (public/private)
 */

import { hashWallet } from '../utils/encryption.js';

export async function onRequestPatch(context) {
  const { env, request } = context;

  try {
    const { walletAddress, visibility } = await request.json();

    // Validate inputs
    if (!walletAddress) {
      return new Response(JSON.stringify({ error: 'Wallet address is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!['public', 'private'].includes(visibility)) {
      return new Response(JSON.stringify({ error: 'Visibility must be "public" or "private"' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Hash wallet address to match database storage
    const walletHash = await hashWallet(walletAddress);

    // Find user by wallet address
    const userResult = await env.DB.prepare(`
      SELECT id FROM users
      WHERE wallet_hash = ? AND (account_status = 'active' OR account_status IS NULL)
    `).bind(walletHash).first();

    if (!userResult) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update profile visibility
    await env.DB.prepare(`
      UPDATE user_profiles
      SET profile_visibility = ?,
          updated_at = datetime('now')
      WHERE user_id = ?
    `).bind(visibility, userResult.id).run();

    return new Response(JSON.stringify({
      success: true,
      visibility,
      message: `Profile is now ${visibility}`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error updating profile visibility:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
