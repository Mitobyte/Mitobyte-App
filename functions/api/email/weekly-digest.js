/**
 * Send weekly digest emails to users
 * POST /api/email/weekly-digest
 */

import { sendWeeklyDigest } from '../../utils/email.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // Check if email binding is configured
    if (!env.EMAIL_SENDER) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email binding not configured'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get email configuration
    const config = {
      senderEmail: env.SENDER_EMAIL || 'noreply@mitobyte.com',
      senderName: env.SENDER_NAME || 'Mitobyte'
    };

    // Get all users with email addresses and weekly digest enabled
    const { results: users } = await env.DB.prepare(`
      SELECT * FROM users
      WHERE email IS NOT NULL
      AND email != ''
      AND weekly_digest = 1
    `).all();

    if (users.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No users with weekly digest enabled',
        count: 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Calculate week range
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekRange = `${weekAgo.toLocaleDateString()} - ${today.toLocaleDateString()}`;

    // Get top voted ideas from the past week
    const { results: topIdeas } = await env.DB.prepare(`
      SELECT hi.title as name, COUNT(iv.id) as votes
      FROM hackathon_ideas hi
      LEFT JOIN idea_votes iv ON hi.id = iv.idea_id
      WHERE hi.created_at >= datetime('now', '-7 days')
      GROUP BY hi.id
      ORDER BY votes DESC
      LIMIT 5
    `).all();

    // Get completed events from the past week
    const { results: completedEvents } = await env.DB.prepare(`
      SELECT name, date FROM events
      WHERE date >= datetime('now', '-7 days')
      AND date <= datetime('now')
      ORDER BY date DESC
      LIMIT 5
    `).all();

    // Get upcoming events this week
    const { results: upcomingThisWeek } = await env.DB.prepare(`
      SELECT name, date FROM events
      WHERE date > datetime('now')
      AND date <= datetime('now', '+7 days')
      ORDER BY date ASC
      LIMIT 5
    `).all();

    // Send weekly digest to each user
    const results = [];
    for (const user of users) {
      // Get user's weekly stats
      const totalVotesResult = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM idea_votes
        WHERE user_id = ?
        AND created_at >= datetime('now', '-7 days')
      `).bind(user.id).first();

      const eventsParticipatedResult = await env.DB.prepare(`
        SELECT COUNT(DISTINCT event_id) as count FROM idea_votes
        WHERE user_id = ?
        AND created_at >= datetime('now', '-7 days')
      `).bind(user.id).first();

      const checkInsResult = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM rsvps
        WHERE user_id = ?
        AND status = 'checked_in'
        AND created_at >= datetime('now', '-7 days')
      `).bind(user.id).first();

      const digestData = {
        weekRange,
        stats: {
          totalVotes: totalVotesResult?.count || 0,
          eventsParticipated: eventsParticipatedResult?.count || 0,
          checkIns: checkInsResult?.count || 0
        },
        topIdeas: topIdeas.map(i => ({
          name: i.name,
          votes: i.votes
        })),
        completedEvents: completedEvents.map(e => ({
          name: e.name,
          date: new Date(e.date).toLocaleDateString()
        })),
        upcomingThisWeek: upcomingThisWeek.map(e => ({
          name: e.name,
          date: new Date(e.date).toLocaleDateString()
        }))
      };

      const userData = {
        email: user.email,
        name: user.username || user.wallet_address
      };

      const result = await sendWeeklyDigest(
        env.EMAIL_SENDER,
        config,
        userData,
        digestData
      );

      results.push(result);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return new Response(JSON.stringify({
      success: true,
      message: `Sent ${successCount} weekly digests, ${failureCount} failed`,
      users: users.length,
      successCount,
      failureCount,
      results: results.map(r => ({
        success: r.success,
        to: r.to,
        error: r.error
      }))
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Weekly digest error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
