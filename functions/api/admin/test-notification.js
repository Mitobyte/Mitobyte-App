import { isAdmin } from '../../utils/adminAuth'

/**
 * Test OneSignal notification endpoint
 * POST /api/admin/test-notification
 *
 * This helps verify that OneSignal is properly configured and can send notifications
 */
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json()
    const { adminEmail } = body

    // Check admin authorization
    if (!adminEmail || !isAdmin(adminEmail)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const ONESIGNAL_APP_ID = 'd583c0e5-bae4-452a-be0c-c7c9156b9261'
    const apiKey = env.ONESIGNAL_REST_API_KEY

    console.log('[Test Notification] Starting test', {
      hasApiKey: !!apiKey,
      appId: ONESIGNAL_APP_ID
    })

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'ONESIGNAL_REST_API_KEY not configured',
          details: 'Set the environment variable in Cloudflare Pages'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Build test notification payload
    const payload = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: '🧪 Test Notification' },
      contents: { en: 'This is a test notification from Mitobyte admin dashboard!' },
      included_segments: ['All'],
      url: '/'
    }

    console.log('[Test Notification] Sending payload:', JSON.stringify(payload, null, 2))

    // Send test notification
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${apiKey}`
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    console.log('[Test Notification] Response status:', response.status)
    console.log('[Test Notification] Response data:', JSON.stringify(data, null, 2))

    if (response.ok) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Test notification sent successfully!',
          notificationId: data.id,
          recipients: data.recipients || 0,
          details: data
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to send test notification',
          status: response.status,
          details: data
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('[Test Notification] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

/**
 * GET endpoint to show API documentation
 */
export async function onRequestGet() {
  return new Response(
    JSON.stringify({
      endpoint: '/api/admin/test-notification',
      method: 'POST',
      description: 'Send a test notification to all subscribed users via OneSignal',
      requiredBody: {
        adminEmail: 'admin@example.com'
      },
      example: {
        body: {
          adminEmail: 'aaron@mitobyte.com'
        }
      }
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}
