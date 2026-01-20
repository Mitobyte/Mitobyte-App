import { unfollowRemoteActor } from '../../federation/utils';
import type { FederationEnv } from '../../federation/config';

export const onRequestPost: PagesFunction<FederationEnv> = async (context) => {
  const { request, env } = context;

  try {
    const { userEmail, actorUri } = await request.json();

    if (!userEmail || !actorUri) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: userEmail and actorUri'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify user exists
    const user = await env.DB.prepare(
      'SELECT email FROM users WHERE email = ?'
    ).bind(userEmail).first();

    if (!user) {
      return new Response(JSON.stringify({
        error: 'User not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Unfollow the remote actor
    const success = await unfollowRemoteActor(env, userEmail, actorUri);

    if (success) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Unfollowed successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({
        error: 'Failed to unfollow'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Unfollow error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
