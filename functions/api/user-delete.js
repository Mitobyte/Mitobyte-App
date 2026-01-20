/**
 * User Account Deletion API
 * DELETE /api/user-delete - Soft delete user account
 */

import { hashWallet } from '../utils/encryption.js';

export async function onRequestDelete(context) {
  const { env, request } = context;

  try {
    const { walletAddress } = await request.json();

    // Validate input
    if (!walletAddress) {
      return new Response(JSON.stringify({ error: 'Wallet address is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Hash wallet address to match database storage
    const walletHash = await hashWallet(walletAddress);

    // Find user by wallet address
    const userResult = await env.DB.prepare(`
      SELECT id, email FROM users
      WHERE wallet_hash = ? AND (account_status = 'active' OR account_status IS NULL)
    `).bind(walletHash).first();

    if (!userResult) {
      return new Response(JSON.stringify({ error: 'User not found or already deleted' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prevent admin users from deleting their accounts
    if (userResult.email && userResult.email.startsWith('carl@craftthefuture.xyz')) {
      return new Response(JSON.stringify({
        error: 'Admin accounts cannot be deleted',
        message: 'Administrator accounts are protected and cannot be deleted for security reasons.'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete all user-associated data
    // Note: Many tables have ON DELETE CASCADE, but we need to handle posts explicitly
    // since we're doing soft delete on the user account

    // 1. Delete all posts by this user (cascades to post_tags, post_likes, post_boosts, post_stats, post_mentions)
    await env.DB.prepare(`
      DELETE FROM posts WHERE user_email = ?
    `).bind(userResult.email).run();

    // 2. Delete all comments by this user (cascades to comment_votes)
    await env.DB.prepare(`
      DELETE FROM comments WHERE user_id = ?
    `).bind(userResult.id).run();

    // 3. Delete user follows (both as follower and following)
    await env.DB.prepare(`
      DELETE FROM user_follows WHERE follower_email = ? OR following_email = ?
    `).bind(userResult.email, userResult.email).run();

    // 4. Delete RSVPs and event-related data
    await env.DB.prepare(`
      DELETE FROM rsvps WHERE user_id = ?
    `).bind(userResult.id).run();

    // 5. Delete hackathon-related data if exists
    await env.DB.prepare(`
      DELETE FROM hackathon_ideas WHERE user_id = ?
    `).bind(userResult.id).run();

    await env.DB.prepare(`
      DELETE FROM idea_votes WHERE user_id = ?
    `).bind(userResult.id).run();

    // 6. Delete checkins
    await env.DB.prepare(`
      DELETE FROM checkins WHERE user_id = ?
    `).bind(userResult.id).run();

    // 7. Hide profile and mark as deleted
    await env.DB.prepare(`
      UPDATE user_profiles
      SET profile_visibility = 'private',
          updated_at = datetime('now')
      WHERE user_id = ?
    `).bind(userResult.id).run();

    // 8. Soft delete user account
    await env.DB.prepare(`
      UPDATE users
      SET account_status = 'deleted',
          deleted_at = datetime('now')
      WHERE id = ?
    `).bind(userResult.id).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Account and all associated data have been permanently deleted.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error deleting user account:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
