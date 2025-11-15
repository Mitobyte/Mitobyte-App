/**
 * Cloudflare Pages Function: /api/invites/:code
 * Handles individual invite code operations
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

/**
 * Check if user is admin
 */
async function isAdmin(email, db) {
  if (!email) return false;

  try {
    const { results } = await db.prepare(
      'SELECT is_admin FROM users WHERE email = ?'
    )
      .bind(email)
      .all();

    return results.length > 0 && results[0].is_admin === 1;
  } catch (error) {
    console.error('Admin check error:', error);
    return false;
  }
}

/**
 * GET /api/invites/:code - Validate invite code (public)
 */
export async function onRequestGet(context) {
  try {
    const code = context.params.code;

    const { results } = await context.env.DB.prepare(`
      SELECT * FROM invite_codes WHERE code = ?
    `)
      .bind(code)
      .all();

    if (results.length === 0) {
      return jsonResponse({
        valid: false,
        error: 'Invite code not found'
      }, 404);
    }

    const invite = results[0];

    // Check if active
    if (!invite.is_active) {
      return jsonResponse({
        valid: false,
        error: 'This invite code has been deactivated'
      });
    }

    // Check expiration
    if (invite.expires_at) {
      const expirationDate = new Date(invite.expires_at);
      if (expirationDate < new Date()) {
        return jsonResponse({
          valid: false,
          error: 'This invite code has expired'
        });
      }
    }

    // Check usage limit
    if (invite.uses_remaining !== null && invite.uses_remaining <= 0) {
      return jsonResponse({
        valid: false,
        error: 'This invite code has reached its usage limit'
      });
    }

    return jsonResponse({
      valid: true,
      invite: {
        code: invite.code,
        description: invite.notes,
        usesRemaining: invite.uses_remaining
      }
    });

  } catch (error) {
    console.error('Validate invite error:', error);
    return jsonResponse({
      error: 'Failed to validate invite code',
      details: error.message,
      hint: 'Make sure the database migration has been run to create the invite_codes table'
    }, 500);
  }
}

/**
 * POST /api/invites/:code/redeem - Redeem invite code
 */
export async function onRequestPost(context) {
  try {
    const code = context.params.code;
    const { userEmail, userWallet } = await context.request.json();

    // Get invite code
    const { results } = await context.env.DB.prepare(
      'SELECT * FROM invite_codes WHERE code = ?'
    )
      .bind(code)
      .all();

    if (results.length === 0) {
      return jsonResponse({ error: 'Invite code not found' }, 404);
    }

    const invite = results[0];

    // Validate invite (same checks as GET)
    if (!invite.is_active) {
      return jsonResponse({ error: 'This invite code has been deactivated' }, 400);
    }

    if (invite.expires_at) {
      const expirationDate = new Date(invite.expires_at);
      if (expirationDate < new Date()) {
        return jsonResponse({ error: 'This invite code has expired' }, 400);
      }
    }

    if (invite.uses_remaining !== null && invite.uses_remaining <= 0) {
      return jsonResponse({ error: 'This invite code has reached its usage limit' }, 400);
    }

    // Check if user already redeemed this code
    const identifier = userWallet || userEmail;
    if (identifier) {
      const { results: redemptions } = await context.env.DB.prepare(
        'SELECT id FROM invite_code_uses WHERE invite_code_id = ? AND wallet_address = ?'
      )
        .bind(invite.id, identifier)
        .all();

      if (redemptions.length > 0) {
        return jsonResponse({ error: 'You have already used this invite code' }, 400);
      }
    }

    // Record redemption
    await context.env.DB.prepare(
      `INSERT INTO invite_code_uses (invite_code_id, wallet_address)
       VALUES (?, ?)`
    )
      .bind(invite.id, identifier || 'anonymous')
      .run();

    // Update usage counters (handle NULL for unlimited invites)
    await context.env.DB.prepare(
      `UPDATE invite_codes
       SET uses_remaining = CASE
                              WHEN uses_remaining IS NULL THEN NULL
                              ELSE uses_remaining - 1
                            END,
           total_uses = total_uses + 1
       WHERE id = ?`
    )
      .bind(invite.id)
      .run();

    // Grant user access (you can customize this based on your auth system)
    // For now, we'll just record the redemption
    // You might want to update the user's role or permissions here

    return jsonResponse({
      success: true,
      message: 'Invite code redeemed successfully!',
      welcomeMessage: invite.notes || 'Welcome to Mitobyte!'
    });

  } catch (error) {
    console.error('Redeem invite error:', error);
    return jsonResponse({
      error: 'Failed to redeem invite code',
      details: error.message
    }, 500);
  }
}

/**
 * DELETE /api/invites/:code - Deactivate invite code (Admin only)
 */
export async function onRequestDelete(context) {
  try {
    const code = context.params.code;
    const url = new URL(context.request.url);
    const adminEmail = url.searchParams.get('adminEmail');

    // Verify admin access
    const isAdminUser = await isAdmin(adminEmail, context.env.DB);
    if (!isAdminUser) {
      return jsonResponse({ error: 'Unauthorized. Admin access required.' }, 403);
    }

    // Deactivate invite code
    const result = await context.env.DB.prepare(
      'UPDATE invite_codes SET is_active = 0 WHERE code = ?'
    )
      .bind(code)
      .run();

    if (result.meta.changes === 0) {
      return jsonResponse({ error: 'Invite code not found' }, 404);
    }

    return jsonResponse({
      success: true,
      message: 'Invite code deactivated'
    });

  } catch (error) {
    console.error('Delete invite error:', error);
    return jsonResponse({
      error: 'Failed to deactivate invite code',
      details: error.message
    }, 500);
  }
}

/**
 * OPTIONS /api/invites/:code - CORS preflight
 */
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
