/**
 * API endpoint to fetch user collectibles (badges and rewards)
 * Returns all rewards earned by the user
 */

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { searchParams } = new URL(context.request.url);
  const walletAddress = searchParams.get('walletAddress');

  if (!walletAddress) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Wallet address is required'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Fetch all collectibles from bingo rewards
    const collectiblesResult = await context.env.DB.prepare(`
      SELECT
        id,
        reward_type,
        reward_name,
        reward_description,
        points_awarded,
        earned_at,
        metadata
      FROM bingo_rewards
      WHERE user_wallet_hash = ?
      ORDER BY earned_at DESC
    `).bind(walletAddress).all();

    return new Response(JSON.stringify({
      success: true,
      collectibles: collectiblesResult.results || [],
      count: collectiblesResult.results?.length || 0
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching collectibles:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch collectibles'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
