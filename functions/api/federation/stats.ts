import { getFollowerCount, getFollowingCount, getUserActivities } from '../../federation/utils';
import type { FederationEnv } from '../../federation/config';

export const onRequestGet: PagesFunction<FederationEnv> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const userEmail = url.searchParams.get('userEmail');

  if (!userEmail) {
    return new Response(JSON.stringify({
      error: 'Missing userEmail parameter'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get follower and following counts
    const [followerCount, followingCount, activities] = await Promise.all([
      getFollowerCount(env.DB, userEmail),
      getFollowingCount(env.DB, userEmail),
      getUserActivities(env.DB, userEmail, 10)
    ]);

    // Get recent followers
    const followers = await env.DB.prepare(`
      SELECT follower_uri, follower_handle, follower_name, accepted_at
      FROM activitypub_followers
      WHERE user_email = ? AND status = 'accepted'
      ORDER BY accepted_at DESC
      LIMIT 10
    `).bind(userEmail).all();

    // Get following
    const following = await env.DB.prepare(`
      SELECT following_uri, following_handle, following_name, accepted_at
      FROM activitypub_following
      WHERE user_email = ? AND status = 'accepted'
      ORDER BY accepted_at DESC
      LIMIT 10
    `).bind(userEmail).all();

    // Get activity stats
    const activityStats = await env.DB.prepare(`
      SELECT
        COUNT(*) as total_activities,
        SUM(CASE WHEN activity_type = 'Create' THEN 1 ELSE 0 END) as posts,
        (SELECT COUNT(*) FROM activitypub_likes WHERE activity_id IN
          (SELECT activity_id FROM activitypub_activities WHERE user_email = ?)) as total_likes,
        (SELECT COUNT(*) FROM activitypub_shares WHERE activity_id IN
          (SELECT activity_id FROM activitypub_activities WHERE user_email = ?)) as total_shares
      FROM activitypub_activities
      WHERE user_email = ?
    `).bind(userEmail, userEmail, userEmail).first();

    return new Response(JSON.stringify({
      stats: {
        followers: followerCount,
        following: followingCount,
        activities: activityStats?.total_activities || 0,
        posts: activityStats?.posts || 0,
        likes: activityStats?.total_likes || 0,
        shares: activityStats?.total_shares || 0
      },
      followers: followers.results,
      following: following.results,
      recentActivities: activities
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Stats error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
