/**
 * Event Sponsorships API
 * Allows sponsors to manage their event sponsorships
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

// Verify user is a sponsor
async function isSponsor(email, db) {
  if (!email) return false;

  const user = await db.prepare(
    'SELECT is_sponsor FROM users WHERE email = ?'
  ).bind(email).first();

  return user?.is_sponsor === 1;
}

// GET - Get sponsorships for a sponsor or event
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const sponsorEmail = url.searchParams.get('sponsorEmail');
    const eventId = url.searchParams.get('eventId');

    if (sponsorEmail) {
      // Get all sponsorships for a sponsor
      const { results } = await context.env.DB.prepare(`
        SELECT
          es.*,
          e.title as event_title,
          e.date as event_date,
          e.location as event_location,
          e.event_type,
          e.thumbnail_url as event_thumbnail
        FROM event_sponsorships es
        JOIN events e ON es.event_id = e.id
        WHERE es.sponsor_email = ?
        ORDER BY e.date DESC
      `).bind(sponsorEmail).all();

      return jsonResponse({
        success: true,
        sponsorships: results
      });
    } else if (eventId) {
      // Get all sponsors for an event
      const { results } = await context.env.DB.prepare(`
        SELECT * FROM event_sponsorships
        WHERE event_id = ? AND is_approved = 1
        ORDER BY tier DESC, created_at ASC
      `).bind(eventId).all();

      return jsonResponse({
        success: true,
        sponsors: results
      });
    } else {
      return jsonResponse({ error: 'sponsorEmail or eventId parameter required' }, 400);
    }
  } catch (error) {
    console.error('Error fetching sponsorships:', error);
    return jsonResponse({
      error: 'Failed to fetch sponsorships',
      details: error.message
    }, 500);
  }
}

// POST - Create new event sponsorship
export async function onRequestPost(context) {
  try {
    const {
      sponsorEmail,
      eventId,
      sponsorName,
      logoUrl,
      websiteUrl,
      tier = 'standard'
    } = await context.request.json();

    // Validate required fields
    if (!sponsorEmail || !eventId || !sponsorName || !logoUrl) {
      return jsonResponse({
        error: 'sponsorEmail, eventId, sponsorName, and logoUrl are required'
      }, 400);
    }

    // Verify user is a sponsor
    const isUserSponsor = await isSponsor(sponsorEmail, context.env.DB);
    if (!isUserSponsor) {
      return jsonResponse({
        error: 'Unauthorized. Sponsor role required.'
      }, 403);
    }

    // Check if event exists
    const event = await context.env.DB.prepare(
      'SELECT id FROM events WHERE id = ?'
    ).bind(eventId).first();

    if (!event) {
      return jsonResponse({ error: 'Event not found' }, 404);
    }

    // Check if already sponsoring this event
    const existing = await context.env.DB.prepare(
      'SELECT id FROM event_sponsorships WHERE event_id = ? AND sponsor_email = ?'
    ).bind(eventId, sponsorEmail).first();

    if (existing) {
      return jsonResponse({
        error: 'You are already sponsoring this event'
      }, 409);
    }

    // Create sponsorship
    const result = await context.env.DB.prepare(`
      INSERT INTO event_sponsorships
      (event_id, sponsor_email, sponsor_name, sponsor_logo_url, sponsor_website_url, tier)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      eventId,
      sponsorEmail,
      sponsorName,
      logoUrl,
      websiteUrl || null,
      tier
    ).run();

    // Fetch the created sponsorship
    const { results } = await context.env.DB.prepare(
      'SELECT * FROM event_sponsorships WHERE id = ?'
    ).bind(result.meta.last_row_id).all();

    return jsonResponse({
      success: true,
      message: 'Event sponsorship created successfully',
      sponsorship: results[0]
    }, 201);
  } catch (error) {
    console.error('Error creating sponsorship:', error);
    return jsonResponse({
      error: 'Failed to create sponsorship',
      details: error.message
    }, 500);
  }
}

// DELETE - Remove sponsorship
export async function onRequestDelete(context) {
  try {
    const url = new URL(context.request.url);
    const sponsorshipId = url.searchParams.get('id');
    const sponsorEmail = url.searchParams.get('sponsorEmail');

    if (!sponsorshipId || !sponsorEmail) {
      return jsonResponse({
        error: 'id and sponsorEmail parameters required'
      }, 400);
    }

    // Verify ownership or admin
    const sponsorship = await context.env.DB.prepare(
      'SELECT sponsor_email FROM event_sponsorships WHERE id = ?'
    ).bind(sponsorshipId).first();

    if (!sponsorship) {
      return jsonResponse({ error: 'Sponsorship not found' }, 404);
    }

    if (sponsorship.sponsor_email !== sponsorEmail) {
      return jsonResponse({
        error: 'Unauthorized. You can only delete your own sponsorships.'
      }, 403);
    }

    // Delete sponsorship
    await context.env.DB.prepare(
      'DELETE FROM event_sponsorships WHERE id = ?'
    ).bind(sponsorshipId).run();

    return jsonResponse({
      success: true,
      message: 'Sponsorship removed successfully'
    });
  } catch (error) {
    console.error('Error deleting sponsorship:', error);
    return jsonResponse({
      error: 'Failed to delete sponsorship',
      details: error.message
    }, 500);
  }
}

// OPTIONS - CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
