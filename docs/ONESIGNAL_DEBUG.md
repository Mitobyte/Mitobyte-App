# OneSignal Debug Guide

Comprehensive debugging utilities for troubleshooting OneSignal push notifications.

## Debug Features Added

### 1. Automatic Console Logging

All OneSignal operations now log detailed information to the browser console with timestamps:

```
[OneSignal Debug] [2025-10-28T...] initializeOneSignal() called
[OneSignal Debug] [2025-10-28T...] Getting OneSignal instance...
[OneSignal Debug] [2025-10-28T...] ✅ OneSignal initialized successfully!
```

### 2. Browser Console Utilities

Debug utilities are available via `window.OneSignalDebug`:

```javascript
// See available commands
OneSignalDebug.help()

// Get comprehensive debug info
await OneSignalDebug.getInfo()

// Log full debug info to console (formatted tables)
await OneSignalDebug.logInfo()

// Diagnose common issues
await OneSignalDebug.diagnose()

// Download debug info as JSON file
OneSignalDebug.download()

// Test OneSignal initialization
await OneSignalDebug.testInit()
```

## How to Debug

### Step 1: Open Browser Console

1. Open your app: https://10162685.mitobyte-voting.pages.dev
2. Press F12 or right-click → Inspect
3. Go to **Console** tab

### Step 2: Check Automatic Logs

Look for OneSignal debug messages:
- ✅ Green checkmarks = Success
- ❌ Red X = Errors
- Timestamps show exact timing of operations

### Step 3: Run Diagnostics

In the console, run:

```javascript
await OneSignalDebug.diagnose()
```

This checks for:
- HTTPS requirement
- OneSignal SDK loaded
- Notification support
- Permission status
- Service Worker support

### Step 4: View Full Debug Info

```javascript
await OneSignalDebug.logInfo()
```

This displays formatted tables with:
- Browser information
- Notification support status
- OneSignal SDK state
- Subscription details
- Service Worker status

## Common Issues & Solutions

### Issue: "OneSignal SDK not loaded"

**Symptoms:**
```
[OneSignal Debug] ERROR: OneSignal SDK not loaded!
```

**Cause:** Script tag missing or blocked

**Solutions:**
1. Check `index.html` has: `<script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>`
2. Check browser console for network errors
3. Disable ad blockers/privacy extensions
4. Check Content Security Policy settings

### Issue: "OneSignal load timeout"

**Symptoms:**
```
[OneSignal Debug] ERROR: OneSignal load timeout after 10 seconds
```

**Cause:** Network issue or CDN unavailable

**Solutions:**
1. Check internet connection
2. Try refreshing the page
3. Check if cdn.onesignal.com is accessible
4. Clear browser cache

### Issue: "Notification permission denied"

**Symptoms:**
```
[OneSignal Debug] Permission result: false
```

**Cause:** User denied permission or browser blocked

**Solutions:**
1. Check browser notification settings
2. Reset permission: Browser settings → Site settings → Notifications
3. Try in incognito mode
4. Check if site is HTTPS

### Issue: "Subscription failed"

**Symptoms:**
```
[OneSignal Debug] ❌ Subscription failed
```

**Debug Steps:**
1. Run `await OneSignalDebug.diagnose()` to check for issues
2. Check console for detailed error messages
3. Verify App ID is correct: `31e87dbd-f829-4460-b02c-463701313121`
4. Check OneSignal dashboard for account issues

## Debug Info Reference

### Browser Info
- `userAgent` - Browser type and version
- `platform` - Operating system
- `language` - Browser language
- `cookiesEnabled` - Cookie support
- `onLine` - Network connectivity

### Notifications Status
- `supported` - true if browser supports notifications
- `permission` - "default", "granted", or "denied"
- `serviceWorkerSupported` - true if SW supported
- `pushManagerSupported` - true if Push API supported

