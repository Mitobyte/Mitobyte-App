/**
 * Custom Service Worker with Push Notification Support
 * Compatible with iOS 16.4+, Android, and Desktop
 */

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies'

// Service worker global scope is available as 'self'
// eslint-disable-next-line no-restricted-globals
const sw = self

/**
 * IMPORTANT: Register all event handlers FIRST during initial script evaluation
 * This prevents Chrome's "Event handler must be added on initial evaluation" warning
 */

/**
 * Message Event Handler
 * Handles messages from the main application
 */
sw.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data)

  if (event.data && event.data.type === 'SKIP_WAITING') {
    sw.skipWaiting()
  }

  // Handle test notification request
  if (event.data && event.data.type === 'TEST_NOTIFICATION') {
    sw.registration.showNotification('Test Notification', {
      body: 'This is a test notification from Mitobyte!',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'test-notification',
      requireInteraction: false
    })
  }
})

/**
 * Push Notification Event Handler
 * Handles incoming push notifications from the server
 */
sw.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received:', event)

  let notificationData = {
    title: 'Mitobyte',
    body: 'You have a new notification',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'mitobyte-notification',
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: {
      url: '/'
    }
  }

  // Parse push notification payload
  if (event.data) {
    try {
      const payload = event.data.json()
      console.log('[Service Worker] Push payload:', payload)

      // Update notification data with payload
      if (payload.title) notificationData.title = payload.title
      if (payload.body) notificationData.body = payload.body
      if (payload.message) notificationData.body = payload.message
      if (payload.icon) notificationData.icon = payload.icon
      if (payload.url) notificationData.data.url = payload.url
      if (payload.tag) notificationData.tag = payload.tag
      if (payload.data) notificationData.data = { ...notificationData.data, ...payload.data }

      // iOS-specific: Ensure requireInteraction is appropriate
      if (payload.urgent) {
        notificationData.requireInteraction = true
      }
    } catch (error) {
      console.error('[Service Worker] Error parsing push payload:', error)
    }
  }

  // Show notification
  event.waitUntil(
    sw.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      vibrate: notificationData.vibrate,
      data: notificationData.data,
      // iOS-specific: Add action buttons if needed
      actions: notificationData.data.actions || []
    })
  )
})

/**
 * Notification Click Event Handler
 * Handles user clicks on notifications
 */
sw.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event)

  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/'

  // Handle action buttons
  if (event.action) {
    console.log('[Service Worker] Notification action:', event.action)
    // Handle specific actions if needed
  }

  // Open or focus the app
  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus()
          }
        }

        // No existing window, open a new one
        if (sw.clients.openWindow) {
          return sw.clients.openWindow(urlToOpen)
        }
      })
  )
})

/**
 * Notification Close Event Handler
 * Tracks when users dismiss notifications
 */
sw.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed:', event.notification.tag)

  // Optional: Send analytics event when notification is dismissed
  // This can help track engagement
})

/**
 * Background Sync Handler (Optional)
 * Handles background sync for offline actions
 */
sw.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag)

  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      // Sync logic here - e.g., retry failed notification subscriptions
      Promise.resolve()
    )
  }
})

// Clean up old caches
cleanupOutdatedCaches()

// Precache and route static assets
// eslint-disable-next-line no-restricted-globals
precacheAndRoute(self.__WB_MANIFEST)

// Cache API requests with NetworkFirst strategy
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      {
        cacheWillUpdate: async ({ response }) => {
          if (response && response.status === 200) {
            return response
          }
          return null
        }
      }
    ]
  })
)

// Cache images with StaleWhileRevalidate
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'image-cache',
    plugins: [
      {
        cacheableResponse: {
          statuses: [0, 200]
        }
      }
    ]
  })
)

// Cache fonts with CacheFirst (long-term)
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' ||
               url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      {
        cacheableResponse: {
          statuses: [0, 200]
        }
      }
    ]
  })
)

// Skip waiting and claim clients immediately
sw.skipWaiting()
sw.addEventListener('activate', (event) => {
  event.waitUntil(sw.clients.claim())
})

console.log('[Service Worker] Loaded and ready with push notification support')
