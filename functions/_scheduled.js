/**
 * Scheduled Worker for Automated Email Reminders
 * Handles daily digests, weekly digests, and vote deadline reminders
 */

import {
  sendVoteDeadlineReminder,
  sendDailyDigest,
  sendWeeklyDigest,
  calculateTimeRemaining
} from './utils/email.js';

/**
 * Scheduled handler for Cloudflare Workers
 * Triggered by cron triggers defined in wrangler.toml
 */
export async function onScheduled(event, env, ctx) {
  const { cron } = event;

  console.log(`Scheduled worker triggered by cron: ${cron}`);

  try {
    // Check if email binding is configured
    if (!env.EMAIL_SENDER) {
      console.error('EMAIL_SENDER binding not configured');
      return;
    }

    const config = {
      senderEmail: env.SENDER_EMAIL || 'noreply@mitobyte.com',
      senderName: env.SENDER_NAME || 'Mitobyte'
    };

    // Determine which task to run based on the cron schedule
    // Note: Cron expressions are defined in wrangler.toml

    // Daily digest (runs daily at 9 AM UTC)
    if (cron === '0 9 * * *') {
      console.log('Running daily digest task');
      await sendDailyDigestTask(env, config);
    }

    // Weekly digest (runs every Monday at 9 AM UTC)
    else if (cron === '0 9 * * 1') {
      console.log('Running weekly digest task');
      await sendWeeklyDigestTask(env, config);
    }

    // Vote deadline reminders (runs every 6 hours)
    else if (cron === '0 */6 * * *') {
      console.log('Running vote deadline reminder task');
      await sendVoteDeadlineRemindersTask(env, config);
    }

    else {
      console.log('Unknown cron schedule:', cron);
    }
  } catch (error) {
    console.error('Scheduled worker error:', error);
  }
}

/**
 * Send daily digest to all subscribed users
 */
async function sendDailyDigestTask(env, config) {
  try {
    // Get all users with daily digest enabled
    const { results: users } = await env.DB.prepare(`
      SELECT * FROM users
      WHERE email IS NOT NULL
      AND email != ''
      AND daily_digest = 1
    `).all();

    if (users.length === 0) {
      console.log('No users with daily digest enabled');
      return;
    }

    console.log(`Sending daily digest to ${users.length} users`);

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

    let successCount = 0;
    let failureCount = 0;

    // Send daily digest to each user
    for (const user of users) {
      try {
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

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
          console.error(`Failed to send daily digest to ${user.email}:`, result.error);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        failureCount++;
        console.error(`Error sending daily digest to ${user.email}:`, error);
      }
    }

    console.log(`Daily digest complete: ${successCount} sent, ${failureCount} failed`);
  } catch (error) {
    console.error('Daily digest task error:', error);
  }
}

/**
 * Send weekly digest to all subscribed users
 */
async function sendWeeklyDigestTask(env, config) {
  try {
    // Get all users with weekly digest enabled
    const { results: users } = await env.DB.prepare(`
      SELECT * FROM users
      WHERE email IS NOT NULL
      AND email != ''
      AND weekly_digest = 1
    `).all();

    if (users.length === 0) {
      console.log('No users with weekly digest enabled');
      return;
    }

    console.log(`Sending weekly digest to ${users.length} users`);

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

    let successCount = 0;
    let failureCount = 0;

    // Send weekly digest to each user
    for (const user of users) {
      try {
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

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
          console.error(`Failed to send weekly digest to ${user.email}:`, result.error);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        failureCount++;
        console.error(`Error sending weekly digest to ${user.email}:`, error);
      }
    }

    console.log(`Weekly digest complete: ${successCount} sent, ${failureCount} failed`);
  } catch (error) {
    console.error('Weekly digest task error:', error);
  }
}

/**
 * Send vote deadline reminders for events approaching deadline
 */
async function sendVoteDeadlineRemindersTask(env, config) {
  try {
    // Find events with deadlines in the next 24 hours
    const targetTime = new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString();

    const { results: events } = await env.DB.prepare(`
      SELECT * FROM events
      WHERE deadline <= ?
      AND deadline > datetime('now')
      AND is_active = 1
      AND reminder_sent = 0
    `).bind(targetTime).all();

    if (events.length === 0) {
      console.log('No events with approaching deadlines');
      return;
    }

    console.log(`Found ${events.length} events with approaching deadlines`);

    // Get all users with email notifications enabled
    const { results: users } = await env.DB.prepare(`
      SELECT * FROM users
      WHERE email IS NOT NULL
      AND email != ''
      AND email_notifications = 1
    `).all();

    if (users.length === 0) {
      console.log('No users with email notifications enabled');
      return;
    }

    let successCount = 0;
    let failureCount = 0;

    // Send reminders
    for (const event of events) {
      for (const user of users) {
        try {
          const eventData = {
            name: event.name,
            deadline: event.deadline,
            timeRemaining: calculateTimeRemaining(event.deadline),
            url: `https://mitobyte.com/events/${event.id}`
          };

          const userData = {
            email: user.email,
            name: user.username || user.wallet_address
          };

          const result = await sendVoteDeadlineReminder(
            env.EMAIL_SENDER,
            config,
            userData,
            eventData
          );

          if (result.success) {
            successCount++;
          } else {
            failureCount++;
            console.error(`Failed to send reminder to ${user.email}:`, result.error);
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          failureCount++;
          console.error(`Error sending reminder to ${user.email}:`, error);
        }
      }

      // Mark event as reminder sent
      try {
        await env.DB.prepare(`
          UPDATE events
          SET reminder_sent = 1
          WHERE id = ?
        `).bind(event.id).run();
      } catch (error) {
        console.error(`Failed to update reminder_sent flag for event ${event.id}:`, error);
      }
    }

    console.log(`Vote deadline reminders complete: ${successCount} sent, ${failureCount} failed`);
  } catch (error) {
    console.error('Vote deadline reminders task error:', error);
  }
}
