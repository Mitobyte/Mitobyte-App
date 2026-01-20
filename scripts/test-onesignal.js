#!/usr/bin/env node

/**
 * OneSignal API Test Script
 *
 * This script tests the OneSignal REST API integration
 * Usage: node scripts/test-onesignal.js [API_KEY]
 */

import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const ONESIGNAL_APP_ID = 'd583c0e5-bae4-452a-be0c-c7c9156b9261'

async function testOneSignalAPI(apiKey) {
  console.log('🧪 Testing OneSignal API Integration\n')
  console.log('App ID:', ONESIGNAL_APP_ID)
  console.log('API Key:', apiKey ? `${apiKey.substring(0, 15)}...` : '❌ NOT PROVIDED\n')

  if (!apiKey) {
    console.error('❌ ERROR: API key is required')
    console.log('\nUsage: node scripts/test-onesignal.js YOUR_API_KEY')
    console.log('   or: ONESIGNAL_REST_API_KEY=your_key node scripts/test-onesignal.js')
    process.exit(1)
  }

  // Test 1: Send a test notification
  console.log('\n📤 Test 1: Sending test notification...')

  const payload = {
    app_id: ONESIGNAL_APP_ID,
    headings: { en: '🧪 Test Notification' },
    contents: { en: 'This is a test notification from the OneSignal test script!' },
    included_segments: ['All'],
    url: '/'
  }

  console.log('Payload:', JSON.stringify(payload, null, 2))

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

    console.log('\nResponse Status:', response.status, response.statusText)
    console.log('Response Data:', JSON.stringify(data, null, 2))

    if (response.ok) {
      console.log('\n✅ SUCCESS! Notification sent')
      console.log('   Notification ID:', data.id)
      console.log('   Recipients:', data.recipients || 0)

      if (data.recipients === 0) {
        console.log('\n⚠️  WARNING: 0 recipients - no users are subscribed to push notifications')
        console.log('   Make sure users have:')
        console.log('   1. Granted notification permissions in their browser')
        console.log('   2. Subscribed to OneSignal push notifications')
      }

      return true
    } else {
      console.log('\n❌ FAILED to send notification')
      console.log('   Error:', data.errors || data.error || 'Unknown error')

      if (response.status === 400) {
        console.log('\n💡 Possible issues:')
        console.log('   - Invalid API key format')
        console.log('   - Invalid App ID')
        console.log('   - Invalid payload structure')
      } else if (response.status === 401) {
        console.log('\n💡 Possible issues:')
        console.log('   - Incorrect API key')
        console.log('   - API key doesn\'t match the App ID')
      }

      return false
    }
  } catch (error) {
    console.log('\n❌ ERROR:', error.message)
    console.log('   Stack:', error.stack)
    return false
  }
}

// Test 2: View app info (if API supports it)
async function getAppInfo(apiKey) {
  console.log('\n\n📊 Test 2: Fetching app information...')

  try {
    const response = await fetch(`https://onesignal.com/api/v1/apps/${ONESIGNAL_APP_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${apiKey}`
      }
    })

    const data = await response.json()

    if (response.ok) {
      console.log('✅ App info retrieved')
      console.log('   Name:', data.name)
      console.log('   Players (subscribed users):', data.players)
      console.log('   Messageable players:', data.messageable_players)
      console.log('   Updated at:', data.updated_at)
    } else {
      console.log('⚠️  Could not retrieve app info')
      console.log('   This is optional and doesn\'t affect notifications')
    }
  } catch (error) {
    console.log('⚠️  Could not retrieve app info:', error.message)
    console.log('   This is optional and doesn\'t affect notifications')
  }
}

// Main execution
async function main() {
  // Get API key from command line arg or environment variable
  const apiKey = process.argv[2] || process.env.ONESIGNAL_REST_API_KEY

  const success = await testOneSignalAPI(apiKey)

  if (success) {
    await getAppInfo(apiKey)
    console.log('\n\n🎉 All tests completed successfully!')
    console.log('✅ Your OneSignal integration is working correctly\n')
  } else {
    console.log('\n\n❌ Tests failed - please check the errors above\n')
    process.exit(1)
  }
}

// Run if called directly (ES module compatible)
// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { testOneSignalAPI, getAppInfo }
