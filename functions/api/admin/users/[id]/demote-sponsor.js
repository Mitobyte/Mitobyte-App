import { requireAuth } from '../../../../utils/auth.js';

export async function onRequestPost(context) {
  try {
    // Verify authentication using JWT
    let requestingUser;
    try {
      requestingUser = await requireAuth(context.request, context.env.JWT_SECRET);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const targetUserId = context.params.id;

    // Allow if admin OR if user is targeting themselves
    const isSelf = String(requestingUser.userId) === String(targetUserId);
    if (!requestingUser.isAdmin && !isSelf) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Demote user from sponsor
    await context.env.DB.prepare(
      'UPDATE users SET is_sponsor = 0 WHERE id = ?'
    )
      .bind(userId)
      .run();

    return new Response(JSON.stringify({
      success: true,
      message: 'User demoted from sponsor successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Demote from sponsor error:', error);
    return new Response(JSON.stringify({ error: 'Failed to demote user from sponsor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
