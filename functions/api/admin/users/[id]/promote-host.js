/**
 * Cloudflare Pages Function: /api/admin/users/:id/promote-host
 * Promotes a user to host status
 */

export async function onRequestPost(context) {
  try {
    const adminEmail = context.request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!adminEmail) {
      return new Response(JSON.stringify({ error: 'Admin email required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify admin status
    const adminUser = await context.env.DB.prepare(
      'SELECT is_admin FROM users WHERE email = ?'
    )
      .bind(adminEmail)
      .first();

    if (!adminUser || !adminUser.is_admin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = context.params.id;

    // Promote user to host
    await context.env.DB.prepare(
      'UPDATE users SET is_host = 1 WHERE id = ?'
    )
      .bind(userId)
      .run();

    return new Response(JSON.stringify({
      success: true,
      message: 'User promoted to host successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Promote to host error:', error);
    return new Response(JSON.stringify({ error: 'Failed to promote user to host' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
