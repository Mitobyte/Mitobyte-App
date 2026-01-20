# OneSignal Integration Testing Guide

This guide will help you test the OneSignal announcement integration with the Admin Dashboard.

## Setup Requirements

### 1. OneSignal Configuration

Your OneSignal App ID is already configured:
- **App ID**: `d583c0e5-bae4-452a-be0c-c7c9156b9261`

### 2. Set the OneSignal REST API Key

The REST API key must be configured as an environment variable in Cloudflare Pages:

#### For Production:
```bash
# Set via Cloudflare Dashboard:
# Pages > mitobyte-voting > Settings > Environment Variables
# Variable name: ONESIGNAL_REST_API_KEY
# Value: Your OneSignal REST API Key (starts with "os_v2_app_...")
```

#### For Local Development:
```bash
# Add to .env.local (do NOT commit this file)
echo "ONESIGNAL_REST_API_KEY=your_rest_api_key_here" >> .env.local
```

#### Using Wrangler CLI:
```bash
# Set the secret for production
npx wrangler pages secret put ONESIGNAL_REST_API_KEY

# When prompted, paste your OneSignal REST API Key
```

### 3. Getting Your OneSignal REST API Key

1. Log in to [OneSignal Dashboard](https://dashboard.onesignal.com)
2. Select your app (`d583c0e5-bae4-452a-be0c-c7c9156b9261`)
3. Go to **Settings > Keys & IDs**
4. Copy the **REST API Key** (starts with `os_v2_app_...`)

## Testing the Integration

### Test 1: Access the Announcements Tab

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Log in with an admin account (`carl@craftthefuture.xyz` or authorized admin)

3. Navigate to **Admin Dashboard**

4. Click on the **📢 Announcements** tab

5. **Expected Result**: You should see the announcements interface with:
   - A form to create new announcements
   - A "Test Notification" button
   - A list of previous announcements (if any)

### Test 2: Test Notification (Browser-Only)

This tests the browser's native notification capability WITHOUT OneSignal:

1. Click the **🧪 Test Notification** button in the Announcements tab

2. **Expected Result**:
   - Browser will request notification permission (if not already granted)
   - A test notification should appear: "Test Notification - This is a test notification from Mitobyte admin dashboard!"

**Note**: This uses the Service Worker and doesn't require OneSignal API key.

### Test 3: OneSignal Test Notification (API Test)

This tests the OneSignal API integration:

1. Ensure `ONESIGNAL_REST_API_KEY` is configured (see Setup section)

2. Use curl or a REST client to test the API endpoint:

   ```bash
   curl -X POST https://mitobyte-voting.pages.dev/api/admin/test-notification \
     -H "Content-Type: application/json" \
     -d '{"adminEmail": "carl@craftthefuture.xyz"}'
   ```

3. **Expected Result**:
   ```json
   {
     "success": true,
     "message": "Test notification sent successfully!",
     "notificationId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
     "recipients": <number>,
     "details": { ... }
   }
   ```

4. **If API key is missing**:
   ```json
   {
     "success": false,
     "error": "ONESIGNAL_REST_API_KEY not configured",
     "details": "Set the environment variable in Cloudflare Pages"
   }
   ```

### Test 4: Create and Send Announcement

This is the full end-to-end test:

1. In the Admin Dashboard > Announcements tab

2. Click **➕ New Announcement**

3. Fill in the form:
   - **Title**: "Test Announcement"
   - **Message**: "This is a test announcement sent via OneSignal"

4. Click **📢 Send Announcement**

5. Confirm the dialog

6. **Expected Results**:

   **If API key is configured correctly**:
   - Success alert showing: "Announcement created successfully! 📱 Push notifications sent: X"
   - Announcement appears in the list below
   - All subscribed users receive a push notification

   **If API key is missing**:
   - Success alert showing: "Announcement created successfully! ⚠️ Notification Error: ONESIGNAL_REST_API_KEY not configured"
   - Announcement is saved in database but NO notifications sent

### Test 5: Check Database

Verify announcements are being saved correctly:

```bash
# Using wrangler D1 CLI
npx wrangler d1 execute mitobyte-users --command "SELECT * FROM announcements ORDER BY sent_at DESC LIMIT 5"
```

**Expected columns**:
- `id`, `title`, `message`, `sender_email`
- `sent_at`, `notification_sent`, `notification_sent_at`, `recipient_count`

### Test 6: Check OneSignal Dashboard

1. Go to [OneSignal Dashboard](https://dashboard.onesignal.com)
2. Select your app
3. Navigate to **Messages > Sent**
4. **Expected**: You should see your sent announcements with delivery stats

## Debugging

### Enable Debug Logging

The backend already includes extensive debug logging:

```javascript
console.log('[OneSignal Debug] Starting notification send process', { ... })
console.log('[OneSignal Debug] Sending payload:', JSON.stringify(payload, null, 2))
console.log('[OneSignal Debug] Response status:', response.status)
console.log('[OneSignal Debug] Response data:', JSON.stringify(data, null, 2))
```

### Check Cloudflare Logs

```bash
# Tail production logs
npx wrangler pages deployment tail

# Or view in Cloudflare Dashboard:
# Pages > Your Project > Deployments > [Latest] > Functions Logs
```

### Common Issues

#### Issue 1: "ONESIGNAL_REST_API_KEY not configured"
**Solution**: Follow "Set the OneSignal REST API Key" section above

#### Issue 2: "Unauthorized" error
**Solution**: Make sure you're logged in with an admin email (starts with `carl@craftthefuture.xyz`)

#### Issue 3: Notifications not received
**Possible causes**:
- Users haven't subscribed to push notifications
- Browser doesn't support push notifications
- Service Worker not registered
- OneSignal API key is incorrect

**Solution**:
- Check OneSignal Dashboard > Audience > All Users to see subscribed users
- Verify browser notification permissions are granted
- Test with "Test Notification" button first

#### Issue 4: API returns error 400/401/403
**Check**:
- API key format (should start with `os_v2_app_`)
- App ID matches (`31e87dbd-f829-4460-b02c-463701313121`)
- OneSignal account is active

## API Endpoints Reference

### GET /api/admin/announcements
Fetch all announcements (admin only)

**Query Parameters**:
- `adminEmail`: Admin email address

**Response**:
```json
{
  "success": true,
  "announcements": [...]
}
```

### POST /api/admin/announcements
Create and send a new announcement

**Request Body**:
```json
{
  "adminEmail": "admin@example.com",
  "title": "Announcement Title",
  "message": "Announcement message"
}
```

**Response**:
```json
{
  "success": true,
  "announcement": { ... },
  "notificationsSent": 10,
  "notificationService": "OneSignal",
  "notificationError": null,
  "debug": {
    "hasApiKey": true,
    "announcementId": 1
  }
}
```

### POST /api/admin/test-notification
Send a test notification via OneSignal

**Request Body**:
```json
{
  "adminEmail": "admin@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Test notification sent successfully!",
  "notificationId": "xxx",
  "recipients": 5,
  "details": { ... }
}
```

## Next Steps

After successful testing:

1. **Set up VAPID keys** (if using Web Push in addition to OneSignal)
2. **Configure user subscription flows** in the frontend
3. **Add announcement scheduling** for future sends
4. **Implement read receipts** to track which users have seen announcements
5. **Add targeting options** (by role, event, etc.)

## Support

- OneSignal Documentation: https://documentation.onesignal.com
- OneSignal Support: https://onesignal.com/support
- Mitobyte Backend Logs: Check Cloudflare Pages Functions logs
