import { isAdmin } from '../../utils/adminAuth'

export async function onRequestGet({ request, env }) {
  try {
    // Check admin authorization
    const url = new URL(request.url)
    const adminEmail = url.searchParams.get('adminEmail')

    if (!adminEmail || !isAdmin(adminEmail)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get all announcements ordered by most recent
    const { results } = await env.DB.prepare(
      'SELECT * FROM announcements ORDER BY sent_at DESC LIMIT 50'
    ).all()

    return new Response(
      JSON.stringify({ success: true, announcements: results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching announcements:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json()
    const { adminEmail, title, message } = body

    // Check admin authorization
    if (!adminEmail || !isAdmin(adminEmail)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate input
    if (!title || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Title and message are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get all users to count recipients
    const { results: users } = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM users'
    ).all()

    const recipientCount = users[0]?.count || 0

    // Insert announcement into database
    const result = await env.DB.prepare(
      `INSERT INTO announcements (title, message, sender_email, recipient_count)
       VALUES (?, ?, ?, ?)`
    ).bind(title, message, adminEmail, recipientCount).run()

    const announcementId = result.meta.last_row_id

    // Send push notification via OneSignal
    let sentCount = 0
    let notificationError = null
    const ONESIGNAL_APP_ID = 'd583c0e5-bae4-452a-be0c-c7c9156b9261'

    // Get OneSignal REST API key from environment
    const apiKey = env.ONESIGNAL_REST_API_KEY

    console.log('[OneSignal Debug] Starting notification send process', {
      hasApiKey: !!apiKey,
      announcementId,
      title,
      message: message.substring(0, 50) + '...'
    })

    if (!apiKey) {
      notificationError = 'ONESIGNAL_REST_API_KEY not configured in environment'
      console.error('[OneSignal] ❌ API key missing:', notificationError)
      // Still save the announcement, just log the error
    } else {
      try {
        // Build OneSignal notification payload
        const payload = {
          app_id: ONESIGNAL_APP_ID,
          headings: { en: title },
          contents: { en: message },
          included_segments: ['All'], // Send to all subscribed users
          url: '/', // URL to open when notification is clicked
          web_push_topic: 'announcements'
        }

        console.log('[OneSignal Debug] Sending payload:', JSON.stringify(payload, null, 2))

        // Send notification via OneSignal REST API
        const response = await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${apiKey}`
          },
          body: JSON.stringify(payload)
        })

        const data = await response.json()

        console.log('[OneSignal Debug] Response status:', response.status)
        console.log('[OneSignal Debug] Response data:', JSON.stringify(data, null, 2))

        if (response.ok) {
          sentCount = data.recipients || 0
          console.log('[OneSignal] ✅ Successfully sent announcement notification:', {
            notificationId: data.id,
            recipients: sentCount,
            announcementId
          })
        } else {
          notificationError = `OneSignal API error: ${response.status} - ${JSON.stringify(data)}`
          console.error('[OneSignal] ❌ Failed to send notification:', {
            status: response.status,
            statusText: response.statusText,
            data,
            payload
          })
        }
      } catch (error) {
        notificationError = error.message
        console.error('[OneSignal] ❌ Exception sending notification:', {
          error: error.message,
          stack: error.stack
        })
      }
    }

    // Update announcement with notification status
    await env.DB.prepare(
      `UPDATE announcements
       SET notification_sent = ?,
           notification_sent_at = CURRENT_TIMESTAMP,
           recipient_count = ?
       WHERE id = ?`
    ).bind(apiKey ? 1 : 0, sentCount, announcementId).run()

    // Get the created announcement
    const { results: announcements } = await env.DB.prepare(
      'SELECT * FROM announcements WHERE id = ?'
    ).bind(announcementId).all()

    return new Response(
      JSON.stringify({
        success: true,
        announcement: announcements[0],
        notificationsSent: sentCount,
        notificationService: 'OneSignal',
        notificationError: notificationError,
        debug: {
          hasApiKey: !!apiKey,
          announcementId
        }
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating announcement:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
