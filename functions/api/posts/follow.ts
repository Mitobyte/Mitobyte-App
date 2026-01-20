import type { FederationEnv } from '../../federation/config';

export const onRequestPost: PagesFunction<FederationEnv> = async (context) => {
  const { request, env } = context;

  try {
    const { followerEmail, followingEmail } = await request.json();

    if (!followerEmail || !followingEmail) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: followerEmail and followingEmail'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (followerEmail === followingEmail) {
      return new Response(JSON.stringify({
        error: 'Cannot follow yourself'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if already following
    const existing = await env.DB.prepare(`
      SELECT id FROM user_follows
      WHERE follower_email = ? AND following_email = ?
    `).bind(followerEmail, followingEmail).first();

    if (existing) {
      // Unfollow
      await env.DB.prepare(`
        DELETE FROM user_follows
        WHERE follower_email = ? AND following_email = ?
      `).bind(followerEmail, followingEmail).run();

      return new Response(JSON.stringify({
        success: true,
        following: false
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Follow
      await env.DB.prepare(`
        INSERT INTO user_follows (follower_email, following_email)
        VALUES (?, ?)
      `).bind(followerEmail, followingEmail).run();

      return new Response(JSON.stringify({
        success: true,
        following: true
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Follow error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to follow user'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
