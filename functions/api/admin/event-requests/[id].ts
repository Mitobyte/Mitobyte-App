/**
 * Admin API endpoint to delete an event request
 */

interface Env {
  DB: D1Database;
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
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

    await context.env.DB.prepare(`
      DELETE FROM event_requests WHERE id = ?
    `).bind(requestId).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Event request deleted'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting event request:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete event request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
