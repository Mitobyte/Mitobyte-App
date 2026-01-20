# OneSignal Push Notifications Setup

This app uses OneSignal for push notifications, which provides a much simpler alternative to custom service workers with automatic iOS, Android, and Desktop support.

## Why OneSignal?

### Problems with Custom Service Workers:
- Complex iOS requirements (16.4+, standalone mode, home screen installation)
- Manual platform detection and handling
- VAPID key management
- Service worker complexity
- Cross-platform compatibility issues

### Benefits of OneSignal:
- **Automatic Platform Support**: Works on iOS, Android, and Desktop without platform-specific code
- **No iOS Installation Required**: Notifications work in browser, no home screen installation needed
- **Managed Infrastructure**: OneSignal handles delivery, retries, and scaling
- **Easy Setup**: 5-minute integration with minimal code
- **Free Tier**: Unlimited mobile push + 10,000 web push subscribers/month
- **Dashboard**: Send test notifications and view analytics from web interface
- **Rich Features**: Segmentation, A/B testing, automation, analytics included

## Setup Instructions

### 1. Create OneSignal Account

1. Go to [https://onesignal.com](https://onesignal.com)
2. Click "Get Started" and sign up for free account
3. Verify your email

### 2. Create New App

1. In OneSignal dashboard, click "New App/Website"
2. Enter app name: "Mitobyte"
3. Select platform: **Web Push**
4. Click "Create"

### 3. Configure Web Push

1. In the Web Push configuration:
   - **Site Name**: Mitobyte - Milwaukee Tech Community
   - **Site URL (HTTPS)**: https://mitobyte-voting.pages.dev
   - **Auto Resubscribe**: Enable (recommended)
   - **Default Icon URL**: https://mitobyte-voting.pages.dev/pwa-192x192.png

2. Click "Save" to complete setup

### 4. Get Your App ID

1. In OneSignal dashboard, click "Settings" in left sidebar
2. Under "Keys & IDs" section, find **OneSignal App ID**
3. Copy this ID (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### 5. Configure Environment Variable

#### For Local Development:

Create or update `.env.local` file in project root:

```bash
VITE_ONESIGNAL_APP_ID=your-app-id-here
```

Replace `your-app-id-here` with your actual OneSignal App ID.

#### For Production (Cloudflare Pages):

1. Go to Cloudflare Dashboard
2. Navigate to **Pages** > **mitobyte-voting**
3. Click **Settings** > **Environment variables**
4. Click **Add variable**:
   - **Variable name**: `VITE_ONESIGNAL_APP_ID`
   - **Value**: Your OneSignal App ID
   - **Environment**: Production (and Preview if desired)
5. Click **Save**
6. Redeploy your application for changes to take effect

### 6. Test Notifications

#### Option A: From OneSignal Dashboard

1. In OneSignal dashboard, click **Messages** > **New Push**
2. Click **New Message** button
3. Fill in:
   - **Title**: Test Notification
   - **Message**: This is a test from OneSignal!
4. Under "Send To", select **All Subscribers**
5. Click **Review & Send** > **Send Message**

#### Option B: From Your App

1. Open your app: https://mitobyte-voting.pages.dev
2. Connect wallet (or login)
3. Enable notifications when prompted (or go to Settings)
4. Use OneSignal dashboard to send test notification

### 7. Send Programmatic Notifications

OneSignal provides a REST API for sending notifications from your backend.

#### Get API Key:

1. In OneSignal dashboard, go to **Settings** > **Keys & IDs**
2. Copy **REST API Key**

#### Store API Key in Cloudflare:

1. Go to Cloudflare Pages > Settings > Environment variables
2. Add variable:
   - **Name**: `ONESIGNAL_API_KEY`
   - **Value**: Your REST API Key
   - Mark as **Secret** ✓

#### Send Notification via API:

```javascript
// Example: functions/api/send-notification.js
export async function onRequestPost(context) {
  const { env } = context
  const { title, message, userIds, url } = await context.request.json()

  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${env.ONESIGNAL_API_KEY}`
    },
    body: JSON.stringify({
      app_id: env.VITE_ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: message },
      url: url,
      include_external_user_ids: userIds // Or use other targeting
    })
  })

  const data = await response.json()
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  })
}
```

## Usage in App

The OneSignal integration is already implemented in the codebase:

### Initialization

OneSignal is automatically initialized when the app loads (in `src/main.jsx`).

### Enable Notifications

Users can enable notifications in two ways:

1. **Notification Prompt**: Shows automatically 2 seconds after login
2. **Settings Page**: Toggle "Push Notifications" switch

### Subscribing Users

When a user enables notifications, their wallet address is set as their OneSignal external user ID:

```javascript
// Automatically handled by our service
await subscribeToPushNotifications(walletAddress)

