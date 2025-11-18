/**
 * Cloudflare Pages Function: /api/admin/users/[id]/promote
 * Promote a user to admin status
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
 * POST /api/admin/users/[id]/promote - Promote user to admin
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

    // Check if user is already an admin
    if (user.is_admin === 1) {
      return errorResponse('User is already an admin', 400);
    }

    // Promote user to admin
    await context.env.DB
      .prepare('UPDATE users SET is_admin = 1 WHERE id = ?')
      .bind(userId)
      .run();

    console.log(`User ${userId} (${user.email}) promoted to admin by ${adminUser.email}`);

    return jsonResponse({
      success: true,
      message: 'User promoted to admin successfully',
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        is_admin: 1,
      },
    });
  } catch (error) {
    console.error('Admin promote error:', error);
    console.error('Error stack:', error.stack);

    // Handle authorization errors
    if (error.message.includes('Authorization') || error.message.includes('Unauthorized')) {
      return errorResponse(error.message, 403);
    }

    return errorResponse(`Failed to promote user: ${error.message}`, 500);
  }
}
