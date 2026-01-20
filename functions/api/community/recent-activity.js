/**
 * Community Recent Activity API
 * Returns recent community activities for the live ticker
 */

export async function onRequestGet(context) {
  try {
    const activities = [];

    // Get recent check-ins (last 24 hours)
    const checkIns = await context.env.DB.prepare(`
      SELECT
        c.checked_in_at,
        u.display_name,
        u.email,
        e.title as event_title
      FROM checkins c
      JOIN users u ON c.user_wallet_hash = u.wallet_hash
      JOIN events e ON c.event_id = e.id
      WHERE datetime(c.checked_in_at) > datetime('now', '-24 hours')
      ORDER BY c.checked_in_at DESC
      LIMIT 5
    `).all();

    if (checkIns.results) {
      checkIns.results.forEach(row => {
        activities.push({
          type: 'checkin',
          user: row.display_name || row.email?.split('@')[0] || 'Someone',
          action: `checked in to ${row.event_title}`,
          timestamp: row.checked_in_at,
          icon: '✅'
        });
      });
    }

    // Get recent posts (last 24 hours)
    const posts = await context.env.DB.prepare(`
      SELECT
        p.created_at,
        p.content,
        u.display_name,
        u.email
      FROM posts p
      JOIN users u ON p.user_email = u.email
      WHERE datetime(p.created_at) > datetime('now', '-24 hours')
      ORDER BY p.created_at DESC
      LIMIT 5
    `).all();

    if (posts.results) {
      posts.results.forEach(row => {
        const preview = row.content.substring(0, 50);
        activities.push({
          type: 'post',
          user: row.display_name || row.email?.split('@')[0] || 'Someone',
          action: `posted "${preview}..."`,
          timestamp: row.created_at,
          icon: '💬'
        });
      });
    }

    // Get recent RSVPs (last 24 hours)
    const rsvps = await context.env.DB.prepare(`
      SELECT
        r.created_at,
        u.display_name,
        u.email,
        e.title as event_title
      FROM rsvps r
      JOIN users u ON r.user_wallet_hash = u.wallet_hash
      JOIN events e ON r.event_id = e.id
      WHERE datetime(r.created_at) > datetime('now', '-24 hours')
      ORDER BY r.created_at DESC
      LIMIT 5
    `).all();

    if (rsvps.results) {
      rsvps.results.forEach(row => {
        activities.push({
          type: 'rsvp',
          user: row.display_name || row.email?.split('@')[0] || 'Someone',
          action: `RSVP'd to ${row.event_title}`,
          timestamp: row.created_at,
          icon: '🎉'
        });
      });
    }

    // Sort all activities by timestamp and limit to 10
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const limitedActivities = activities.slice(0, 10);

    return new Response(JSON.stringify({
      success: true,
      activities: limitedActivities,
      count: limitedActivities.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Failed to fetch recent activity:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to fetch recent activity',
      activities: []
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
