/**
 * Cloudflare Pages Function: /api/invites
 * Manages invite codes for platform access
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
 * Generate a unique invite code
 */
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous characters
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `INV-${code}`;
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
 * POST /api/invites - Create new invite code (Admin only)
 */
export async function onRequestPost(context) {
  try {
    const { adminEmail, maxUses, expiresIn, description } = await context.request.json();

    // Verify admin access
    const isAdminUser = await isAdmin(adminEmail, context.env.DB);
    if (!isAdminUser) {
      return jsonResponse({ error: 'Unauthorized. Admin access required.' }, 403);
    }

    // Generate unique code
    let code;
    let attempts = 0;
    while (attempts < 10) {
      code = generateInviteCode();

      // Check if code already exists
      const { results } = await context.env.DB.prepare(
        'SELECT id FROM invite_codes WHERE code = ?'
      )
        .bind(code)
        .all();

      if (results.length === 0) break;
      attempts++;
    }

    if (attempts >= 10) {
      return jsonResponse({ error: 'Failed to generate unique code' }, 500);
    }

    // Calculate expiration
    let expiresAt = null;
    if (expiresIn) {
      const now = new Date();
      const expirationDate = new Date(now.getTime() + expiresIn * 24 * 60 * 60 * 1000); // expiresIn is in days
      expiresAt = expirationDate.toISOString();
    }

    // Insert invite code
    await context.env.DB.prepare(
      `INSERT INTO invite_codes (code, created_by, expires_at, max_uses, description)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(code, adminEmail, expiresAt, maxUses || null, description || null)
      .run();

    return jsonResponse({
      success: true,
      inviteCode: {
        code,
        createdBy: adminEmail,
        expiresAt,
        maxUses,
        description
      }
    }, 201);

  } catch (error) {
    console.error('Create invite error:', error);
    return jsonResponse({
      error: 'Failed to create invite code',
      details: error.message,
      hint: 'Make sure the database migration has been run to create the invite_codes table'
    }, 500);
  }
}

/**
 * GET /api/invites - List all invite codes (Admin only)
 */
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const adminEmail = url.searchParams.get('adminEmail');

    // Verify admin access
    const isAdminUser = await isAdmin(adminEmail, context.env.DB);
    if (!isAdminUser) {
      return jsonResponse({ error: 'Unauthorized. Admin access required.' }, 403);
    }

    // Get all invite codes with usage tracking
    const { results } = await context.env.DB.prepare(`
      SELECT
        ic.id,
        ic.code,
        ic.created_by,
        ic.created_at,
        ic.expires_at,
        ic.max_uses,
        ic.uses_remaining,
        ic.total_uses as current_uses,
        ic.is_active,
        ic.notes as description
      FROM invite_codes ic
      ORDER BY ic.created_at DESC
    `).all();

    // Calculate redemption_count for frontend compatibility
    const invitesWithCount = results.map(invite => ({
      ...invite,
      redemption_count: invite.current_uses || 0
    }));

    return jsonResponse({
      success: true,
      invites: invitesWithCount
    });

  } catch (error) {
    console.error('List invites error:', error);
    return jsonResponse({
      error: 'Failed to fetch invite codes',
      details: error.message,
      hint: 'Make sure the database migration has been run to create the invite_codes table'
    }, 500);
  }
}

/**
 * OPTIONS /api/invites - CORS preflight
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
