/**
 * Platform Detection Utilities
 * Detects iOS, Android, and other platforms for PWA-specific features
 */

/**
 * Detect if the app is running on iOS
 */
export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

/**
 * Detect if the app is running on Android
 */
export function isAndroid() {
  return /Android/.test(navigator.userAgent)
}

/**
 * Detect if the app is running as a standalone PWA (installed)
 */
export function isStandalonePWA() {
  // iOS PWA detection
  if (window.navigator.standalone) {
    return true
  }

  // Android and other browsers
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true
  }

  // Fallback check
  return document.referrer.includes('android-app://')
}

/**
 * Check if push notifications are supported on this platform
 */
export function isPushNotificationSupported() {
  // Basic browser support
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false
  }

  // iOS specific check
  if (isIOS()) {
    // iOS 16.4+ supports Web Push, but only in standalone mode
    const iosVersion = getIOSVersion()

    if (iosVersion && iosVersion >= 16.4) {
      // Must be in standalone mode for iOS
      return isStandalonePWA()
    }

    // Older iOS versions don't support Web Push
    return false
  }

  // Android and desktop support
  return true
}

/**
 * Get iOS version number
 */
export function getIOSVersion() {
  if (!isIOS()) return null

  const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/)
  if (match) {
    const major = parseInt(match[1], 10)
    const minor = parseInt(match[2], 10)
    return parseFloat(`${major}.${minor}`)
  }

  return null
}

/**
 * Get Android version number
 */
export function getAndroidVersion() {
  if (!isAndroid()) return null

  const match = navigator.userAgent.match(/Android (\d+)\.(\d+)/)
  if (match) {
    const major = parseInt(match[1], 10)
    const minor = parseInt(match[2], 10)
    return parseFloat(`${major}.${minor}`)
  }

  return null
}

/**
 * Detect if app can be installed (show install prompt)
 */
export function canInstallPWA() {
  // iOS - check if already installed
  if (isIOS()) {
    return !isStandalonePWA()
  }

  // Android and other browsers - relies on beforeinstallprompt event
  return true
}

/**
 * Get user-friendly platform name
 */
export function getPlatformName() {
  if (isIOS()) {
    return 'iOS'
  }
  if (isAndroid()) {
    return 'Android'
  }
  if (/Mac/i.test(navigator.userAgent)) {
    return 'macOS'
  }
  if (/Win/i.test(navigator.userAgent)) {
    return 'Windows'
  }
  if (/Linux/i.test(navigator.userAgent)) {
    return 'Linux'
  }
  return 'Unknown'
}

/**
 * Get platform-specific install instructions
 */
export function getInstallInstructions() {
  if (isIOS()) {
    return {
      platform: 'iOS',
      steps: [
        'Tap the Share button (square with arrow)',
        'Scroll down and tap "Add to Home Screen"',
        'Tap "Add" in the top right corner'
      ],
      icon: '📱'
    }
  }

  if (isAndroid()) {
    return {
      platform: 'Android',
      steps: [
        'Tap the menu button (three dots)',
        'Tap "Add to Home screen" or "Install app"',
        'Tap "Add" or "Install"'
      ],
      icon: '🤖'
    }
  }

  return {
    platform: 'Desktop',
    steps: [
      'Click the install icon in the address bar',
      'Or use the browser menu to install',
      'The app will open in its own window'
    ],
    icon: '💻'
  }
}

/**
 * Check if notifications need special prompting for iOS
 */
export function needsIOSInstallPrompt() {
  return isIOS() && !isStandalonePWA()
}

/**
 * Check if device supports vibration API
 */
export function supportsVibration() {
  return 'vibrate' in navigator
}

/**
 * Get notification permission status with platform context
 */
export async function getNotificationStatus() {
  if (!('Notification' in window)) {
    return {
      supported: false,
      permission: 'unsupported',
      message: 'Notifications are not supported on this browser'
    }
  }

  const permission = Notification.permission

  // iOS-specific messages
  if (isIOS()) {
    const iosVersion = getIOSVersion()

    if (!iosVersion || iosVersion < 16.4) {
      return {
        supported: false,
        permission: 'unsupported',
        message: 'Notifications require iOS 16.4 or later'
      }
    }

    if (!isStandalonePWA()) {
      return {
        supported: false,
        permission: 'requires-install',
        message: 'Install the app to your home screen to enable notifications'
      }
    }
  }

  return {
    supported: true,
    permission,
    message: permission === 'granted' ? 'Notifications enabled' :
             permission === 'denied' ? 'Notifications blocked' :
             'Notifications not yet enabled'
  }
}

/**
 * Platform-specific notification configuration
 */
export function getNotificationConfig() {
  const baseConfig = {
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    requireInteraction: false
  }

  if (isIOS()) {
    return {
      ...baseConfig,
      // iOS prefers shorter notification duration
      requireInteraction: false,
      // iOS has limited action button support
      maxActions: 2
    }
  }

  if (isAndroid()) {
    return {
      ...baseConfig,
      // Android supports vibration well
      vibrate: [200, 100, 200],
      // Android supports more action buttons
      maxActions: 3
    }
  }

  return {
    ...baseConfig,
    vibrate: [200, 100, 200],
    maxActions: 4
  }
}
