/**
 * API endpoint to fetch user XP data
 * Calculates total XP from bingo rewards and check-ins
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
    // Calculate total XP from bingo rewards
    const bingoXpResult = await context.env.DB.prepare(`
      SELECT COALESCE(SUM(points_awarded), 0) as total_xp
      FROM bingo_rewards
      WHERE user_wallet_hash = ?
    `).bind(walletAddress).first();

    // Calculate XP from check-ins (10 XP per check-in)
    const checkInsResult = await context.env.DB.prepare(`
      SELECT COUNT(*) as check_in_count
      FROM checkins
      WHERE user_wallet_hash = ?
    `).bind(walletAddress).first();

    const bingoXp = bingoXpResult?.total_xp || 0;
    const checkInXp = (checkInsResult?.check_in_count || 0) * 10;
    const totalXp = bingoXp + checkInXp;

    // Calculate level (100 XP per level)
    const level = Math.floor(totalXp / 100) + 1;

    return new Response(JSON.stringify({
      success: true,
      data: {
        totalXp,
        bingoXp,
        checkInXp,
        level
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching XP data:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch XP data'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
