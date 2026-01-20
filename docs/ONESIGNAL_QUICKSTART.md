# OneSignal Quick Start Guide

## 🚀 Quick Setup (3 Steps)

### 1. Get Your API Key
```
OneSignal Dashboard > Settings > Keys & IDs > Copy REST API Key
```

### 2. Set Environment Variable
```bash
# Production (Cloudflare Pages Dashboard)
ONESIGNAL_REST_API_KEY=os_v2_app_xxxxxxxxxxxxx

# Or via CLI
npx wrangler pages secret put ONESIGNAL_REST_API_KEY
```

### 3. Test It
```bash
# Run the test script
node scripts/test-onesignal.js YOUR_API_KEY

# Or use environment variable
ONESIGNAL_REST_API_KEY=your_key node scripts/test-onesignal.js
```

## 📱 Test in Browser

1. **Start dev server**: `npm run dev`
2. **Log in as admin**: `carl@craftthefuture.xyz`
3. **Go to**: Admin Dashboard > 📢 Announcements
4. **Click**: "🧪 Test Notification" button
5. **Expected**: Browser notification appears

## 🧪 Test OneSignal API

### Option A: Use the test script
```bash
node scripts/test-onesignal.js YOUR_REST_API_KEY
```

### Option B: Use curl
```bash
curl -X POST https://mitobyte-voting.pages.dev/api/admin/test-notification \
  -H "Content-Type: application/json" \
  -d '{"adminEmail": "carl@craftthefuture.xyz"}'
```

### Option C: Use the UI
1. Admin Dashboard > Announcements tab
2. Click "🧪 Test Notification" button (tests browser notifications)
3. Or send a real announcement (tests OneSignal API)

## 📋 Quick Reference

### Your OneSignal App
- **App ID**: `d583c0e5-bae4-452a-be0c-c7c9156b9261`
- **Dashboard**: https://dashboard.onesignal.com

### API Endpoints
```
GET  /api/admin/announcements?adminEmail=xxx     # List announcements
POST /api/admin/announcements                    # Create & send announcement
POST /api/admin/test-notification                # Send test notification
```

### Database Table
```sql
-- View announcements
SELECT * FROM announcements ORDER BY sent_at DESC LIMIT 10;

-- Check notification status
SELECT id, title, notification_sent, recipient_count, sent_at
FROM announcements
ORDER BY sent_at DESC;
```

## ✅ Success Indicators

**When everything is working**:
- ✅ Test script shows: "All tests completed successfully!"
- ✅ Browser shows test notifications
- ✅ OneSignal Dashboard shows sent messages
- ✅ API response includes: `"success": true, "recipients": X`

**When API key is missing**:
- ⚠️ Response: "ONESIGNAL_REST_API_KEY not configured"
- ⚠️ Announcements save to DB but NO notifications sent
- ⚠️ Test script fails

**When no users are subscribed**:
- ⚠️ Response: `"recipients": 0`
- ⚠️ Notification "sent" but no one receives it
- 💡 Users need to grant browser notification permissions

## 🐛 Troubleshooting

### "ONESIGNAL_REST_API_KEY not configured"
```bash
# Set it in Cloudflare Pages
npx wrangler pages secret put ONESIGNAL_REST_API_KEY
```

### "Unauthorized" (401 error)
- Check API key is correct (starts with `os_v2_app_`)
- Verify App ID matches (`d583c0e5-bae4-452a-be0c-c7c9156b9261`)

### "0 recipients"
- No users have subscribed to push notifications
- Users need to grant browser permissions
- Check OneSignal Dashboard > Audience > All Users

### Notifications not appearing
1. Check browser notification permissions
2. Verify Service Worker is registered
3. Test with "Test Notification" button first
4. Check browser console for errors

## 📚 Full Documentation

See `ONESIGNAL_TESTING_GUIDE.md` for detailed testing instructions and troubleshooting.

## 🔗 Useful Links

- [OneSignal Dashboard](https://dashboard.onesignal.com)
- [OneSignal Web Push Docs](https://documentation.onesignal.com/docs/web-push-quickstart)
- [OneSignal REST API Docs](https://documentation.onesignal.com/reference/create-notification)
- [Cloudflare Pages Secrets](https://developers.cloudflare.com/pages/platform/build-configuration/#environment-variables)
