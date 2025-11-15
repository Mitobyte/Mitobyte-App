# JWT Authentication Migration Guide

**Date:** 2025-01-14
**Status:** CRITICAL SECURITY UPDATE
**Priority:** P0 - Must implement before beta testing

---

## Overview

This guide documents the migration from the **broken email-based authentication** to **secure JWT-based authentication**.

### Why This Is Critical

The previous authentication system allowed anyone to impersonate any user by simply sending:
```
Authorization: Bearer any-email@example.com
```

This is a **complete security bypass** affecting all authenticated endpoints.

---

## What Was Changed

### 1. New Files Created

#### Backend (Functions)
- `functions/utils/jwt.js` - JWT signing and verification utilities
- `functions/api/auth/login.js` - User login endpoint
- `functions/api/auth/register.js` - User registration endpoint
- `functions/api/auth/refresh.js` - Token refresh endpoint
- `functions/api/auth/verify.js` - Token verification endpoint

#### Frontend (src)
- `src/services/authService.js` - Client-side authentication service

#### Scripts
- `scripts/generate-jwt-secret.js` - Generate secure JWT secret

### 2. Modified Files

#### Backend
- `functions/utils/auth.js` - Updated to validate JWTs instead of plain emails
- `functions/utils/adminAuth.js` - Updated to use JWT-based admin validation

#### Configuration
- `.env.example` - Added JWT_SECRET configuration
- `.dev.vars.example` - Added comprehensive environment variable template

---

## Migration Steps

### Step 1: Generate JWT Secret

```bash
# Generate a secure JWT secret
node scripts/generate-jwt-secret.js
```

This will output a 64-character hex string. **NEVER commit this to version control.**

### Step 2: Configure Environment Variables

#### For Local Development

Create `.dev.vars` in project root:
```bash
JWT_SECRET=your_generated_secret_here
WALLET_ENCRYPTION_KEY=your_existing_encryption_key
ONESIGNAL_REST_API_KEY=your_onesignal_key
```

#### For Production (Cloudflare Pages)

```bash
# Using wrangler CLI
echo "your_secret_here" | wrangler pages secret put JWT_SECRET --project-name=mitobyte-voting

# Or via Dashboard:
# 1. Go to Cloudflare Dashboard > Pages > mitobyte-voting
# 2. Settings > Environment Variables
# 3. Add: JWT_SECRET = your_secret_here
# 4. Apply to Production and Preview
```

### Step 3: Update API Endpoints to Use JWT

#### Before (Insecure):
```javascript
export async function onRequestGet(context) {
  // ❌ BROKEN - accepts any email
  const email = await requireAuth(context.request);

  // ... use email
}
```

#### After (Secure):
```javascript
import { requireAuth } from '../../utils/auth.js';

export async function onRequestGet(context) {
  try {
    // ✅ SECURE - validates JWT signature
    const user = await requireAuth(context.request, context.env.JWT_SECRET);

    // user contains:
    // - userId
    // - email
    // - walletHash
    // - isAdmin
    // - isHost
    // - isSponsor

    // ... use user data
  } catch (error) {
    return jsonResponse({ error: error.message }, 401);
  }
}
```

#### Admin Endpoints:
```javascript
import { requireAdmin } from '../../utils/adminAuth.js';

export async function onRequestGet(context) {
  try {
    // ✅ Validates JWT + checks admin flag
    const admin = await requireAdmin(context.request, context.env.JWT_SECRET);

    // ... admin operations
  } catch (error) {
    return errorResponse(error.message, 403);
  }
}
```

### Step 4: Update Frontend Authentication

#### User Registration/Login

```javascript
import { register, login } from './services/authService';

// Register new user
const { accessToken, refreshToken, user } = await register({
  walletAddress: '0x123...',
  email: 'user@example.com',
  displayName: 'John Doe'
});

// Login existing user
const auth = await login({
  walletAddress: '0x123...'
});

// Tokens are automatically stored in localStorage
```

#### Making Authenticated Requests

**Option 1: Use `authenticatedFetch`** (Recommended)
```javascript
import { authenticatedFetch } from './services/authService';

// Automatically handles:
// - Adding Authorization header
// - Token refresh on 401
// - Logout on refresh failure
const response = await authenticatedFetch('/api/profile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(profileData)
});
```

**Option 2: Manual Authorization Header**
```javascript
import { getAuthHeaders } from './services/authService';

const response = await fetch('/api/profile', {
  method: 'GET',
  headers: {
    ...getAuthHeaders(), // Adds: Authorization: Bearer <token>
  }
});
```

#### Token Management

```javascript
import {
  isAuthenticated,
  getStoredUser,
  verifyToken,
  logout
} from './services/authService';

// Check if user is logged in
if (isAuthenticated()) {
  const user = getStoredUser();
  console.log('Logged in as:', user.email);
}

// Verify token is still valid
try {
  const { user } = await verifyToken();
  console.log('Token valid, user:', user);
} catch (error) {
  console.log('Token expired or invalid');
  logout();
}

// Logout
logout(); // Clears all tokens and user data
```

