/**
 * Send event-triggered notification emails
 * POST /api/email/event-notification
 */

import { sendEventTriggeredEmail } from '../../utils/email.js';

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

    // Parse request body
    const body = await request.json();
    const {
      eventType,
      eventName,
      message,
      details,
      actionUrl,
      actionLabel,
      recipientEmails // Optional: specific recipients, otherwise send to all users
    } = body;

    // Validate required fields
    if (!eventType || !eventName || !message) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: eventType, eventName, message'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get email configuration
    const config = {
      senderEmail: env.SENDER_EMAIL || 'noreply@mitobyte.com',
      senderName: env.SENDER_NAME || 'Mitobyte'
    };

    // Get recipients
    let users;
    if (recipientEmails && recipientEmails.length > 0) {
      // Send to specific recipients
      const placeholders = recipientEmails.map(() => '?').join(',');
      const { results } = await env.DB.prepare(`
        SELECT * FROM users
        WHERE email IN (${placeholders})
        AND email IS NOT NULL
        AND email != ''
      `).bind(...recipientEmails).all();
      users = results;
    } else {
      // Send to all users with email notifications enabled
      const { results } = await env.DB.prepare(`
        SELECT * FROM users
        WHERE email IS NOT NULL
        AND email != ''
        AND email_notifications = 1
      `).all();
      users = results;
    }

    if (users.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No recipients found',
        count: 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Event type labels for display
    const eventTypeLabels = {
      newVote: '🗳️ New Vote Available',
      voteResults: '📊 Voting Results',
      eventCreated: '📅 New Event',
      announcementCreated: '📢 New Announcement',
      ideaCreated: '💡 New Hackathon Idea'
    };

    // Send notifications
    const results = [];
    for (const user of users) {
      const eventData = {
        eventType,
        eventName,
        eventTypeLabel: eventTypeLabels[eventType] || '🔔 Notification',
        message,
        details,
        actionUrl,
        actionLabel
      };

      const userData = {
        email: user.email,
        name: user.username || user.wallet_address
      };

      const result = await sendEventTriggeredEmail(
        env.EMAIL_SENDER,
        config,
        userData,
        eventData
      );

      results.push(result);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return new Response(JSON.stringify({
      success: true,
      message: `Sent ${successCount} notifications, ${failureCount} failed`,
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
    console.error('Event notification error:', error);
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
