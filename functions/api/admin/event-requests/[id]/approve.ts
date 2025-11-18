/**
 * Admin API endpoint to approve an event request
 * POST - Approve request and create the event
 */

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    // Get admin email from Authorization header
    const authHeader = context.request.headers.get('Authorization');
    const adminEmail = authHeader?.replace('Bearer ', '');

    // Validate admin access
    if (!adminEmail || !adminEmail.startsWith('carl@craftthefuture.xyz')) {
      return new Response(JSON.stringify({
        error: 'Admin access required'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const requestId = context.params.id as string;
    const body = await context.request.json() as any;

    // Get the event request
    const request = await context.env.DB.prepare(`
      SELECT * FROM event_requests WHERE id = ?
    `).bind(requestId).first();

    if (!request) {
      return new Response(JSON.stringify({
        error: 'Event request not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create the event from the request
    const eventResult = await context.env.DB.prepare(`
      INSERT INTO events (
        title,
        description,
        date,
        time,
        location,
        event_type,
        capacity,
        created_by,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      body.title || request.title,
      body.description || request.description,
      body.date || request.date,
      body.time || request.time,
      body.location || request.location,
      body.event_type || request.event_type,
      body.capacity || request.expected_attendees || null,
      adminEmail
    ).run();

    // Update the request status
    await context.env.DB.prepare(`
      UPDATE event_requests
      SET status = 'approved',
          reviewed_by = ?,
          reviewed_at = datetime('now')
      WHERE id = ?
    `).bind(adminEmail, requestId).run();

    return new Response(JSON.stringify({
      success: true,
      eventId: eventResult.meta.last_row_id,
      message: 'Event request approved and event created'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error approving event request:', error);
    return new Response(JSON.stringify({
      error: 'Failed to approve event request'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
