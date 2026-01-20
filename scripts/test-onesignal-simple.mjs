#!/usr/bin/env node

/**
 * Simple OneSignal API Test Script
 * Usage: node scripts/test-onesignal-simple.mjs [API_KEY]
 */

const ONESIGNAL_APP_ID = 'd583c0e5-bae4-452a-be0c-c7c9156b9261'

async function testAPI() {
  const apiKey = process.argv[2] || process.env.ONESIGNAL_REST_API_KEY

  if (!apiKey) {
    console.error('❌ ERROR: API key is required')
    console.log('Usage: node scripts/test-onesignal-simple.mjs YOUR_API_KEY')
    process.exit(1)
  }

  console.log('🧪 Testing OneSignal API Integration\n')
  console.log('App ID:', ONESIGNAL_APP_ID)
  console.log('API Key:', `${apiKey.substring(0, 15)}...\n`)

  const payload = {
    app_id: ONESIGNAL_APP_ID,
    headings: { en: '🧪 Test Notification' },
    contents: { en: 'This is a test notification from the test script!' },
    included_segments: ['All'],
    url: '/'
  }

  console.log('📤 Sending test notification...\n')

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${apiKey}`
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    console.log('Response Status:', response.status, response.statusText)
    console.log('Response Data:', JSON.stringify(data, null, 2))

    if (response.ok) {
      console.log('\n✅ SUCCESS! Notification sent')
      console.log('   Notification ID:', data.id)
      console.log('   Recipients:', data.recipients || 0)

      if (data.recipients === 0) {
        console.log('\n⚠️  WARNING: 0 recipients')
        console.log('   No users are subscribed to push notifications')
      }
    } else {
      console.log('\n❌ FAILED')
      console.log('   Error:', data.errors || data.error || 'Unknown error')
    }
  } catch (error) {
    console.log('\n❌ ERROR:', error.message)
  }
}

testAPI()
