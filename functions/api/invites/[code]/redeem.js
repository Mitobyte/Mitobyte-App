/**
 * Cloudflare Pages Function: /api/invites/:code/redeem
 * Handles invite code redemption
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
 * POST /api/invites/:code/redeem - Redeem invite code
 */
export async function onRequestPost(context) {
  try {
    const code = context.params.code;

    // Clone the request to avoid body already read errors
    const requestClone = context.request.clone();
    const body = await requestClone.json();
    const { userEmail, userWallet } = body;

    console.log('[Invite Redeem] Starting redemption:', { code, userEmail, userWallet });

    // Get invite code
    const { results } = await context.env.DB.prepare(
      'SELECT * FROM invite_codes WHERE code = ?'
    )
      .bind(code)
      .all();

    if (results.length === 0) {
      console.log('[Invite Redeem] Code not found:', code);
      return jsonResponse({ error: 'Invite code not found' }, 404);
    }

    const invite = results[0];

    // Validate invite (same checks as GET)
    if (!invite.is_active) {
      console.log('[Invite Redeem] Code inactive:', code);
      return jsonResponse({ error: 'This invite code has been deactivated' }, 400);
    }

    if (invite.expires_at) {
      const expirationDate = new Date(invite.expires_at);
      if (expirationDate < new Date()) {
        console.log('[Invite Redeem] Code expired:', code);
        return jsonResponse({ error: 'This invite code has expired' }, 400);
      }
    }

    if (invite.uses_remaining !== null && invite.uses_remaining <= 0) {
      console.log('[Invite Redeem] Usage limit reached:', code);
      return jsonResponse({ error: 'This invite code has reached its usage limit' }, 400);
    }

    // Check if user already redeemed this code
    const identifier = userWallet || userEmail || 'anonymous';
    if (identifier !== 'anonymous') {
      const { results: redemptions } = await context.env.DB.prepare(
        'SELECT id FROM invite_code_uses WHERE invite_code_id = ? AND wallet_address = ?'
      )
        .bind(invite.id, identifier)
        .all();

      if (redemptions.length > 0) {
        console.log('[Invite Redeem] Already redeemed:', { code, identifier });
        return jsonResponse({ error: 'You have already used this invite code' }, 400);
      }
    }

    // Record redemption
    await context.env.DB.prepare(
      `INSERT INTO invite_code_uses (invite_code_id, wallet_address)
       VALUES (?, ?)`
    )
      .bind(invite.id, identifier)
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

    console.log('[Invite Redeem] Success:', { code, identifier });

    return jsonResponse({
      success: true,
      message: 'Invite code redeemed successfully!',
      welcomeMessage: invite.notes || 'Welcome to Mitobyte!'
    });

  } catch (error) {
    console.error('[Invite Redeem] Error:', error);
    return jsonResponse({
      error: 'Failed to redeem invite code',
      details: error.message,
      stack: error.stack
    }, 500);
  }
}

/**
 * OPTIONS /api/invites/:code/redeem - CORS preflight
 */
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
