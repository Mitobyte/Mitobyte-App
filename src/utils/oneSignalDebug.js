/**
 * OneSignal Debug Utilities
 * Comprehensive debugging and logging for OneSignal integration
 */

// Debug mode - set to true to enable verbose logging
export const DEBUG_ENABLED = true

// Debug log prefix
const PREFIX = '[OneSignal Debug]'

/**
 * Debug logger with timestamps
 */
export function debugLog(message, data = null) {
  if (!DEBUG_ENABLED) return

  const timestamp = new Date().toISOString()
  const logMessage = `${PREFIX} [${timestamp}] ${message}`

  if (data) {
    console.log(logMessage, data)
  } else {
    console.log(logMessage)
  }
}

/**
 * Debug error logger
 */
export function debugError(message, error = null) {
  const timestamp = new Date().toISOString()
  const logMessage = `${PREFIX} [${timestamp}] ERROR: ${message}`

  if (error) {
    console.error(logMessage, error)
  } else {
    console.error(logMessage)
  }
}

/**
 * Debug warn logger
 */
export function debugWarn(message, data = null) {
  if (!DEBUG_ENABLED) return

  const timestamp = new Date().toISOString()
  const logMessage = `${PREFIX} [${timestamp}] WARNING: ${message}`

  if (data) {
    console.warn(logMessage, data)
  } else {
    console.warn(logMessage)
  }
}

/**
 * Get comprehensive OneSignal status
 */
export async function getOneSignalDebugInfo() {
  const info = {
    timestamp: new Date().toISOString(),
    browser: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    },
    notifications: {
      supported: 'Notification' in window,
      permission: window.Notification?.permission || 'unknown',
      serviceWorkerSupported: 'serviceWorker' in navigator,
      pushManagerSupported: 'PushManager' in window
    },
    oneSignal: {
      sdkLoaded: typeof window.OneSignal !== 'undefined',
      sdkVersion: null,
      initialized: false,
      subscriptionState: null,
      userId: null,
      pushToken: null,
      tags: null
    },
    serviceWorker: {
      controller: null,
      ready: false,
      registrations: []
    }
  }

  // Check if OneSignal SDK is loaded
  if (window.OneSignal) {
    try {
      info.oneSignal.sdkLoaded = true

      // Try to get OneSignal state
      const OneSignal = await new Promise((resolve) => {
        if (window.OneSignal) {
          resolve(window.OneSignal)
        } else {
          window.OneSignalDeferred = window.OneSignalDeferred || []
          window.OneSignalDeferred.push(resolve)
        }
      })

      // Get subscription state
      try {
        info.oneSignal.subscriptionState = {
          optedIn: OneSignal.User?.PushSubscription?.optedIn || false,
          id: OneSignal.User?.PushSubscription?.id || null,
          token: OneSignal.User?.PushSubscription?.token || null
        }
      } catch (e) {
        debugWarn('Could not get subscription state', e)
      }

      // Get user ID
      try {
        info.oneSignal.userId = OneSignal.User?.onesignalId || null
      } catch (e) {
        debugWarn('Could not get user ID', e)
      }

      // Get tags
      try {
        info.oneSignal.tags = OneSignal.User?.getTags() || null
      } catch (e) {
        debugWarn('Could not get tags', e)
      }

    } catch (error) {
      debugError('Error getting OneSignal info', error)
    }
  }

  // Get service worker info
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        info.serviceWorker.controller = registration.active?.state || null
        info.serviceWorker.ready = true
      }

      const registrations = await navigator.serviceWorker.getRegistrations()
      info.serviceWorker.registrations = registrations.map(reg => ({
        scope: reg.scope,
        state: reg.active?.state || 'unknown',
        scriptURL: reg.active?.scriptURL || null
      }))
    } catch (error) {
      debugError('Error getting service worker info', error)
    }
  }

  return info
}

/**
 * Log full debug info to console
 */
export async function logFullDebugInfo() {
  debugLog('=== OneSignal Full Debug Info ===')
  const info = await getOneSignalDebugInfo()
  console.table(info.browser)
  console.table(info.notifications)
  console.table(info.oneSignal)
  console.table(info.serviceWorker)
  debugLog('Full debug object:', info)
  return info
}

/**
 * Test OneSignal initialization
 */
