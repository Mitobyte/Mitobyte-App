# User Registration Fix - Complete

## Problem
Users were authenticating with Crossmint but not being saved to the database, so the admin dashboard showed 0 users.

## Root Causes

1. **No automatic user registration**: App.jsx used Crossmint auth but never called the database API
2. **Missing encryption key**: The `WALLET_ENCRYPTION_KEY` environment variable was not configured
3. **Database not initialized**: Production database didn't have the users table

## Fixes Applied

### 1. Automatic User Registration (`src/App.jsx`)

Added a `useEffect` hook that automatically registers users in the database when they log in with Crossmint:

```javascript
useEffect(() => {
  const registerUser = async () => {
    if (status === 'logged-in' && user && wallet?.address) {
      try {
        const userData = await getOrCreateUser({
          walletAddress: wallet.address,
          email: user.email || null,
          displayName: user.name || user.email?.split('@')[0] || null,
        })
        setDbUser(userData)
        console.log('User registered/retrieved:', userData)
      } catch (error) {
        console.error('Failed to register user:', error)
      }
    }
  }
  registerUser()
}, [status, user, wallet?.address])
```

**What this does:**
- Triggers when user logs in with Crossmint
- Extracts wallet address, email, and name from Crossmint user
- Calls `getOrCreateUser()` API (idempotent - creates if new, returns existing if already registered)
- Stores user data in database with encrypted wallet address
- Logs result to console for debugging

### 2. Generated Encryption Key

Created script `scripts/generate-encryption-key.js` to generate a secure 256-bit AES encryption key:

**Generated Key:**
```
3c2cd720b17334c0d4603cba3b7fca3fead6872444728c323954d84f44429566
```

**Set in Cloudflare:**
```bash
wrangler pages secret put WALLET_ENCRYPTION_KEY --project-name=mitobyte-voting
```

### 3. Database Migration

Ran migration on production database:
```bash
wrangler d1 execute mitobyte-users --remote --file=./migrations/0001_create_users.sql
```

**Database Status:**
- ✅ `users` table created
- ✅ Indexes created (`idx_wallet_hash`, `idx_created_at`)
- ✅ Ready to accept user registrations

### 4. Production Deployment

Deployed updated application:
```bash
npm run build && npm run pages:deploy
```

**Deployment URL:** https://55bddff4.mitobyte-voting.pages.dev
**Production URL:** https://mitobyte-voting.pages.dev

## How It Works Now

### User Registration Flow

```
1. User clicks "Join the Community"
   └─> Crossmint login modal appears

2. User authenticates (email, social, wallet)
   └─> Crossmint returns: { user, wallet }

3. App detects authentication (useEffect triggers)
   └─> Extracts: wallet.address, user.email, user.name

4. API call: POST /api/users
   └─> Body: { walletAddress, email, displayName }

5. Backend function (functions/api/users.js)
   ├─> Hashes wallet address (SHA-256)
   ├─> Encrypts wallet address (AES-256-GCM)
   ├─> Checks if user exists (by wallet hash)
   ├─> Creates new user OR returns existing user
   └─> Returns: { id, walletAddress, email, displayName }

6. User record saved in D1 database
   └─> Admin dashboard can now see the user
```

### Database Security

**What's stored:**
- `id` - Auto-incrementing primary key
- `wallet_hash` - SHA-256 hash of wallet address (for lookups)
- `wallet_encrypted` - AES-256-GCM encrypted wallet (can be decrypted if needed)
- `email` - User's email (nullable)
- `display_name` - User's name (nullable)
- `created_at` - Timestamp

**Security features:**
- Wallet addresses never stored in plain text
- Encryption key stored as Cloudflare secret
- Hash allows fast lookups without exposing wallet
- Encrypted version allows recovery if needed

## Testing

### Test User Registration

