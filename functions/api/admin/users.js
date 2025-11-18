/**
 * Cloudflare Pages Function: /api/admin/users
 * Admin endpoint to retrieve all users
 * Requires admin authorization (email starting with carl@craftthefuture.xyz)
 */

import { requireAdmin, errorResponse } from '../../utils/adminAuth.js';

/**
 * Create JSON response
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/admin/users - Retrieve all users (admin only)
 */
export async function onRequestGet(context) {
  try {
    // Check if DB binding exists
    if (!context.env.DB) {
      console.error('Database binding (DB) not found in environment');
      return errorResponse('Database not configured', 500);
    }

    // Check if JWT_SECRET exists
    if (!context.env.JWT_SECRET) {
      console.error('JWT_SECRET not found in environment');
      return errorResponse('Authentication not configured', 500);
    }

    // Verify admin authorization using JWT
    const adminUser = await requireAdmin(context.request, context.env.JWT_SECRET);

    // Query all users from database
    // Note: We exclude wallet_encrypted and wallet_hash for security, but include is_admin, is_host, is_sponsor, and is_suspended
    const result = await context.env.DB.prepare(
      'SELECT id, email, display_name, created_at, is_admin, is_host, is_sponsor, is_suspended, CASE WHEN wallet_hash IS NOT NULL THEN 1 ELSE 0 END as has_wallet FROM users ORDER BY created_at DESC'
    ).all();

    // Handle empty results
    const users = result.results || [];
    const total = users.length;

    // Count users created today
    const today = new Date().toISOString().split('T')[0];
    const createdToday = users.filter(user => {
      return user.created_at && user.created_at.startsWith(today);
    }).length;

    // Count users with wallets (active users)
    const activeUsers = users.filter(user => user.has_wallet).length;

    return jsonResponse({
      users,
      total,
      stats: {
        total,
        createdToday,
        activeUsers,
      },
      admin_email: adminUser.email,
    });
  } catch (error) {
    console.error('Admin users fetch error:', error);
    console.error('Error stack:', error.stack);

    // Handle authorization errors
    if (error.message.includes('Authorization') || error.message.includes('Unauthorized')) {
      return errorResponse(error.message, 403);
    }

    // Return detailed error in development/testing
    return errorResponse(`Failed to fetch users: ${error.message}`, 500);
  }
}
