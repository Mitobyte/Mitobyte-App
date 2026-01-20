/**
 * OneSignal Push Notifications Service
 * Using CDN-initialized OneSignal (initialized in index.html)
 *
 * This service provides helper functions to interact with OneSignal
 * which is initialized via CDN script in index.html
 *
 * App ID: d583c0e5-bae4-452a-be0c-c7c9156b9261
 */

import { debugLog, debugError, debugWarn } from '../utils/oneSignalDebug'

// OneSignal App ID (configured in index.html)
const ONESIGNAL_APP_ID = 'd583c0e5-bae4-452a-be0c-c7c9156b9261'

/**
 * Wait for OneSignal to be ready
 */
async function waitForOneSignal() {
  return new Promise((resolve, reject) => {
    // Increase timeout to 30 seconds to account for slow networks
    const timeout = setTimeout(() => {
      debugWarn('OneSignal taking longer than expected to load. This may be due to network conditions or browser extensions.')
      reject(new Error('OneSignal load timeout - check network connection and try again'))
    }, 30000)

    if (window.OneSignal) {
      clearTimeout(timeout)
      resolve(window.OneSignal)
    } else {
      window.OneSignalDeferred = window.OneSignalDeferred || []
      window.OneSignalDeferred.push((OneSignal) => {
        clearTimeout(timeout)
        resolve(OneSignal)
      })
    }
  })
}

/**
 * Check if OneSignal is initialized (always returns true since CDN initializes it)
 * OneSignal is initialized via CDN in index.html
 */
export async function initializeOneSignal() {
  debugLog('initializeOneSignal() called - waiting for CDN initialization')

  try {
    await waitForOneSignal()
    debugLog('✅ OneSignal ready (initialized via CDN)')
    return true
  } catch (error) {
    debugError('❌ OneSignal not available', error)
    return false
  }
}

/**
 * Check if OneSignal is supported on this platform
 */
export function isPushNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

/**
 * Request notification permission and subscribe user
 */
export async function subscribeToPushNotifications(walletAddress) {
  debugLog('subscribeToPushNotifications() called', { walletAddress })

  try {
    const OneSignal = await waitForOneSignal()

    // Request permission
    debugLog('Requesting notification permission...')
    const permission = await OneSignal.Notifications.requestPermission()
    debugLog('Permission result:', permission)

    if (!permission) {
      throw new Error('Notification permission denied')
    }

    // Subscribe to push notifications
    debugLog('Opting in to push notifications...')
    await OneSignal.User.PushSubscription.optIn()
    debugLog('Opted in successfully')

    // Set user identification
    if (walletAddress) {
      debugLog('Setting wallet address identification...')
      await OneSignal.User.addAlias('wallet_address', walletAddress)
      await OneSignal.User.addTag('walletAddress', walletAddress)
      debugLog('✅ Wallet identification set successfully')
    }

    const subscriptionId = OneSignal.User?.PushSubscription?.id
    const userId = OneSignal.User?.onesignalId

    debugLog('✅ Successfully subscribed to push notifications!', {
      subscriptionId,
      userId,
      walletAddress
    })

    return true
  } catch (error) {
    debugError('❌ Subscription failed', error)
    throw error
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications() {
  debugLog('unsubscribeFromPushNotifications() called')

  try {
    const OneSignal = await waitForOneSignal()
    debugLog('Opting out from push notifications...')
    await OneSignal.User.PushSubscription.optOut()
    debugLog('✅ Unsubscribed from push notifications successfully')
    return true
  } catch (error) {
    debugError('❌ Unsubscribe failed', error)
    throw error
  }
}

/**
 * Check if user is subscribed to push notifications
 */
export async function isPushNotificationSubscribed() {
  debugLog('isPushNotificationSubscribed() called')

  try {
    const OneSignal = await waitForOneSignal()
    const isOptedIn = OneSignal.User.PushSubscription.optedIn
    const subscriptionId = OneSignal.User?.PushSubscription?.id

    debugLog('Subscription status:', {
      isOptedIn,
      subscriptionId
    })

    return isOptedIn
  } catch (error) {
    debugError('Error checking subscription', error)
    return false
  }
}

/**
 * Get current notification permission status
 */
export async function getNotificationPermission() {
  if (!isPushNotificationSupported()) {
    return 'unsupported'
  }

  return Notification.permission
}

/**
 * Send a test notification (for development)
 */
export async function testPushNotification() {
  console.log('[OneSignal] Test notifications should be sent from OneSignal dashboard')
  console.log('Visit: https://onesignal.com > Your App > Messages > New Push')

  return {
    message: 'Please send test notifications from OneSignal dashboard'
  }
}

/**
 * Check platform support and return user-friendly status
 */
export async function checkPlatformSupport() {
  const supported = isPushNotificationSupported()
  const permission = await getNotificationPermission()
  const isSubscribed = await isPushNotificationSubscribed()

  return {
    supported,
    permission,
    isSubscribed,
    platform: navigator.userAgent,
    message: supported
      ? 'Push notifications are supported on this device'
      : 'Push notifications are not supported'
  }
}

/**
 * Add event listener for notification clicks
 */
export async function onNotificationClick(callback) {
  try {
    const OneSignal = await waitForOneSignal()
    OneSignal.Notifications.addEventListener('click', callback)
  } catch (error) {
    debugWarn('Could not add click listener', error)
  }
}

/**
 * Remove notification click event listener
 */
export async function offNotificationClick(callback) {
  try {
    const OneSignal = await waitForOneSignal()
    OneSignal.Notifications.removeEventListener('click', callback)
  } catch (error) {
    debugWarn('Could not remove click listener', error)
  }
}

/**
 * Add event listener for permission changes
 */
export async function onPermissionChange(callback) {
  try {
    const OneSignal = await waitForOneSignal()
    OneSignal.Notifications.addEventListener('permissionChange', callback)
  } catch (error) {
    debugWarn('Could not add permission change listener', error)
  }
}

/**
 * Get OneSignal player ID (unique device identifier)
 */
export async function getPlayerId() {
  try {
    const OneSignal = await waitForOneSignal()
    const id = await OneSignal.User.PushSubscription.id
    return id
  } catch (error) {
    debugError('Error getting player ID', error)
    return null
  }
}
