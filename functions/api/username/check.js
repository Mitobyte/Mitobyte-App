/**
 * Cloudflare Pages Function: /api/username/check
 * Checks if a username is available
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/username/check?username=desired_username&userId=current_user_id
 * Checks if username is available
 */
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const username = url.searchParams.get('username');
    const userId = url.searchParams.get('userId');

    if (!username) {
      return jsonResponse({ error: 'username parameter required' }, 400);
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return jsonResponse({
        available: false,
        error: 'Username must be 3-20 characters (letters, numbers, underscore only)'
      });
    }

    // Check if username already exists (excluding current user)
    let query = `SELECT user_id FROM user_profiles WHERE LOWER(username) = LOWER(?)`;
    const bindings = [username];

    if (userId) {
      query += ` AND user_id != ?`;
      bindings.push(userId);
    }

    const existing = await context.env.DB.prepare(query)
      .bind(...bindings)
      .first();

    return jsonResponse({
      available: !existing,
      username: username
    });
  } catch (error) {
    console.error('Username check error:', error);
    return jsonResponse({ error: 'Failed to check username' }, 500);
  }
}
