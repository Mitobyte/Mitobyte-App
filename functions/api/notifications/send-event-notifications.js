/**
 * Automated Event Notification System
 *
 * Sends automated notifications for:
 * - Event registration confirmations
 * - Event reminders (24 hours before)
 * - Event proximity alerts (1 hour before)
 * - Post-event feedback requests (2 hours after event ends)
 *
 * Can be triggered manually or via cron schedule
 */

const ONESIGNAL_APP_ID = 'd583c0e5-bae4-452a-be0c-c7c9156b9261'

async function sendOneSignalNotification(env, { title, message, url, walletAddresses }) {
  const apiKey = env.ONESIGNAL_REST_API_KEY

  if (!apiKey) {
    console.error('[OneSignal] API key not configured')
    return { success: false, error: 'API key not configured' }
  }

  try {
    const payload = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: message },
      url: url || '/',
      include_external_user_ids: walletAddresses
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${apiKey}`
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (response.ok) {
      return { success: true, recipients: data.recipients, notificationId: data.id }
    } else {
      return { success: false, error: data.errors || 'Failed to send notification' }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const now = new Date()
    const notifications = {
      reminders24h: [],
      reminders1h: [],
      feedbackRequests: []
    }

    // Calculate time windows
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000)
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)

    // Get upcoming events (within next 24 hours)
    const { results: upcomingEvents } = await env.DB.prepare(
      `SELECT * FROM events
       WHERE datetime(date || ' ' || time) BETWEEN datetime('now') AND datetime('now', '+24 hours')
       ORDER BY date, time`
    ).all()

    console.log(`[Event Notifications] Found ${upcomingEvents.length} upcoming events`)

    // Process each event
    for (const event of upcomingEvents) {
      const eventDateTime = new Date(`${event.date}T${event.time}`)
      const timeDiff = eventDateTime - now

      // Get RSVPs for this event - need to join with users to get wallet addresses
      // Note: We're using external_user_id which should be set during OneSignal subscription
      const { results: rsvps } = await env.DB.prepare(
        `SELECT u.wallet_address
         FROM rsvps r
         JOIN users u ON r.user_wallet_hash = u.wallet_hash
         WHERE r.event_id = ? AND r.rsvp_status = 'going'`
      ).bind(event.id).all()

      const attendeeWallets = rsvps.map(r => r.wallet_address)

      if (attendeeWallets.length === 0) continue

      // 24-hour reminder (23-25 hours before)
      if (timeDiff > 23 * 60 * 60 * 1000 && timeDiff < 25 * 60 * 60 * 1000) {
        const result = await sendOneSignalNotification(env, {
          title: `Tomorrow: ${event.title}`,
          message: `Your event "${event.title}" starts tomorrow at ${formatTime(event.time)}. Location: ${event.location}`,
          url: `/event/${event.id}`,
          walletAddresses: attendeeWallets
        })

        notifications.reminders24h.push({
          event: event.title,
          recipients: attendeeWallets.length,
          result
        })
      }

      // 1-hour reminder (50-70 minutes before)
      if (timeDiff > 50 * 60 * 1000 && timeDiff < 70 * 60 * 1000) {
        const result = await sendOneSignalNotification(env, {
          title: `Starting Soon: ${event.title}`,
          message: `Your event "${event.title}" starts in 1 hour at ${event.location}. See you there!`,
          url: `/event/${event.id}`,
          walletAddresses: attendeeWallets
        })

        notifications.reminders1h.push({
          event: event.title,
          recipients: attendeeWallets.length,
          result
        })
      }
    }

    // Get events that ended 2 hours ago (for feedback requests)
    const { results: recentEvents } = await env.DB.prepare(
      `SELECT * FROM events
       WHERE datetime(date || ' ' || time) BETWEEN datetime('now', '-3 hours') AND datetime('now', '-2 hours')`
    ).all()

    console.log(`[Event Notifications] Found ${recentEvents.length} recent events for feedback`)

    for (const event of recentEvents) {
      // Get check-ins for this event
      const { results: checkIns } = await env.DB.prepare(
        `SELECT DISTINCT u.wallet_address
         FROM check_ins ci
         JOIN users u ON ci.user_wallet_hash = u.wallet_hash
         WHERE ci.event_id = ?`
      ).bind(event.id).all()

      const attendeeWallets = checkIns.map(c => c.wallet_address)

      if (attendeeWallets.length === 0) continue

      // Check who hasn't submitted feedback yet
      const { results: feedbackSubmissions } = await env.DB.prepare(
        `SELECT DISTINCT u.wallet_address
         FROM event_feedback ef
         JOIN users u ON ef.user_wallet_hash = u.wallet_hash
         WHERE ef.event_id = ?`
      ).bind(event.id).all()

      const feedbackWallets = new Set(feedbackSubmissions.map(f => f.wallet_address))
      const needFeedback = attendeeWallets.filter(w => !feedbackWallets.has(w))

      if (needFeedback.length > 0) {
        const result = await sendOneSignalNotification(env, {
          title: `How was ${event.title}?`,
          message: `Thanks for attending! We'd love your feedback on "${event.title}". It only takes a minute.`,
          url: `/event/${event.id}/feedback`,
          walletAddresses: needFeedback
        })

        notifications.feedbackRequests.push({
          event: event.title,
          recipients: needFeedback.length,
          result
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: now.toISOString(),
        notifications: {
          reminders24h: notifications.reminders24h.length,
          reminders1h: notifications.reminders1h.length,
          feedbackRequests: notifications.feedbackRequests.length
        },
        details: notifications
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('[Event Notifications] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

function formatTime(timeString) {
  const [hours, minutes] = timeString.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

// GET endpoint for testing/documentation
export async function onRequestGet() {
  return new Response(
    JSON.stringify({
      endpoint: '/api/notifications/send-event-notifications',
      description: 'Automated event notification system',
      triggers: [
        '24-hour event reminders',
        '1-hour event proximity alerts',
        'Post-event feedback requests (2 hours after)'
      ],
      schedule: 'Should be run every 15-30 minutes via cron',
      manualTrigger: 'POST to this endpoint to trigger immediately'
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}
