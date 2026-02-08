/**
 * Cloudflare Pages Function: /api/events/:id/attendees
 * Get list of attendees for an event
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/events/:id/attendees - Get event attendees
 */
export async function onRequestGet(context) {
  try {
    const eventId = context.params.id;

    // Get RSVPs with user information
    const { results } = await context.env.DB.prepare(`
      SELECT
        r.user_wallet_hash,
        r.rsvp_status,
        r.created_at,
        u.email,
        u.display_name,
        up.name,
        up.avatar_url,
        up.bio
      FROM rsvps r
      LEFT JOIN users u ON r.user_wallet_hash = u.wallet_hash
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE r.event_id = ? AND r.rsvp_status = 'going'
      ORDER BY r.created_at DESC
    `)
      .bind(eventId)
      .all();

    return jsonResponse({
      success: true,
      attendees: results || [],
      count: results?.length || 0
    });
  } catch (error) {
    console.error('Get attendees error:', error);
    return jsonResponse({
      success: false,
      error: 'Failed to fetch attendees',
      attendees: []
    }, 500);
  }
}
