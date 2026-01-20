/**
 * Send daily digest emails to users
 * POST /api/email/daily-digest
 */

import { sendDailyDigest } from '../../utils/email.js';

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

    // Get all users with email addresses and daily digest enabled
    const { results: users } = await env.DB.prepare(`
      SELECT * FROM users
      WHERE email IS NOT NULL
      AND email != ''
      AND daily_digest = 1
    `).all();

    if (users.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No users with daily digest enabled',
        count: 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get active votes
    const { results: activeVotes } = await env.DB.prepare(`
      SELECT name, deadline FROM events
      WHERE deadline > datetime('now')
      AND is_active = 1
      ORDER BY deadline ASC
      LIMIT 5
    `).all();

    // Get upcoming events
    const { results: upcomingEvents } = await env.DB.prepare(`
      SELECT name, date FROM events
      WHERE date > datetime('now')
      ORDER BY date ASC
      LIMIT 5
    `).all();

    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Send daily digest to each user
    const results = [];
    for (const user of users) {
      // Get user's recent activity
      const { results: recentActivity } = await env.DB.prepare(`
        SELECT
          'Voted on ' || e.name as action,
          datetime(iv.created_at) as timestamp
        FROM idea_votes iv
        JOIN events e ON iv.event_id = e.id
        WHERE iv.user_id = ?
        ORDER BY iv.created_at DESC
        LIMIT 5
      `).bind(user.id).all();

      const digestData = {
        date: today,
        activeVotes: activeVotes.map(v => ({
          name: v.name,
          deadline: new Date(v.deadline).toLocaleString()
        })),
        recentActivity: recentActivity.map(a => ({
          action: a.action,
          timestamp: new Date(a.timestamp).toLocaleString()
        })),
        upcomingEvents: upcomingEvents.map(e => ({
          name: e.name,
          date: new Date(e.date).toLocaleString()
        }))
      };

      const userData = {
        email: user.email,
        name: user.username || user.wallet_address
      };

      const result = await sendDailyDigest(
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
      message: `Sent ${successCount} daily digests, ${failureCount} failed`,
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
    console.error('Daily digest error:', error);
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
