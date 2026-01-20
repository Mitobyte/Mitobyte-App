/**
 * Cloudflare Pages Function: /api/bingo/rewards
 * Get user's networking bingo rewards
 */

import { hashWallet } from '../../utils/encryption.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/bingo/rewards - Get all rewards for a user
 */
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const walletAddress = url.searchParams.get('walletAddress');

    if (!walletAddress) {
      return jsonResponse({ error: 'Missing walletAddress parameter' }, 400);
    }

    const hashedWallet = await hashWallet(walletAddress);

    // Get all rewards
    const { results: rewards } = await context.env.DB.prepare(
      `SELECT *
       FROM bingo_rewards
       WHERE user_wallet_hash = ?
       ORDER BY earned_at DESC`
    )
      .bind(hashedWallet)
      .all();

    // Calculate total points
    const totalPoints = rewards.reduce((sum, r) => sum + (r.points_awarded || 0), 0);

    // Count by type
    const rewardCounts = {
      badges: rewards.filter(r => r.reward_type === 'badge').length,
      raffleEntries: rewards.filter(r => r.reward_type === 'raffle_entry').length,
      shoutOuts: rewards.filter(r => r.reward_type === 'shout_out').length,
      bonusPoints: rewards.filter(r => r.reward_type === 'bonus_points').length
    };

    return jsonResponse({
      success: true,
      rewards,
      stats: {
        totalPoints,
        ...rewardCounts
      }
    });
  } catch (error) {
    console.error('Bingo rewards error:', error);
    return jsonResponse({ error: 'Failed to fetch rewards' }, 500);
  }
}
