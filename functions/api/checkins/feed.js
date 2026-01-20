/**
 * Cloudflare Pages Function: /api/checkins/feed
 * Returns recent community check-ins for display in the Showcase feed
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60' // Cache for 1 minute
    },
  });
}

/**
 * GET /api/checkins/feed - Get recent community check-ins
 */
export async function onRequestGet(context) {
  try {
    // Query check-ins with event data and user profile data
    const { results } = await context.env.DB.prepare(`
      SELECT
        c.id,
        c.event_id,
        c.checked_in_at,
        c.working_on,
        c.can_help_with,
        u.id as user_id,
        u.wallet_hash,
        u.email,
        COALESCE(up.name, u.display_name, u.email) as display_name,
        up.avatar_url,
        up.bio,
        up.tagline,
        up.location,
        up.github_username,
        up.twitter_username,
        up.discord_username,
        (SELECT COUNT(*) FROM checkins WHERE user_wallet_hash = u.wallet_hash) as total_events_attended,
        COALESCE(us.profile_visibility, 'public') as profile_visibility,
        e.title as event_title,
        e.date as event_date,
        e.event_type
      FROM checkins c
      INNER JOIN users u ON c.user_wallet_hash = u.wallet_hash
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN user_settings us ON u.id = us.user_id
      LEFT JOIN events e ON c.event_id = e.id
      ORDER BY c.checked_in_at DESC
      LIMIT 50
    `).all();

    // Map results with privacy controls
    const checkIns = results.map(c => {
      const isPrivate = c.profile_visibility === 'private';

      return {
        id: c.id,
        eventId: c.event_id,
        eventTitle: c.event_title,
        eventType: c.event_type,
        eventDate: c.event_date,
        checkedInAt: c.checked_in_at,
        // User info - hide if private
        userId: c.user_id,
        walletHash: isPrivate ? null : c.wallet_hash,
        username: isPrivate ? 'Anonymous Member' : (c.display_name || 'Community Member'),
        profileVisibility: c.profile_visibility,
        // Profile info - hide if private
        avatarUrl: isPrivate ? null : c.avatar_url,
        bio: isPrivate ? null : c.bio,
        tagline: isPrivate ? null : c.tagline,
        location: isPrivate ? null : c.location,
        githubUsername: isPrivate ? null : c.github_username,
        twitterUsername: isPrivate ? null : c.twitter_username,
        discordUsername: isPrivate ? null : c.discord_username,
        totalEventsAttended: isPrivate ? null : c.total_events_attended,
        // Check-in data - always visible
        workingOn: c.working_on,
        canHelpWith: c.can_help_with
      };
    });

    return jsonResponse({
      success: true,
      checkIns
    });
  } catch (error) {
    console.error('Error fetching check-in feed:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return jsonResponse({
      success: false,
      error: 'Failed to fetch check-in feed',
      details: error.message,
      checkIns: []
    }, 500);
  }
}
