import {
  isIOS,
  isAndroid,
  isStandalonePWA,
  isPushNotificationSupported,
  needsIOSInstallPrompt,
  getNotificationStatus,
  getNotificationConfig
} from '../utils/platformDetection'

const API_BASE = ''

// Public VAPID key - Generated using web-push library
// To regenerate: node scripts/generate-vapid-keys.js
const PUBLIC_VAPID_KEY = 'BLpAf7fzPPOFEA8EAEkpfZqfAuFgQI82ELDKmInD6cAV42a_IAIk8fDV7JfjdKJ-nTqsXm2FFi_tJ97kE66Jh0c'

/**
 * Request permission for push notifications
 * Handles platform-specific requirements (iOS, Android, Desktop)
 */
export async function requestNotificationPermission() {
  // Check platform support first
  const status = await getNotificationStatus()

  if (!status.supported) {
    console.warn('[Push Notifications] Not supported:', status.message)
    throw new Error(status.message)
  }

  // iOS requires PWA to be installed
  if (needsIOSInstallPrompt()) {
    throw new Error('Please install the app to your home screen to enable notifications')
  }

  // Check if permission already granted or denied
  if (status.permission === 'granted') {
    return true
  }

  if (status.permission === 'denied') {
    throw new Error('Notification permission was denied. Please enable notifications in your browser settings.')
  }

  try {
    // Request permission - MUST be triggered by user interaction
    const permission = await Notification.requestPermission()
    console.log('[Push Notifications] Permission response:', permission)

    if (permission === 'granted') {
      return true
    } else {
      throw new Error('Notification permission not granted')
    }
  } catch (error) {
    console.error('[Push Notifications] Error requesting permission:', error)
    throw error
  }
}

/**
 * Convert base64 string to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Subscribe user to push notifications
 */
export async function subscribeToPushNotifications(walletAddress) {
  try {
    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers are not supported')
    }

    // Check if push notifications are supported
    if (!('PushManager' in window)) {
      throw new Error('Push notifications are not supported')
    }

    // Request permission
    const permissionGranted = await requestNotificationPermission()
    if (!permissionGranted) {
      throw new Error('Notification permission denied')
    }

    // Register service worker if not already registered
    let registration = await navigator.serviceWorker.getRegistration()

    if (!registration) {
      // Use the existing PWA service worker registration
      registration = await navigator.serviceWorker.ready
    }

    console.log('Service worker ready:', registration)

    // Subscribe to push notifications
    const applicationServerKey = urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    })

    console.log('Push subscription created:', subscription)

    // Send subscription to server
    const response = await fetch(`${API_BASE}/api/push-subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        walletAddress,
        subscription: subscription.toJSON()
      })
    })

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'Failed to save subscription')
    }

    console.log('Push subscription saved successfully')
    return subscription
  } catch (error) {
    console.error('Error subscribing to push notifications:', error)
    throw error
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications() {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      // Unsubscribe from push service
      await subscription.unsubscribe()

      // Remove from server
      await fetch(`${API_BASE}/api/push-subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
        method: 'DELETE'
      })

      console.log('Unsubscribed from push notifications')
      return true
    }

    return false
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error)
    throw error
  }
}

/**
 * Check if user is subscribed to push notifications
 */
export async function isPushNotificationSubscribed() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    return subscription !== null
  } catch (error) {
    console.error('Error checking push subscription:', error)
    return false
  }
}

/**
 * Test push notification (for development)
 * Uses platform-specific configuration
 */
export async function testPushNotification() {
  try {
    const permissionGranted = await requestNotificationPermission()
    if (!permissionGranted) {
      throw new Error('Notification permission denied')
    }

    // Get platform-specific configuration
    const config = getNotificationConfig()

    // Show a test notification with platform-specific settings
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification('Test Notification', {
      body: 'This is a test notification from Mitobyte!',
      icon: config.icon,
      badge: config.badge,
      vibrate: config.vibrate || undefined,
      tag: 'test-notification',
      requireInteraction: config.requireInteraction,
      data: {
        url: '/',
        timestamp: Date.now()
      }
    })

    console.log('[Push Notifications] Test notification shown')
    return true
  } catch (error) {
    console.error('[Push Notifications] Error showing test notification:', error)
    throw error
  }
}

/**
 * Check platform support and return user-friendly message
 */
export async function checkPlatformSupport() {
  const status = await getNotificationStatus()

  return {
    supported: status.supported,
    permission: status.permission,
    message: status.message,
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    isStandalone: isStandalonePWA(),
    needsInstall: needsIOSInstallPrompt()
  }
}
