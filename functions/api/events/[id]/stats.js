/**
 * Cloudflare Pages Function: /api/events/[id]/stats
 * Get RSVP statistics for a specific event
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/events/:id/stats - Get event RSVP statistics
 */
export async function onRequestGet(context) {
  try {
    const eventId = context.params.id;

    // Check if event exists
    const event = await context.env.DB.prepare(
      'SELECT * FROM events WHERE id = ?'
    ).bind(eventId).first();

    if (!event) {
      return jsonResponse({ error: 'Event not found' }, 404);
    }

    // Get RSVP counts
    const { results: stats } = await context.env.DB.prepare(`
      SELECT
        rsvp_status,
        COUNT(*) as count
      FROM rsvps
      WHERE event_id = ?
      GROUP BY rsvp_status
    `).bind(eventId).all();

    // Format stats
    const rsvpStats = {
      going: 0,
      maybe: 0,
      no: 0,
      total: 0
    };

    stats.forEach(stat => {
      rsvpStats[stat.rsvp_status] = stat.count;
      rsvpStats.total += stat.count;
    });

    return jsonResponse({
      eventId: parseInt(eventId),
      event: {
        title: event.title,
        date: event.date,
        time: event.time,
        location: event.location,
        capacity: event.capacity,
        eventType: event.event_type
      },
      rsvpStats
    });
  } catch (error) {
    console.error('Get event stats error:', error);
    return jsonResponse({ error: 'Failed to fetch event stats' }, 500);
  }
}
