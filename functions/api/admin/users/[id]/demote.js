/**
 * Cloudflare Pages Function: /api/admin/users/[id]/demote
 * Demote a user from admin status
 * Requires admin authorization
 */

import { requireAdmin, errorResponse } from '../../../../utils/adminAuth.js';

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
 * POST /api/admin/users/[id]/demote - Demote user from admin
 */
export async function onRequestPost(context) {
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

    // Get user ID from URL params
    const userId = context.params.id;
    if (!userId || isNaN(parseInt(userId))) {
      return errorResponse('Invalid user ID', 400);
    }

    // Check if user exists
    const user = await context.env.DB
      .prepare('SELECT id, email, display_name, is_admin FROM users WHERE id = ?')
      .bind(userId)
      .first();

    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Check if user is not an admin
    if (user.is_admin !== 1) {
      return errorResponse('User is not an admin', 400);
    }

    // Prevent demotion of bootstrap admin
    if (user.email && user.email.startsWith('carl@craftthefuture.xyz')) {
      return errorResponse('Cannot demote bootstrap admin', 403);
    }

    // Demote user from admin
    await context.env.DB
      .prepare('UPDATE users SET is_admin = 0 WHERE id = ?')
      .bind(userId)
      .run();

    console.log(`User ${userId} (${user.email}) demoted from admin by ${adminUser.email}`);

    return jsonResponse({
      success: true,
      message: 'User demoted from admin successfully',
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        is_admin: 0,
      },
    });
  } catch (error) {
    console.error('Admin demote error:', error);
    console.error('Error stack:', error.stack);

    // Handle authorization errors
    if (error.message.includes('Authorization') || error.message.includes('Unauthorized')) {
      return errorResponse(error.message, 403);
    }

    return errorResponse(`Failed to demote user: ${error.message}`, 500);
  }
}