export async function testOneSignalInit() {
  debugLog('Testing OneSignal initialization...')

  if (!window.OneSignal) {
    debugError('OneSignal SDK not loaded! Check if script tag is in index.html')
    return false
  }

  try {
    const OneSignal = await new Promise((resolve, reject) => {
      if (window.OneSignal) {
        resolve(window.OneSignal)
      } else {
        const timeout = setTimeout(() => {
          reject(new Error('OneSignal SDK load timeout'))
        }, 10000)

        window.OneSignalDeferred = window.OneSignalDeferred || []
        window.OneSignalDeferred.push((os) => {
          clearTimeout(timeout)
          resolve(os)
        })
      }
    })

    debugLog('OneSignal SDK loaded successfully', OneSignal)
    return true
  } catch (error) {
    debugError('OneSignal SDK failed to load', error)
    return false
  }
}

/**
 * Monitor OneSignal events
 */
export function setupOneSignalEventMonitoring() {
  if (!DEBUG_ENABLED) return

  debugLog('Setting up OneSignal event monitoring...')

  window.OneSignalDeferred = window.OneSignalDeferred || []
  window.OneSignalDeferred.push(async function(OneSignal) {
    debugLog('OneSignal ready, setting up event listeners')

    // Monitor permission changes
    try {
      OneSignal.Notifications.addEventListener('permissionChange', (permission) => {
        debugLog('Permission changed:', permission)
      })
    } catch (e) {
      debugWarn('Could not add permission change listener', e)
    }

    // Monitor subscription changes
    try {
      OneSignal.User.PushSubscription.addEventListener('change', (change) => {
        debugLog('Subscription changed:', change)
      })
    } catch (e) {
      debugWarn('Could not add subscription change listener', e)
    }

    // Monitor notification clicks
    try {
      OneSignal.Notifications.addEventListener('click', (event) => {
        debugLog('Notification clicked:', event)
      })
    } catch (e) {
      debugWarn('Could not add notification click listener', e)
    }

    // Monitor notification display
    try {
      OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
        debugLog('Notification will display:', event)
      })
    } catch (e) {
      debugWarn('Could not add foreground display listener', e)
    }

    debugLog('Event monitoring setup complete')
  })
}

/**
 * Export debug info as downloadable JSON
 */
export async function downloadDebugInfo() {
  const info = await getOneSignalDebugInfo()
  const json = JSON.stringify(info, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `onesignal-debug-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  debugLog('Debug info downloaded')
}

/**
 * Check for common issues
 */
export async function diagnoseIssues() {
  debugLog('Running diagnostics...')
  const issues = []

  // Check if HTTPS
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    issues.push({
      severity: 'error',
      message: 'Site must be served over HTTPS for push notifications to work',
      fix: 'Deploy to HTTPS or use localhost for testing'
    })
  }

  // Check if SDK loaded
  if (!window.OneSignal) {
    issues.push({
      severity: 'error',
      message: 'OneSignal SDK not loaded',
      fix: 'Check if <script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"> is in index.html'
    })
  }

  // Check notification support
  if (!('Notification' in window)) {
    issues.push({
      severity: 'error',
      message: 'Browser does not support notifications',
      fix: 'Use a modern browser (Chrome, Firefox, Edge, Safari)'
    })
  }

  // Check permission
  if (window.Notification && Notification.permission === 'denied') {
    issues.push({
      severity: 'warning',
      message: 'Notification permission denied',
      fix: 'User needs to enable notifications in browser settings'
    })
  }

  // Check service worker
  if (!('serviceWorker' in navigator)) {
    issues.push({
      severity: 'error',
      message: 'Service Worker not supported',
      fix: 'Use a modern browser with Service Worker support'
    })
  }

  if (issues.length === 0) {
    debugLog('✅ No issues found - OneSignal should work correctly')
  } else {
    debugError(`Found ${issues.length} issue(s):`)
    issues.forEach((issue, i) => {
      console.error(`${i + 1}. [${issue.severity.toUpperCase()}] ${issue.message}`)
      console.error(`   Fix: ${issue.fix}`)
    })
  }

  return issues
}

// Don't auto-setup event monitoring - wait for OneSignal to load first
// Call setupOneSignalEventMonitoring() manually after OneSignal loads
// Or access it via: window.OneSignalDebug.setupMonitoring()
