# Replyke Integration Setup Guide

## Overview

Your app now automatically registers users with Replyke when they login. This enables social features like threaded comments, notifications, and community interactions.

## What Was Implemented

### 1. **Server-Side JWT Signing** (`functions/utils/replyke.js`)
- Secure JWT token generation using RS256 algorithm
- User formatting for Replyke compatibility
- Token includes user ID, username, email, avatar, and metadata

### 2. **User Registration API** (`functions/api/user/replyke-token.ts`)
- GET endpoint: `/api/user/replyke-token?walletAddress={address}`
- Returns JWT token valid for 7 days
- Includes project ID and user information

### 3. **Client-Side Integration** (`src/services/replykeApi.js`)
- Automatic token fetching during login
- Local storage persistence (7-day expiry)
- Token cleanup on logout

### 4. **App Integration** (`src/App.jsx`)
- Registers users with Replyke after database registration
- Stores token in state and localStorage
- Debug logging for troubleshooting

## Setup Instructions

### Step 1: Create Replyke Project

1. Go to **https://replyke.com** (or the Replyke dashboard)
2. Create a new project
3. Note your **Project ID** and **Private Key**

### Step 2: Configure Environment Variables

#### Local Development (.env)

Create a `.env` file in the project root:

```env
# Replyke Social Features
VITE_REPLYKE_PROJECT_ID=your_project_id_here
REPLYKE_PRIVATE_KEY=your_private_key_here
```

**Important:**
- `VITE_REPLYKE_PROJECT_ID` - Exposed to client-side (public)
- `REPLYKE_PRIVATE_KEY` - Server-side only (keep secret!)

#### Production (Cloudflare Pages)

Set environment variables in Cloudflare Pages dashboard:

```bash
wrangler pages secret put REPLYKE_PRIVATE_KEY
# Enter your private key when prompted

wrangler pages secret put VITE_REPLYKE_PROJECT_ID
# Enter your project ID when prompted
```

Or via Cloudflare dashboard:
1. Go to Pages > Your Project > Settings > Environment Variables
2. Add `REPLYKE_PRIVATE_KEY` (encrypted)
3. Add `VITE_REPLYKE_PROJECT_ID` (plain text, available to functions)

### Step 3: Install Dependencies

The `jsonwebtoken` library has been added. Ensure it's installed:

```bash
npm install
```

### Step 4: Test Locally

1. **Start dev server:**
   ```bash
   npm run pages:dev
   ```

2. **Login to the app** with your test account

3. **Check browser console** for debug logs:
   - `🔵 STARTING REPLYKE REGISTRATION`
   - `🟢 REPLYKE REGISTRATION SUCCESSFUL`

4. **Verify token in localStorage:**
   ```javascript
   // In browser console
   localStorage.getItem('replyke_token_YOUR_WALLET_ADDRESS')
   ```

### Step 5: Deploy

```bash
npm run pages:deploy
```

## How It Works

### Registration Flow

```
1. User logs in with Crossmint
   ↓
2. App registers user in your D1 database
   ↓
3. App calls /api/user/replyke-token
   ↓
4. Server generates JWT with user data
   ↓
5. JWT stored in:
   - React state (replykeData)
   - localStorage (persistent across sessions)
   ↓
6. Token available for Replyke components
```

### Token Management

- **Creation**: Auto-generated on first login
- **Storage**: localStorage with 7-day expiry
- **Refresh**: Auto-loaded from storage on app mount
- **Cleanup**: Cleared on logout
- **Expiry**: Tokens valid for 7 days (configurable)

## Using Replyke Token

The token is now available in your app:

```jsx
// In any component
const { replykeData } = useContext(AppContext); // If you create context

// Or pass as prop
<ReplykeProvider
  projectId={replykeData.projectId}
  signedToken={replykeData.token}
>
  {/* Your components */}
</ReplykeProvider>
```

## Troubleshooting

### Issue: "Replyke is not configured"

**Solution:** Environment variables not set. Check:
- `.env` file exists with correct values (local)
- Cloudflare Pages secrets are set (production)

### Issue: "Failed to generate Replyke token"

**Check:**
1. Private key format is correct (should be RSA private key)
2. User exists in database
3. Function logs in Cloudflare dashboard

### Issue: Token not persisting

**Check:**
1. localStorage is enabled in browser
2. Token expiry hasn't passed (7 days)
3. User hasn't logged out

### Debug Logging

Enable detailed logging by checking browser console:

```javascript
// Filter for Replyke logs
console.log messages starting with 🔵 or 🟢
```

## Next Steps

Now that users are registered with Replyke, you can:

1. **Add Comment Sections** to events/posts
   ```jsx
   <EntityProvider foreignId={event.id}>
     <SocialCommentSection />
   </EntityProvider>
   ```

2. **Enable Notifications** via Replyke webhooks

3. **Build Social Feeds** with Replyke's feed components

4. **Track Engagement** via Replyke analytics

## Security Notes

⚠️ **Keep `REPLYKE_PRIVATE_KEY` secret!**
- Never commit to git
- Never expose to client-side
- Only use in server-side functions
- Rotate if compromised

✅ **Safe to expose:**
- `VITE_REPLYKE_PROJECT_ID` - Public project identifier
- JWT tokens (they're signed and time-limited)

## Support

- Replyke docs: https://github.com/replyke/monorepo
- Issues: Check function logs in Cloudflare dashboard
- Debug: Browser console shows detailed registration flow
