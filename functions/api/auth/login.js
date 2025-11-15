/**
 * Cloudflare Pages Function: /api/auth/login
 * Handles user authentication and JWT token generation
 */

import { hashWallet } from '../../utils/encryption.js';
import { generateTokenPair } from '../../utils/jwt.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/auth/login - Authenticate user and generate JWT tokens
 * Body: { walletAddress: string } or { email: string }
 */
export async function onRequestPost(context) {
  try {
    const { walletAddress, email } = await context.request.json();

    if (!walletAddress && !email) {
      return jsonResponse(
        { error: 'walletAddress or email required' },
        400
      );
    }

    // Check JWT secret is configured
    if (!context.env.JWT_SECRET) {
      console.error('JWT_SECRET not configured in environment');
      return jsonResponse(
        { error: 'Authentication system not configured' },
        500
      );
    }

    let user;

    // Authenticate by wallet address
    if (walletAddress) {
      const walletHash = await hashWallet(walletAddress);

      user = await context.env.DB.prepare(
        `SELECT id, email, display_name, is_admin, is_host, is_sponsor, wallet_hash
         FROM users
         WHERE wallet_hash = ? AND (account_status IS NULL OR account_status = 'active')`
      )
        .bind(walletHash)
        .first();

      if (!user) {
        return jsonResponse(
          { error: 'User not found. Please register first.' },
          404
        );
      }
    }
    // Authenticate by email
    else if (email) {
      user = await context.env.DB.prepare(
        `SELECT id, email, display_name, is_admin, is_host, is_sponsor, wallet_hash
         FROM users
         WHERE email = ? AND (account_status IS NULL OR account_status = 'active')`
      )
        .bind(email)
        .first();

      if (!user) {
        return jsonResponse(
          { error: 'User not found with this email' },
          404
        );
      }
    }

    // Update last login timestamp
    await context.env.DB.prepare(
      'UPDATE users SET updated_at = datetime("now") WHERE id = ?'
    )
      .bind(user.id)
      .run();

    // Generate JWT tokens
    const tokens = await generateTokenPair(
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
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        isAdmin: user.is_admin === 1,
        isHost: user.is_host === 1,
        isSponsor: user.is_sponsor === 1,
      },
      ...tokens,
    });
  } catch (error) {
    console.error('Login error:', error);
    return jsonResponse(
      { error: 'Authentication failed', details: error.message },
      500
    );
  }
}
