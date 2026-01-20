/**
 * Cloudflare Pages Function: /api/community-checkins
 * Fetches recent check-ins with stand-up responses for community feed
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/community-checkins - Get recent check-ins with stand-up data
 * Query params:
 *   - limit: number of check-ins to return (default 20, max 100)
 *   - offset: pagination offset (default 0)
 */
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get recent check-ins with stand-up responses and profile data
    const { results: checkins } = await context.env.DB.prepare(
      `SELECT
        c.id as checkin_id,
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
        e.event_type,
        e.date as event_date,
        e.time as event_time
       FROM checkins c
       INNER JOIN users u ON c.user_wallet_hash = u.wallet_hash
       LEFT JOIN user_profiles up ON u.id = up.user_id
       LEFT JOIN user_settings us ON u.id = us.user_id
       INNER JOIN events e ON c.event_id = e.id
       WHERE c.working_on IS NOT NULL AND c.can_help_with IS NOT NULL
       ORDER BY c.checked_in_at DESC
       LIMIT ? OFFSET ?`
    )
      .bind(limit, offset)
      .all();

    // Get total count of check-ins with stand-up data
    const { count } = await context.env.DB.prepare(
      `SELECT COUNT(*) as count
       FROM checkins
       WHERE working_on IS NOT NULL AND can_help_with IS NOT NULL`
    )
      .first();

    const mappedCheckins = checkins.map(c => {
      const isPrivate = c.profile_visibility === 'private';

      // Debug logging
      console.log('DEBUG Check-in:', {
        checkin_id: c.checkin_id,
        display_name: c.display_name,
        email: c.email,
        user_id: c.user_id,
        wallet_hash: c.wallet_hash,
        profile_visibility: c.profile_visibility,
        isPrivate,
        finalUsername: isPrivate ? 'Anonymous Member' : (c.display_name || 'Community Member')
      });

      return {
        id: c.checkin_id,
        eventId: c.event_id,
        eventTitle: c.event_title,
        eventType: c.event_type,
        eventDate: c.event_date,
        eventTime: c.event_time,
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
        canHelpWith: c.can_help_with,
        checkedInAt: c.checked_in_at
      };
    });

    console.log('DEBUG Final response:', { count: mappedCheckins.length, checkins: mappedCheckins });

    return jsonResponse({
      checkins: mappedCheckins,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count
      }
    });
  } catch (error) {
    console.error('Get community check-ins error:', error);
    return jsonResponse({ error: 'Failed to fetch community check-ins' }, 500);
  }
}
