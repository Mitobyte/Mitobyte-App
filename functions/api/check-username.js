/**
 * Cloudflare Pages Function: /api/check-username
 * Check if a username (display_name) is available
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/check-username?username={username}&currentWallet={walletAddress}
 * Check if username is available
 */
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const username = url.searchParams.get('username');
    const currentWallet = url.searchParams.get('currentWallet');

    if (!username) {
      return jsonResponse({ error: 'Username parameter required' }, 400);
    }

    // Validate username format
    if (username.length < 3) {
      return jsonResponse({
        available: false,
        error: 'Username must be at least 3 characters'
      }, 400);
    }

    if (username.length > 30) {
      return jsonResponse({
        available: false,
        error: 'Username must be 30 characters or less'
      }, 400);
    }

    // Check if username already exists (case-insensitive)
    const { results } = await context.env.DB.prepare(
      `SELECT wallet_hash FROM users WHERE LOWER(display_name) = LOWER(?) LIMIT 1`
    )
      .bind(username)
      .all();

    // If username exists and it's not the current user's username, it's taken
    if (results.length > 0) {
      // Check if it belongs to the current user
      if (currentWallet && results[0].wallet_hash === currentWallet) {
        return jsonResponse({ available: true }); // It's their own username
      }
      return jsonResponse({ available: false });
    }

    return jsonResponse({ available: true });
  } catch (error) {
    console.error('Check username error:', error);
    return jsonResponse({ error: 'Failed to check username availability' }, 500);
  }
}