// This does:
// 1. Request notification permission
// 2. Subscribe to push notifications
// 3. Set wallet address as user ID in OneSignal
// 4. Add wallet address tag for targeting
```

### Sending Targeted Notifications

Use OneSignal's targeting features to send notifications to specific users:

#### By Wallet Address:
```javascript
// Send to specific user
fetch('https://onesignal.com/api/v1/notifications', {
  headers: { 'Authorization': `Basic ${API_KEY}` },
  body: JSON.stringify({
    app_id: APP_ID,
    include_external_user_ids: ['0x1234...'], // Wallet address
    headings: { en: 'Event Reminder' },
    contents: { en: 'Voting ends in 1 hour!' }
  })
})
```

#### By Tags:
```javascript
// Send to all users with specific tag
fetch('https://onesignal.com/api/v1/notifications', {
  headers: { 'Authorization': `Basic ${API_KEY}` },
  body: JSON.stringify({
    app_id: APP_ID,
    filters: [
      { field: 'tag', key: 'walletAddress', relation: 'exists' }
    ],
    headings: { en: 'Community Update' },
    contents: { en: 'New hackathon announced!' }
  })
})
```

## Features Available

### Push Notification Features:
- ✅ iOS Support (no installation required)
- ✅ Android Support
- ✅ Desktop Support (Chrome, Edge, Firefox, Safari)
- ✅ Rich Notifications (images, action buttons)
- ✅ Click tracking and analytics
- ✅ Delivery confirmation
- ✅ Automatic retries

### OneSignal Dashboard Features:
- ✅ Send test notifications
- ✅ View subscriber count
- ✅ Analytics (sent, delivered, clicked)
- ✅ Segmentation (target specific users)
- ✅ Automation (trigger-based notifications)
- ✅ A/B Testing
- ✅ Message history

### Code Features:
- ✅ Simple API (3 main functions)
- ✅ Automatic initialization
- ✅ User identification by wallet address
- ✅ Subscribe/unsubscribe management
- ✅ Platform detection built-in

## API Reference

### Main Functions

#### `initializeOneSignal()`
Initializes OneSignal SDK. Called automatically on app load.

```javascript
import { initializeOneSignal } from './services/oneSignalNotifications'
await initializeOneSignal()
```

#### `subscribeToPushNotifications(walletAddress)`
Requests permission and subscribes user to push notifications.

```javascript
import { subscribeToPushNotifications } from './services/oneSignalNotifications'
await subscribeToPushNotifications('0x1234...')
```

#### `unsubscribeFromPushNotifications()`
Unsubscribes user from push notifications.

```javascript
import { unsubscribeFromPushNotifications } from './services/oneSignalNotifications'
await unsubscribeFromPushNotifications()
```

#### `isPushNotificationSubscribed()`
Checks if user is currently subscribed.

```javascript
import { isPushNotificationSubscribed } from './services/oneSignalNotifications'
const isSubscribed = await isPushNotificationSubscribed()
```

## Testing Checklist

- [ ] OneSignal account created
- [ ] App ID configured in environment variables
- [ ] Local development: notifications working
- [ ] Production: environment variable set in Cloudflare
- [ ] Production: notifications working
- [ ] Dashboard: can send test notification
- [ ] App: notification prompt appears
- [ ] App: can enable/disable in settings
- [ ] Analytics: can see subscriber count in dashboard

## Troubleshooting

### "App ID not configured" error

**Cause**: Environment variable not set

**Solution**:
1. Check `.env.local` has `VITE_ONESIGNAL_APP_ID`
2. For production, check Cloudflare Pages environment variables
3. Restart dev server after adding environment variable

### Notifications not appearing

**Cause**: Browser permission denied

**Solution**:
1. Check browser notification permissions
2. In browser settings, allow notifications for your site
3. Try in incognito/private mode to reset permissions

### "Already initialized" warning

**Cause**: OneSignal initialized multiple times (usually harmless)

**Solution**: This is just a warning. OneSignal prevents double initialization.

### Subscribers not showing in dashboard

**Cause**: Users haven't enabled notifications yet

**Solution**:
1. Make sure you've enabled notifications in the app
2. Wait a few seconds for sync to OneSignal
3. Refresh OneSignal dashboard

## Migration from Custom Service Worker

If you previously used the custom service worker approach:

### Old Files (can be removed or kept for reference):
- `src/services/pushNotifications.js` (replaced by `oneSignalNotifications.js`)
- `src/utils/platformDetection.js` (no longer needed)
- `MOBILE_PWA_NOTIFICATIONS.md` (reference only)

### New Files:
- `src/services/oneSignalNotifications.js` (new)
- `ONESIGNAL_SETUP.md` (this file)

### What Changed:
- Simpler API (3 functions vs complex platform detection)
- No iOS standalone mode requirement
- No manual VAPID keys
- No custom service worker maintenance
- Better cross-platform support

## Resources

- [OneSignal Web Push Quickstart](https://documentation.onesignal.com/docs/web-push-quickstart)
- [OneSignal REST API](https://documentation.onesignal.com/reference/create-notification)
- [OneSignal React Library](https://github.com/OneSignal/react-onesignal)
- [OneSignal Dashboard](https://app.onesignal.com)

## Support

If you have issues:

1. Check OneSignal dashboard for errors
2. Check browser console for errors
3. Verify environment variables are set correctly
4. Try test notification from OneSignal dashboard
5. Check [OneSignal documentation](https://documentation.onesignal.com)
