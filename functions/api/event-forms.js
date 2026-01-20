/**
 * Cloudflare Pages Function: /api/event-forms
 * Public endpoint to get custom forms for event check-ins
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/event-forms?eventId={id} - Get form for an event (public)
 */
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const eventId = url.searchParams.get('eventId');

    if (!eventId) {
      return jsonResponse({ error: 'eventId parameter required' }, 400);
    }

    // Get form for this event
    const form = await context.env.DB.prepare(
      `SELECT id, event_id, title, description, questions
       FROM event_forms
       WHERE event_id = ?`
    )
      .bind(eventId)
      .first();

    if (!form) {
      return jsonResponse({
        success: true,
        form: null,
        hasCustomForm: false
      });
    }

    return jsonResponse({
      success: true,
      hasCustomForm: true,
      form: {
        id: form.id,
        eventId: form.event_id,
        title: form.title,
        description: form.description,
        questions: JSON.parse(form.questions)
      }
    });
  } catch (error) {
    console.error('Get event form error:', error);
    return jsonResponse({ error: 'Failed to fetch form' }, 500);
  }
}
