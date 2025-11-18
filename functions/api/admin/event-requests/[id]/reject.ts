/**
 * Admin API endpoint to reject an event request
 */

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const authHeader = context.request.headers.get('Authorization');
    const adminEmail = authHeader?.replace('Bearer ', '');

    if (!adminEmail || !adminEmail.startsWith('carl@craftthefuture.xyz')) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const requestId = context.params.id as string;
    const body = await context.request.json() as any;

    await context.env.DB.prepare(`
      UPDATE event_requests
      SET status = 'rejected',
          admin_notes = ?,
          reviewed_by = ?,
          reviewed_at = datetime('now')
      WHERE id = ?
    `).bind(body.reason || '', adminEmail, requestId).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Event request rejected'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error rejecting event request:', error);
    return new Response(JSON.stringify({ error: 'Failed to reject event request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
