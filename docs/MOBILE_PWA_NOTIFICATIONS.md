# Mobile PWA Push Notifications Guide

Complete guide for implementing push notifications on iOS and Android PWAs.

## Platform Support

### iOS (iPhone/iPad)
- **Minimum Version**: iOS 16.4+ (Released March 2023)
- **Requirements**:
  - PWA must be **installed** to home screen
  - Must be opened from home screen icon (not Safari browser)
  - Manifest must have `"display": "standalone"`
  - Permission must be requested via user interaction
  - HTTPS required

### Android
- **Minimum Version**: Android 5.0+ with Chrome 42+
- **Requirements**:
  - Service Worker support
  - HTTPS required
  - User permission for notifications

### Desktop
- **Supported**: Chrome, Edge, Firefox, Safari (macOS)
- **Requirements**:
  - Service Worker support
  - User permission for notifications

## Critical iOS Requirements

### 1. PWA Must Be Installed

```javascript
// Check if PWA is installed on iOS
function isIOSPWAInstalled() {
  return window.navigator.standalone === true
}

// Or check display mode
function isPWAInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches
}
```

**User Instructions for iOS**:
1. Open the app in Safari
2. Tap the Share button (□ with ↑ arrow)
3. Scroll and tap "Add to Home Screen"
4. Tap "Add" in top right corner
5. Open app from home screen icon
6. Now notifications can be enabled!

### 2. Manifest Configuration

Your `manifest.json` MUST include:

```json
{
  "display": "standalone",
  "name": "Your App Name",
  "short_name": "App",
  "start_url": "/",
  "scope": "/",
  "theme_color": "#yourcolor",
  "background_color": "#yourcolor",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

### 3. Permission Request Must Be User-Initiated

```javascript
// ❌ WRONG - Will fail on iOS
window.addEventListener('load', async () => {
  await Notification.requestPermission()
})

// ✅ CORRECT - Triggered by user click
button.addEventListener('click', async () => {
  const permission = await Notification.requestPermission()
  console.log('Permission:', permission)
})
```

### 4. Service Worker with Push Handler

```javascript
// sw.js - Service worker must handle push events
self.addEventListener('push', (event) => {
  const data = event.data.json()

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: 'notification-tag',
      data: { url: data.url || '/' }
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  )
})
```

## Implementation Checklist

### Setup Phase

- [ ] **HTTPS Enabled** - App must be served over HTTPS
- [ ] **Manifest Configured** - `display: "standalone"` set
- [ ] **Icons Added** - Multiple sizes (192px, 512px minimum)
- [ ] **Service Worker Created** - With push and notificationclick handlers
- [ ] **VAPID Keys Generated** - For Web Push authentication

### iOS-Specific

- [ ] **Install Prompt Added** - Guide users to add to home screen
- [ ] **Standalone Check** - Verify PWA is opened from home screen
- [ ] **Permission Gated** - Only request after PWA is installed
- [ ] **User Interaction** - Permission requested on button click

### Android-Specific

- [ ] **Vibration Support** - Optional vibration patterns
- [ ] **Action Buttons** - Up to 3 action buttons supported
- [ ] **Large Icons** - Support for large icon format

### Testing

- [ ] **iOS Safari** - Test on actual iOS device (simulator won't work)
- [ ] **Android Chrome** - Test on actual Android device
- [ ] **Desktop** - Test on Chrome/Edge/Firefox
- [ ] **Notification Delivery** - Test server-side push sending
- [ ] **Click Handling** - Test opening app from notification

## Platform Detection Code

Use the provided platform detection utilities:

```javascript
import {
  isIOS,
  isAndroid,
  isStandalonePWA,
  isPushNotificationSupported,
  needsIOSInstallPrompt,
  getNotificationStatus,
  getInstallInstructions
} from './utils/platformDetection'

// Check if notifications are supported
const supported = isPushNotificationSupported()

// Check if iOS needs install prompt
if (needsIOSInstallPrompt()) {
  // Show install instructions
  const instructions = getInstallInstructions()
  console.log(instructions.steps)
}

// Get notification status
const status = await getNotificationStatus()
console.log(status.message)
```

## Common Issues & Solutions

### Issue: "Notifications not working on iOS"

**Solutions**:
1. Verify iOS version is 16.4+
2. Check PWA is installed (opened from home screen)
3. Confirm manifest has `"display": "standalone"`
4. Ensure permission requested via user interaction
5. Check Service Worker is active and handling push events

### Issue: "Permission prompt doesn't appear on iOS"

**Causes**:
- PWA not installed to home screen
- Opened in Safari browser instead of standalone
- Permission requested on page load (not user interaction)
- iOS version below 16.4

**Solution**:
```javascript
// Always check before requesting
if (needsIOSInstallPrompt()) {
  alert('Please install the app to your home screen first!')
  return
}

// Then request permission
const permission = await Notification.requestPermission()
```

### Issue: "Notifications work on Android but not iOS"

**Most Common Cause**: PWA not opened in standalone mode

**How to check**:
```javascript
console.log('Standalone:', window.navigator.standalone)
console.log('Display mode:', window.matchMedia('(display-mode: standalone)').matches)

