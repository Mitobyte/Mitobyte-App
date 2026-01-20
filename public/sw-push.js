// Push Notification Service Worker
// This handles push notification events

self.addEventListener('push', function(event) {
  console.log('Push notification received:', event)

  let data = {}
  if (event.data) {
    try {
      data = event.data.json()
    } catch (e) {
      data = {
        title: 'Mitobyte Announcement',
        message: event.data.text()
      }
    }
  }

  const title = data.title || 'Mitobyte Announcement'
  const options = {
    body: data.message || 'You have a new announcement',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    tag: 'mitobyte-announcement',
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'View', icon: '/pwa-192x192.png' },
      { action: 'close', title: 'Close', icon: '/pwa-192x192.png' }
    ],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now()
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event)

  event.notification.close()

  if (event.action === 'close') {
    return
  }

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Check if there's already a window open
        for (let client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus()
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
  )
})

self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event)
})