1. **Go to app**: https://mitobyte-voting.pages.dev
2. **Click** "Join the Community"
3. **Log in** with any method (email, Google, wallet)
4. **Check console** for: `"User registered/retrieved: {...}"`
5. **Verify** in admin dashboard

### Test Admin Dashboard

1. **Log in** with admin email (`carl@craftthefuture.xyz`)
2. **Click** 🛡️ Admin button
3. **See** registered users in table
4. **Statistics** should show:
   - Total Users: (count of all users)
   - New Today: (users registered today)
   - Active Users: (users with wallets)

### Verify Database

Check users in production database:
```bash
# Count total users
wrangler d1 execute mitobyte-users --remote --command="SELECT COUNT(*) FROM users"

# List recent users
wrangler d1 execute mitobyte-users --remote --command="SELECT id, email, display_name, created_at FROM users ORDER BY created_at DESC LIMIT 10"
```

## Files Modified

### Created
- `src/services/adminApi.js` - Admin API client
- `src/components/AdminDashboard.jsx` - Main admin dashboard
- `src/components/admin/AdminStats.jsx` - Statistics cards
- `src/components/admin/AdminUserTable.jsx` - User table with search/sort
- `functions/api/admin/users.js` - Admin users endpoint
- `functions/utils/adminAuth.js` - Admin authorization utility
- `scripts/generate-encryption-key.js` - Key generation script

### Modified
- `src/App.jsx` - Added auto-registration on login
- `src/components/CommunityHub.jsx` - Added admin button
- `wrangler.toml` - Added production D1 binding
- `functions/api/admin/users.js` - Better error handling

## Configuration

### Cloudflare Secrets
- ✅ `WALLET_ENCRYPTION_KEY` - Set via wrangler CLI

### Cloudflare Bindings (in dashboard)
- ✅ `DB` - D1 database binding to `mitobyte-users`

### Environment Variables (wrangler.toml)
- ✅ Production D1 database binding configured
- ✅ Database ID: `28813de3-b100-45a8-a993-53a67739e25d`

## Monitoring

### Check Registration Success

In browser console, you should see:
```
Registering user in database... {walletAddress: "0x...", email: "user@example.com"}
User registered/retrieved: {id: 1, walletAddress: "0x...", email: "user@example.com", ...}
```

### Check Registration Errors

If registration fails, console will show:
```
Failed to register user: Error: [error details]
```

Common errors:
- "Failed to fetch users" - API endpoint issue
- "Database not configured" - DB binding missing
- "Unauthorized" - Admin trying to access but not whitelisted

## Success Criteria

- ✅ Users can log in via Crossmint
- ✅ Users automatically saved to database on login
- ✅ Wallet addresses encrypted and hashed
- ✅ Admin dashboard shows all registered users
- ✅ Statistics update in real-time
- ✅ Search and pagination work
- ✅ Production deployment successful

## Next Steps

### Optional Enhancements

1. **User Profile Management**
   - Allow users to update their email/name
   - Show user their own profile
   - Add avatar support

2. **Admin Features**
   - User detail modal with full information
   - Export users to CSV
   - Filter by registration date
   - Bulk actions (email, delete)

3. **Analytics**
   - Track login frequency
   - Show user activity over time
   - Geographic distribution
   - User retention metrics

4. **Notifications**
   - Email new users welcome message
   - Notify admins of new registrations
   - Send event reminders

## Support

If users still aren't being registered:

1. **Check browser console** for registration logs
2. **Verify encryption key** is set in Cloudflare
3. **Check Cloudflare logs** for backend errors
4. **Verify DB binding** in dashboard settings
5. **Test API directly**:
   ```bash
   curl -X POST https://mitobyte-voting.pages.dev/api/users \
     -H "Content-Type: application/json" \
     -d '{"walletAddress":"0xtest123","email":"test@example.com"}'
   ```

---

**Status:** ✅ Complete - Users are now automatically registered when they log in!

**Deployed:** https://mitobyte-voting.pages.dev
