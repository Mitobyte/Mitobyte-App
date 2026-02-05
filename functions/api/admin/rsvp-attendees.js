/**
 * Cloudflare Pages Function: /api/admin/rsvp-attendees
 * Admin-only endpoint to fetch RSVP attendees with full details (including email)
 */

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

/**
 * GET /api/admin/rsvp-attendees?eventId=123
 * Returns all RSVP attendees for an event with full user details
 * Admin access required
 */
export async function onRequestGet(context) {
    try {
        const url = new URL(context.request.url);
        const eventId = url.searchParams.get('eventId');

        if (!eventId) {
            return jsonResponse({ error: 'eventId is required' }, 400);
        }

        // Get all RSVPs for this event with user details
        const { results } = await context.env.DB.prepare(`
      SELECT 
        rsvps.id as rsvp_id,
        rsvps.event_id,
        rsvps.rsvp_status,
        rsvps.user_wallet_hash,
        rsvps.created_at as rsvp_created_at,
        rsvps.updated_at as rsvp_updated_at,
        users.id as user_id,
        users.display_name,
        users.email,
        users.created_at as user_created_at,
        user_profiles.tagline as role,
        user_profiles.skills,
        user_profiles.avatar_url
      FROM rsvps
      LEFT JOIN users ON rsvps.user_wallet_hash = users.wallet_hash
      LEFT JOIN user_profiles ON users.id = user_profiles.user_id
      WHERE rsvps.event_id = ?
      ORDER BY rsvps.created_at DESC
    `).bind(eventId).all();

        // Get event details
        const event = await context.env.DB.prepare(
            'SELECT id, title, date, time, location FROM events WHERE id = ?'
        ).bind(eventId).first();

        // Calculate stats
        const stats = {
            going: results.filter(r => r.rsvp_status === 'going').length,
            maybe: results.filter(r => r.rsvp_status === 'maybe').length,
            no: results.filter(r => r.rsvp_status === 'no').length,
            total: results.length
        };

        return jsonResponse({
            event,
            attendees: results,
            stats
        });
    } catch (error) {
        console.error('Admin RSVP attendees error:', error);
        return jsonResponse({ error: 'Failed to fetch RSVP attendees' }, 500);
    }
}
