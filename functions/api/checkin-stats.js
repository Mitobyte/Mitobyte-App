const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: corsHeaders,
  });
}

// GET - Get check-in statistics
export async function onRequestGet(context) {
  try {
    // Total check-ins
    const totalCheckInsResult = await context.env.DB.prepare(
      `SELECT COUNT(*) as count FROM checkins`
    ).first();

    const totalCheckIns = totalCheckInsResult?.count || 0;

    // Check-ins by event type
    const checkInsByTypeResult = await context.env.DB.prepare(
      `SELECT
        e.event_type,
        COUNT(c.id) as count
       FROM checkins c
       JOIN events e ON c.event_id = e.id
       GROUP BY e.event_type
       ORDER BY count DESC`
    ).all();

    const checkInsByType = checkInsByTypeResult.results;

    // Total unique users who checked in
    const uniqueUsersResult = await context.env.DB.prepare(
      `SELECT COUNT(DISTINCT user_wallet_hash) as count FROM checkins`
    ).first();

    const uniqueUsers = uniqueUsersResult?.count || 0;

    // Recent check-ins (last 10)
    const recentCheckInsResult = await context.env.DB.prepare(
      `SELECT
        c.id,
        c.working_on,
        c.can_help_with,
        c.checked_in_at,
        u.display_name as username,
        e.title as event_title,
        e.event_type,
        e.date as event_date,
        e.time as event_time
       FROM checkins c
       LEFT JOIN users u ON (
         c.user_wallet_hash = u.wallet_hash
         OR c.user_wallet_hash = 'email:' || u.email
       )
       LEFT JOIN events e ON c.event_id = e.id
       ORDER BY c.checked_in_at DESC
       LIMIT 10`
    ).all();

    const recentCheckIns = recentCheckInsResult.results.map(checkin => ({
      ...checkin,
      username: checkin.username || 'Anonymous'
    }));

    // Most active users (top 10)
    const mostActiveUsersResult = await context.env.DB.prepare(
      `SELECT
        u.display_name,
        u.email,
        COUNT(c.id) as checkin_count
       FROM checkins c
       LEFT JOIN users u ON (
         c.user_wallet_hash = u.wallet_hash
         OR c.user_wallet_hash = 'email:' || u.email
       )
       WHERE u.wallet_hash IS NOT NULL
       GROUP BY u.wallet_hash
       ORDER BY checkin_count DESC
       LIMIT 10`
    ).all();

    const mostActiveUsers = mostActiveUsersResult.results.map(user => ({
      ...user,
      display_name: user.display_name || user.email || 'Anonymous'
    }));

    // Check-ins in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    const recentCheckInsCountResult = await context.env.DB.prepare(
      `SELECT COUNT(*) as count FROM checkins WHERE checked_in_at >= ?`
    )
      .bind(thirtyDaysAgoStr)
      .first();

    const checkInsLast30Days = recentCheckInsCountResult?.count || 0;

    // Check-ins by day for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    const dailyCheckInsResult = await context.env.DB.prepare(
      `SELECT
        DATE(checked_in_at) as date,
        COUNT(*) as count
       FROM checkins
       WHERE checked_in_at >= ?
       GROUP BY DATE(checked_in_at)
       ORDER BY date DESC`
    )
      .bind(sevenDaysAgoStr)
      .all();

    const dailyCheckIns = dailyCheckInsResult.results;

    return jsonResponse({
      totalCheckIns,
      checkInsByType,
      uniqueUsers,
      recentCheckIns,
      mostActiveUsers,
      checkInsLast30Days,
      dailyCheckIns
    });

  } catch (error) {
    console.error('Error getting check-in stats:', error);
    return jsonResponse({ error: 'Failed to get check-in statistics' }, 500);
  }
}
