/**
 * API endpoint to handle event requests from non-admin users
 * Stores pending events that need admin approval
 */

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as any;

    const {
      title,
      description,
      date,
      time,
      location,
      event_type,
      expected_attendees,
      requested_by
    } = body;

    // Validation
    if (!title || !description || !date || !time || !location || !requested_by) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Insert event request into database
    const result = await context.env.DB.prepare(`
      INSERT INTO event_requests (
        title,
        description,
        date,
        time,
        location,
        event_type,
        expected_attendees,
        requested_by,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
    `).bind(
      title,
      description,
      date,
      time,
      location,
      event_type || 'meetup',
      expected_attendees || null,
      requested_by
    ).run();

    return new Response(JSON.stringify({
      success: true,
      requestId: result.meta.last_row_id,
      message: 'Event request submitted successfully. It will be reviewed by admins.'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating event request:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to submit event request'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
