/**
 * Send Push Notification via OneSignal REST API
 *
 * This endpoint allows sending push notifications to users
 * from the server side using the OneSignal REST API.
 *
 * Usage:
 *   POST /api/send-notification
 *   Body: {
 *     title: "Event Reminder",
 *     message: "Voting ends in 1 hour!",
 *     url: "/events/123",
 *     walletAddresses: ["0x1234..."] // Optional: target specific users
 *   }
 *
 * Setup:
 *   Set ONESIGNAL_REST_API_KEY in Cloudflare Pages environment variables
 *   Your key: os_v2_app_ghuh3ppyffcgbmbmiy3qcmjregfpeapbjczu2km7r4s3keaygagx4zu6frxyrdymhj3ixliazibkeq5adxceehu4mf3r7klaxnpjfhy
 */

const ONESIGNAL_APP_ID = '31e87dbd-f829-4460-b02c-463701313121'

export async function onRequestPost(context) {
  const { env, request } = context

  try {
    // Get OneSignal REST API key from environment
    const apiKey = env.ONESIGNAL_REST_API_KEY

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'OneSignal REST API key not configured. Set ONESIGNAL_REST_API_KEY in environment variables.'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    const { title, message, url, walletAddresses, sendToAll } = await request.json()

    if (!title || !message) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Title and message are required'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Build OneSignal notification payload
    const payload = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: message },
    }

    // Add URL if provided
    if (url) {
      payload.url = url
    }

    // Target specific users by wallet address or send to all
    if (walletAddresses && walletAddresses.length > 0) {
      // Send to specific users (identified by wallet address)
      payload.include_external_user_ids = walletAddresses
    } else if (sendToAll) {
      // Send to all subscribed users
      payload.included_segments = ['All']
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Must provide either walletAddresses or set sendToAll: true'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

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

    if (!response.ok) {
      console.error('[OneSignal API] Error:', data)
      return new Response(
        JSON.stringify({
          success: false,
          error: data.errors || 'Failed to send notification',
          details: data
        }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Success
    return new Response(
      JSON.stringify({
        success: true,
        notificationId: data.id,
        recipients: data.recipients,
        message: 'Notification sent successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('[OneSignal API] Error sending notification:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

/**
 * GET /api/send-notification - Return API documentation
 */
export async function onRequestGet() {
  return new Response(
    JSON.stringify({
      endpoint: '/api/send-notification',
      method: 'POST',
      description: 'Send push notifications via OneSignal',
      requiredBody: {
        title: 'Notification title',
        message: 'Notification message'
      },
      optionalBody: {
        url: 'URL to open when notification is clicked',
        walletAddresses: ['0x1234...', '0x5678...'],
        sendToAll: true
      },
      examples: [
        {
          description: 'Send to specific users',
          body: {
            title: 'Event Reminder',
            message: 'Voting ends in 1 hour!',
            url: '/events/123',
            walletAddresses: ['0x1234...']
          }
        },
        {
          description: 'Send to all users',
          body: {
            title: 'Community Update',
            message: 'New hackathon announced!',
            url: '/events',
            sendToAll: true
          }
        }
      ],
      setup: 'Set ONESIGNAL_REST_API_KEY in Cloudflare Pages environment variables'
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}
