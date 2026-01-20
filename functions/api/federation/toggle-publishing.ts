import type { FederationEnv } from '../../federation/config';

/**
 * Toggle whether votes should be published to the fediverse for a user
 */
export const onRequestPost: PagesFunction<FederationEnv> = async (context) => {
  const { request, env } = context;

  try {
    const { userEmail, enabled } = await request.json();

    if (!userEmail || typeof enabled !== 'boolean') {
      return new Response(JSON.stringify({
        error: 'Missing required fields: userEmail (string) and enabled (boolean)'
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

    // Update setting
    await env.DB.prepare(`
      UPDATE users
      SET publish_votes_to_fediverse = ?
      WHERE email = ?
    `).bind(enabled ? 1 : 0, userEmail).run();

    return new Response(JSON.stringify({
      success: true,
      message: `Fediverse publishing ${enabled ? 'enabled' : 'disabled'}`,
      enabled
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Toggle publishing error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to update publishing settings'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * Get current publishing settings
 */
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
    const user = await env.DB.prepare(
      'SELECT publish_votes_to_fediverse FROM users WHERE email = ?'
    ).bind(userEmail).first();

    if (!user) {
      return new Response(JSON.stringify({
        error: 'User not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      enabled: user.publish_votes_to_fediverse === 1
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get publishing settings error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to get publishing settings'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