### OneSignal State
- `sdkLoaded` - true if SDK loaded successfully
- `initialized` - true if OneSignal.init() completed
- `subscriptionState.optedIn` - true if user subscribed
- `subscriptionState.id` - Subscription ID
- `subscriptionState.token` - Push token
- `userId` - OneSignal user ID
- `tags` - User tags (e.g., walletAddress)

### Service Worker Info
- `controller` - SW state ("activated", "installing", etc.)
- `ready` - true if SW ready
- `registrations` - List of registered service workers

## Testing Workflow

### 1. Fresh User Test

```javascript
// Check initial state
await OneSignalDebug.diagnose()

// Enable notifications via UI
// (Click notification prompt or Settings toggle)

// Verify subscription
await OneSignalDebug.getInfo()
// Should show: subscriptionState.optedIn = true
```

### 2. Subscription Test

```javascript
// Before subscribing
console.log('Before:', await OneSignalDebug.getInfo())

// Click "Enable Notifications" in app

// After subscribing
console.log('After:', await OneSignalDebug.getInfo())

// Check for subscription ID and user ID
```

### 3. Send Test Notification

**From OneSignal Dashboard:**
1. Go to https://app.onesignal.com
2. Messages → New Push
3. Send test notification
4. Check console for click event logs

**From API:**
```bash
curl -X POST https://10162685.mitobyte-voting.pages.dev/api/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Debug Test",
    "message": "Testing notifications",
    "sendToAll": true
  }'
```

## Advanced Debugging

### Monitor All Events

Event monitoring is automatically enabled. Watch console for:

```
[OneSignal Debug] Permission changed: true
[OneSignal Debug] Subscription changed: { ... }
[OneSignal Debug] Notification clicked: { ... }
[OneSignal Debug] Notification will display: { ... }
```

### Export Debug Data

Download debug info for bug reports:

```javascript
OneSignalDebug.download()
```

This creates a JSON file with:
- Timestamp
- Full browser info
- OneSignal state
- Service Worker details

### Check Specific Operations

Watch console during operations:

**Enable Notifications:**
```
[OneSignal Debug] subscribeToPushNotifications() called
[OneSignal Debug] Getting OneSignal instance...
[OneSignal Debug] Requesting notification permission...
[OneSignal Debug] Permission result: true
[OneSignal Debug] Opting in to push notifications...
[OneSignal Debug] Logging in user with wallet address: 0x1234...
[OneSignal Debug] Adding walletAddress tag...
[OneSignal Debug] ✅ Successfully subscribed!
```

**Check Subscription Status:**
```
[OneSignal Debug] isPushNotificationSubscribed() called
[OneSignal Debug] Subscription status: { isOptedIn: true, subscriptionId: "..." }
```

## Disabling Debug Logs

To disable verbose logging for production:

Edit `src/utils/oneSignalDebug.js`:

```javascript
// Change this line:
export const DEBUG_ENABLED = true

// To:
export const DEBUG_ENABLED = false
```

Then rebuild and deploy.

**Note:** `window.OneSignalDebug` utilities will still be available even with `DEBUG_ENABLED = false`.

## Getting Help

If you're still having issues:

1. Run full diagnostics:
   ```javascript
   await OneSignalDebug.diagnose()
   await OneSignalDebug.logInfo()
   ```

2. Download debug data:
   ```javascript
   OneSignalDebug.download()
   ```

3. Check OneSignal status: https://status.onesignal.com

4. Review OneSignal docs: https://documentation.onesignal.com

5. Check browser console for any errors not caught by our logging

## Debug Checklist

- [ ] Console shows "OneSignal Debug utilities available"
- [ ] `OneSignalDebug.help()` shows available commands
- [ ] `await OneSignalDebug.diagnose()` shows no errors
- [ ] `await OneSignalDebug.getInfo()` shows SDK loaded
- [ ] Notification permission is "granted" or "default" (not "denied")
- [ ] Service Worker is registered and active
- [ ] Subscription ID appears after enabling notifications
- [ ] Test notification received from dashboard
