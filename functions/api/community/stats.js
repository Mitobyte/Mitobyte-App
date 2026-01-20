/**
 * Community Stats API
 * Returns community statistics for the hero banner
 */

export async function onRequestGet(context) {
  try {
    // New members this month
    const newMembers = await context.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE datetime(created_at) > datetime('now', 'start of month')
    `).first();

    // Total events attended this month
    const eventsAttended = await context.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM checkins
      WHERE datetime(checked_in_at) > datetime('now', 'start of month')
    `).first();

    // Active members (posted or checked in last 30 days)
    const activeMembers = await context.env.DB.prepare(`
      SELECT COUNT(DISTINCT wallet_hash) as count
      FROM (
        SELECT user_wallet_hash as wallet_hash FROM checkins
        WHERE datetime(checked_in_at) > datetime('now', '-30 days')
        UNION
        SELECT u.wallet_hash FROM posts p
        JOIN users u ON p.user_email = u.email
        WHERE datetime(p.created_at) > datetime('now', '-30 days')
      )
    `).first();

    // Total posts this month
    const totalPosts = await context.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM posts
      WHERE datetime(created_at) > datetime('now', 'start of month')
    `).first();

    // Upcoming events (next 30 days)
    const upcomingEvents = await context.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM events
      WHERE date(date) BETWEEN date('now') AND date('now', '+30 days')
    `).first();

    return new Response(JSON.stringify({
      success: true,
      stats: {
        newMembers: newMembers?.count || 0,
        eventsAttended: eventsAttended?.count || 0,
        activeMembers: activeMembers?.count || 0,
        totalPosts: totalPosts?.count || 0,
        upcomingEvents: upcomingEvents?.count || 0,
        newConnections: Math.floor((activeMembers?.count || 0) * 1.5)
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Failed to fetch community stats:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to fetch community stats',
      stats: {
        newMembers: 0,
        eventsAttended: 0,
        activeMembers: 0,
        totalPosts: 0,
        upcomingEvents: 0,
        newConnections: 0
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
