# Production Deployment Fix for Admin Dashboard

## Issue
500 error when accessing `/api/admin/users` endpoint in production.

## Root Cause
The D1 database binding wasn't properly configured for the production environment in Cloudflare Pages.

## Fixes Applied

### 1. Improved Error Handling (`functions/api/admin/users.js`)
- Added check for DB binding existence
- Better error messages with details
- Fixed SQL query (removed multi-line template literal)
- Added error stack logging

### 2. Updated Wrangler Configuration (`wrangler.toml`)
- Added D1 database binding to production environment
- Ensures `context.env.DB` is available in production

## Deploy the Fix

Run this command to redeploy with the fixes:

```bash
npm run build && npm run pages:deploy
```

## Cloudflare Dashboard Configuration (IMPORTANT!)

The database binding also needs to be configured in the Cloudflare dashboard:

### Steps:

1. **Go to Cloudflare Dashboard**
   - Navigate to: Workers & Pages > mitobyte-voting (your project)

2. **Open Settings**
   - Click on "Settings" tab

3. **Configure D1 Binding**
   - Go to "Functions" section
   - Scroll to "D1 database bindings"
   - Click "Add binding"

4. **Add Binding**
   - **Variable name**: `DB`
   - **D1 database**: Select `mitobyte-users`
   - Click "Save"

5. **Redeploy** (if you don't want to use CLI)
   - Go to "Deployments" tab
   - Click "Retry deployment" on latest deployment
   - OR just deploy from CLI as shown above

## Verify Database Has Data

Make sure your production database actually has users:

```bash
# Check production database
wrangler d1 execute mitobyte-users --command="SELECT COUNT(*) FROM users"

# List users in production
wrangler d1 execute mitobyte-users --command="SELECT id, email, display_name FROM users LIMIT 5"
```

## Test the Fix

1. **Deploy** using the command above
2. **Log in** to your app with admin email (`carl@craftthefuture.xyz`)
3. **Click** the 🛡️ Admin button
4. **Check** if users load successfully

## If Still Not Working

### Check Cloudflare Logs

View production logs to see the actual error:

```bash
wrangler pages deployment tail
```

Or in the dashboard:
- Go to your Pages project
- Click "View logs" or "Real-time logs"
- Look for errors when accessing admin dashboard

### Common Issues

1. **Database binding not configured**
   - Solution: Follow "Cloudflare Dashboard Configuration" steps above

2. **Database doesn't exist or is empty**
   - Solution: Run migrations in production
   ```bash
   wrangler d1 execute mitobyte-users --file=./migrations/0001_create_users.sql
   ```

3. **Wrong database ID**
   - Check your database ID in dashboard matches wrangler.toml

4. **Authorization header not being sent**
   - Check browser network tab for Authorization header
   - Should be: `Authorization: Bearer carl@craftthefuture.xyz`

## Debugging Checklist

- [ ] Built and deployed latest code
- [ ] D1 binding configured in Cloudflare dashboard
- [ ] Database has the `users` table
- [ ] Logged in with admin email (starts with carl@craftthefuture.xyz)
- [ ] Checked Cloudflare logs for error details
- [ ] Browser console shows the actual error message

## Quick Deploy Command

```bash
# One-liner to build and deploy
npm run build && npm run pages:deploy
```

## Expected Behavior After Fix

1. Admin logs in with `carl@craftthefuture.xyz`
2. Sees 🛡️ Admin button
3. Clicks Admin button
4. Dashboard loads with:
   - Statistics cards showing user counts
   - User table with all registered users
   - Search and sort functionality working
5. No 500 errors in console

## Support

If issues persist after following all steps:
1. Share the exact error from Cloudflare logs
2. Verify database binding in dashboard
3. Check if regular user endpoints work (non-admin)
