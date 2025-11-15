/**
 * Cloudflare Pages Function: /api/auth/verify
 * Verifies JWT token and returns user info
 */

import { requireAuth } from '../../utils/auth.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/auth/verify - Verify current JWT token
 * Headers: Authorization: Bearer <token>
 */
export async function onRequestGet(context) {
  try {
    if (!context.env.JWT_SECRET) {
      return jsonResponse(
        { error: 'Authentication system not configured' },
        500
      );
    }

    // Verify token and get user data
    const user = await requireAuth(context.request, context.env.JWT_SECRET);

    // Fetch additional user details from database
    const dbUser = await context.env.DB.prepare(
      `SELECT id, email, display_name, created_at, is_admin, is_host, is_sponsor
       FROM users
       WHERE id = ? AND (account_status IS NULL OR account_status = 'active')`
    )
      .bind(user.userId)
      .first();

    if (!dbUser) {
      return jsonResponse(
        { error: 'User not found or account disabled' },
        404
      );
    }

    return jsonResponse({
      valid: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        displayName: dbUser.display_name,
        createdAt: dbUser.created_at,
        isAdmin: dbUser.is_admin === 1,
        isHost: dbUser.is_host === 1,
        isSponsor: dbUser.is_sponsor === 1,
      },
    });
  } catch (error) {
    return jsonResponse(
      {
        valid: false,
        error: error.message,
      },
      401
    );
  }
}
