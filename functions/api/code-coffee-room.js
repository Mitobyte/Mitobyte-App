/**
 * Cloudflare Pages Function: /api/code-coffee-room
 * Get room data for Code & Coffee and Code & Brews events
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/code-coffee-room?eventId={id}&walletAddress={address}
 * Get event details, attendees, and check-ins for a Code & Coffee/Brews event
 */
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const eventId = url.searchParams.get('eventId');
    const walletAddress = url.searchParams.get('walletAddress');

    if (!eventId) {
      return jsonResponse({ error: 'Missing eventId parameter' }, 400);
    }

    // Get event details
    const event = await context.env.DB.prepare(
      `SELECT id, title, description, event_type, date, time, location, capacity, check_in_code, thumbnail_url
       FROM events WHERE id = ?`
    )
      .bind(eventId)
      .first();

    if (!event) {
      return jsonResponse({ error: 'Event not found' }, 404);
    }

    // Verify event is Code & Coffee or Code & Brews
    if (event.event_type !== 'code_and_coffee' && event.event_type !== 'code_and_brews') {
      return jsonResponse({ error: 'Event is not a Code & Coffee or Code & Brews event' }, 400);
    }

    // Get attendees (RSVPs with status 'going')
    const { results: attendees } = await context.env.DB.prepare(
      `SELECT u.display_name, u.email
       FROM rsvps r
       LEFT JOIN users u ON r.user_wallet_hash = u.wallet_hash
       WHERE r.event_id = ? AND r.rsvp_status = 'going'
       ORDER BY r.created_at ASC`
    )
      .bind(eventId)
      .all();

    // Get check-ins with standup responses
    const { results: checkIns } = await context.env.DB.prepare(
      `SELECT
        c.id,
        c.working_on,
        c.can_help_with,
        c.need_help_with,
        c.confidence_score,
        c.checked_in_at,
        u.display_name,
        u.email
       FROM checkins c
       LEFT JOIN users u ON c.user_wallet_hash = u.wallet_hash
       WHERE c.event_id = ? AND (c.is_safe IS NULL OR c.is_safe = 1)
       ORDER BY c.checked_in_at DESC`
    )
      .bind(eventId)
      .all();

    // Get user's RSVP status if walletAddress provided
    let userHasRSVP = false;
    let userHasCheckedIn = false;

    if (walletAddress) {
      const rsvp = await context.env.DB.prepare(
        `SELECT id, rsvp_status FROM rsvps WHERE event_id = ? AND user_wallet_hash = ?`
      )
        .bind(eventId, walletAddress)
        .first();

      userHasRSVP = rsvp?.rsvp_status === 'going';

      const checkIn = await context.env.DB.prepare(
        `SELECT id FROM checkins WHERE event_id = ? AND user_wallet_hash = ?`
      )
        .bind(eventId, walletAddress)
        .first();

      userHasCheckedIn = !!checkIn;
    }

    // Calculate stats
    const stats = {
      totalAttendees: attendees.length,
      totalCheckIns: checkIns.length,
      attendanceRate: attendees.length > 0
        ? Math.round((checkIns.length / attendees.length) * 100)
        : 0
    };

    return jsonResponse({
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        eventType: event.event_type,
        date: event.date,
        time: event.time,
        location: event.location,
        capacity: event.capacity,
        checkInCode: event.check_in_code,
        thumbnailUrl: event.thumbnail_url
      },
      attendees: attendees.map(a => ({
        displayName: a.display_name || 'Anonymous',
        email: a.email
      })),
      checkIns: checkIns.map(c => ({
        id: c.id,
        workingOn: c.working_on,
        canHelpWith: c.can_help_with,
        needHelpWith: c.need_help_with,
        confidenceScore: c.confidence_score,
        displayName: c.display_name || 'Anonymous',
        email: c.email,
        checkInTime: c.checked_in_at
      })),
      stats,
      userHasRSVP,
      userHasCheckedIn
    });
  } catch (error) {
    console.error('Get code-coffee-room error:', error);
    return jsonResponse({ error: 'Failed to fetch room data' }, 500);
  }
}