// Both should be true on iOS for notifications to work
```

### Issue: "Service Worker not receiving push events"

**Solutions**:
1. Verify service worker is registered:
```javascript
const registration = await navigator.serviceWorker.ready
console.log('SW registered:', registration)
```

2. Check push subscription:
```javascript
const subscription = await registration.pushManager.getSubscription()
console.log('Subscription:', subscription)
```

3. Verify server is sending proper Web Push format

## Server-Side Push Notification

### Using Cloudflare Workers

```javascript
// functions/api/send-push.js
import { sendPushNotification } from '../utils/webPush'

export async function onRequestPost(context) {
  const { subscription, payload } = await context.request.json()

  const result = await sendPushNotification(
    subscription,
    payload,
    {
      publicKey: context.env.VAPID_PUBLIC_KEY,
      privateKey: context.env.VAPID_PRIVATE_KEY
    },
    'mailto:your@email.com'
  )

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  })
}
```

### Payload Format

```json
{
  "title": "New Event!",
  "body": "Hackathon voting is now open",
  "icon": "/icon-192.png",
  "badge": "/badge-72.png",
  "tag": "event-123",
  "url": "/events/123",
  "urgent": false,
  "data": {
    "eventId": 123,
    "type": "voting"
  }
}
```

## Testing on Real Devices

### iOS Testing

1. **Deploy to HTTPS** - Required for iOS PWA features
2. **Open in Safari** on actual iPhone/iPad (iOS 16.4+)
3. **Add to Home Screen** - Follow iOS install instructions
4. **Open from Home Screen** - Must use standalone mode
5. **Test Notification** - Click enable notifications button
6. **Send Test Push** - From your server/dashboard

### Android Testing

1. **Deploy to HTTPS** - Required for service workers
2. **Open in Chrome** on actual Android device
3. **Test Install Prompt** - May appear automatically
4. **Test Notification** - Permission can be requested anytime
5. **Send Test Push** - From your server/dashboard

### Desktop Testing

1. **Use Chrome DevTools** - Application > Service Workers
2. **Test in Production** - Some features require HTTPS
3. **Send Test Push** - Using browser dev tools or server

## Platform-Specific Best Practices

### iOS

- **Keep it simple**: iOS has stricter notification policies
- **Don't spam**: Users can easily revoke permission
- **Use badges**: Small icon on notification (72x72px)
- **Test thoroughly**: Notifications are the #1 iOS PWA issue
- **Fallback gracefully**: Always check support before enabling

### Android

- **Rich features**: Support images, actions, progress bars
- **Vibration patterns**: Use vibration for important notifications
- **Action buttons**: Up to 3 buttons for quick actions
- **Grouping**: Use `tag` to group related notifications
- **Persistent**: Use `requireInteraction` for critical alerts

### Desktop

- **Badges**: Show notification count on app icon
- **Actions**: Up to 4 action buttons
- **Images**: Support for large images in notifications
- **Persistent**: Desktop notifications can stay longer

## Monitoring & Analytics

Track notification success rates:

```javascript
// Track subscription
await subscribeToPushNotifications(userId)
analytics.track('notification_subscribed', {
  platform: getPlatformName(),
  isStandalone: isStandalonePWA()
})

// Track delivery (server-side)
const result = await sendPush(subscription, payload)
if (result.success) {
  analytics.track('notification_delivered', { userId })
}

// Track clicks (service worker)
self.addEventListener('notificationclick', (event) => {
  // Send to analytics API
  fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify({
      event: 'notification_clicked',
      tag: event.notification.tag
    })
  })
})
```

## Resources

### Official Documentation
- [iOS Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) - WebKit Blog
- [MDN Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) - Mozilla Docs
- [PWA iOS Guidelines](https://developer.apple.com/documentation/webkit/delivering_web_content) - Apple Developer

### Tools
- [VAPID Key Generator](https://vapidkeys.com/) - Generate VAPID keys
- [Push Notification Tester](https://web-push-codelab.glitch.me/) - Test notifications
- [Can I Use](https://caniuse.com/push-api) - Browser support checker

### Debugging
- **iOS**: Safari Developer Tools (macOS Safari > Develop > iPhone)
- **Android**: Chrome DevTools (chrome://inspect#devices)
- **Service Worker**: Application tab > Service Workers in DevTools

## FAQ

### Q: Do notifications work in iOS Safari browser?
**A**: No, only in standalone PWA mode (installed to home screen).

### Q: Can I test notifications in iOS Simulator?
**A**: No, push notifications require actual iOS devices.

### Q: Why do Android notifications work but not iOS?
**A**: Most likely the PWA isn't installed or not opened in standalone mode.

### Q: Can I send notifications without user permission?
**A**: No, user must explicitly grant permission.

### Q: How long do subscriptions last?
**A**: Indefinitely, but they can be revoked by users or expire if inactive.

### Q: Can I send notifications when app is closed?
**A**: Yes! Service workers run in background and handle push events.

### Q: Do I need a native app for better notification support?
**A**: No, PWAs now support rich notifications on iOS 16.4+, Android, and Desktop.

## Support

If notifications aren't working:
1. Check this guide's troubleshooting section
2. Verify all checklist items are complete
3. Test on actual devices (not simulators)
4. Check browser console for errors
5. Verify server-side push is sending correctly

For iOS issues specifically, always verify:
- iOS 16.4+ ✓
- PWA installed ✓
- Opened from home screen ✓
- Manifest has `display: standalone` ✓
