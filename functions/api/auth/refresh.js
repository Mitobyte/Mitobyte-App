/**
 * Cloudflare Pages Function: /api/auth/refresh
 * Refreshes access token using refresh token
 */

import { verifyToken, generateAccessToken } from '../../utils/jwt.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/auth/refresh - Refresh access token
 * Body: { refreshToken: string }
 */
export async function onRequestPost(context) {
  try {
    const { refreshToken } = await context.request.json();

    if (!refreshToken) {
      return jsonResponse({ error: 'refreshToken required' }, 400);
    }

    if (!context.env.JWT_SECRET) {
      return jsonResponse(
        { error: 'Authentication system not configured' },
        500
      );
    }

    // Verify refresh token
    let payload;
    try {
      payload = await verifyToken(refreshToken, context.env.JWT_SECRET);
    } catch (error) {
      return jsonResponse(
        { error: 'Invalid or expired refresh token' },
        401
      );
    }

    // Ensure this is actually a refresh token
    if (payload.type !== 'refresh') {
      return jsonResponse(
        { error: 'Invalid token type' },
        401
      );
    }

    // Fetch fresh user data from database
    const user = await context.env.DB.prepare(
      `SELECT id, email, display_name, is_admin, is_host, is_sponsor, wallet_hash
       FROM users
       WHERE id = ? AND (account_status IS NULL OR account_status = 'active')`
    )
      .bind(payload.userId)
      .first();

    if (!user) {
      return jsonResponse(
        { error: 'User not found or account disabled' },
        404
      );
    }

    // Generate new access token with fresh data
    const accessToken = await generateAccessToken(
      {
        userId: user.id,
        email: user.email,
        walletHash: user.wallet_hash,
        isAdmin: user.is_admin === 1,
        isHost: user.is_host === 1,
        isSponsor: user.is_sponsor === 1,
      },
      context.env.JWT_SECRET
    );

    return jsonResponse({
      success: true,
      accessToken,
      expiresIn: 86400, // 24 hours
      tokenType: 'Bearer',
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return jsonResponse(
      { error: 'Failed to refresh token', details: error.message },
      500
    );
  }
}