---

## Endpoints Reference

### Authentication Endpoints

#### POST `/api/auth/register`
Register new user and receive JWT tokens

**Request:**
```json
{
  "walletAddress": "0x123...",
  "email": "user@example.com",
  "displayName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "John Doe",
    "isAdmin": false,
    "isHost": false,
    "isSponsor": false
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 86400,
  "tokenType": "Bearer"
}
```

#### POST `/api/auth/login`
Login with wallet address or email

**Request:**
```json
{
  "walletAddress": "0x123..."
}
```
OR
```json
{
  "email": "user@example.com"
}
```

**Response:** Same as register

#### POST `/api/auth/refresh`
Refresh access token using refresh token

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 86400,
  "tokenType": "Bearer"
}
```

#### GET `/api/auth/verify`
Verify current JWT token

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "displayName": "John Doe",
    "createdAt": "2025-01-14T10:00:00Z",
    "isAdmin": false,
    "isHost": false,
    "isSponsor": false
  }
}
```

---

## Token Format

### Access Token Payload
```json
{
  "userId": 1,
  "email": "user@example.com",
  "walletHash": "abc123...",
  "isAdmin": false,
  "isHost": false,
  "isSponsor": false,
  "iss": "mitobyte-voting",
  "aud": "mitobyte-app",
  "iat": 1705233600,
  "exp": 1705320000
}
```

- **Algorithm:** HS256 (HMAC with SHA-256)
- **Expiry:** 24 hours
- **Issuer:** `mitobyte-voting`
- **Audience:** `mitobyte-app`

### Refresh Token Payload
```json
{
  "userId": 1,
  "email": "user@example.com",
  "type": "refresh",
  "iss": "mitobyte-voting",
  "aud": "mitobyte-app",
  "iat": 1705233600,
  "exp": 1707825600
}
```

- **Expiry:** 30 days
- **Type:** `refresh` (cannot be used for API access)

---

## Security Best Practices

### ✅ DO:
- Store JWT_SECRET in environment variables/secrets
- Use HTTPS in production (handled by Cloudflare Pages)
- Validate tokens on every authenticated request
- Refresh access tokens before expiry
- Clear tokens on logout
- Rotate JWT_SECRET periodically (invalidates all tokens)

### ❌ DON'T:
- Commit JWT_SECRET to version control
- Store tokens in cookies without httpOnly flag
- Use the same secret for dev and production
- Skip token verification
- Trust token payload without verification
- Use refresh tokens for API access

---

## Testing the Migration

### 1. Test User Registration
```bash
curl -X POST http://localhost:8788/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x123","email":"test@test.com"}'
```

### 2. Test Login
```bash
curl -X POST http://localhost:8788/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x123"}'
```

### 3. Test Authenticated Endpoint
```bash
curl -X GET http://localhost:8788/api/profile?walletAddress=0x123 \
  -H "Authorization: Bearer <access-token>"
```

### 4. Test Invalid Token
```bash
curl -X GET http://localhost:8788/api/profile?walletAddress=0x123 \
  -H "Authorization: Bearer invalid_token"

# Should return 401 Unauthorized
```

### 5. Test Token Refresh
```bash
curl -X POST http://localhost:8788/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh-token>"}'
```

---

## Endpoints to Update

The following endpoints need to be updated to use the new JWT authentication:

### High Priority (User-Facing)
- ✅ `/api/auth/*` - Already updated
- ⚠️ `/api/profile` - Needs update to use `requireAuth(request, env.JWT_SECRET)`
- ⚠️ `/api/events` - Update POST/PUT/DELETE
- ⚠️ `/api/checkin` - Update all methods
- ⚠️ `/api/rsvps` - Update all methods
- ⚠️ `/api/settings` - Update all methods

### Admin Endpoints
- ⚠️ `/api/admin/*` - Update all to use `requireAdmin(request, env.JWT_SECRET)`

### Lower Priority
- ⚠️ All other authenticated endpoints

---

## Rollback Plan

If critical issues arise:

1. **Temporary Rollback:**
   - Endpoints can temporarily use `extractEmailLegacy()` function
   - This is marked DEPRECATED and INSECURE
   - Only for emergency use

2. **Long-term:**
   - No rollback - old system is fundamentally broken
   - Fix issues in JWT implementation instead

---

## Timeline

1. **Immediate:** Generate JWT secret ✅
2. **Day 1:** Update core endpoints (profile, events, checkin)
3. **Day 2:** Update admin endpoints
4. **Day 3:** Update remaining endpoints
5. **Day 4:** Testing and validation
6. **Day 5:** Deploy to production

---

## Support

For issues or questions:
1. Check error messages in console (detailed error info provided)
2. Verify JWT_SECRET is configured correctly
3. Test token generation with `/api/auth/verify`
4. Check Cloudflare Pages logs for backend errors

---

**Generated:** 2025-01-14
**Next Review:** After migration complete
