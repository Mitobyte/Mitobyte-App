/**
 * Cloudflare Pages Function: /api/feedback
 * Handle event feedback submissions
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/feedback - Submit feedback for an event
 */
export async function onRequestPost(context) {
  try {
    const { eventId, walletAddress, formResponses } = await context.request.json();

    if (!eventId) {
      return jsonResponse({ error: 'Event ID is required' }, 400);
    }

    // Check if event exists and has a feedback form
    const { results: eventResults } = await context.env.DB.prepare(
      'SELECT id, feedback_form_id FROM events WHERE id = ?'
    )
      .bind(eventId)
      .all();

    if (eventResults.length === 0) {
      return jsonResponse({ error: 'Event not found' }, 404);
    }

    if (!eventResults[0].feedback_form_id) {
      return jsonResponse({ error: 'This event does not have a feedback form' }, 400);
    }

    // Insert feedback
    const result = await context.env.DB.prepare(
      `INSERT INTO event_feedback (
        event_id,
        wallet_address,
        form_responses,
        created_at
      ) VALUES (?, ?, ?, datetime('now'))`
    )
      .bind(
        eventId,
        walletAddress || 'anonymous',
        formResponses
      )
      .run();

    return jsonResponse({
      success: true,
      feedbackId: result.meta.last_row_id,
      message: 'Feedback submitted successfully'
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    return jsonResponse({ error: 'Failed to submit feedback' }, 500);
  }
}
