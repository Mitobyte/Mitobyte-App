# Example: Updating an Endpoint to Use JWT Authentication

This document shows a concrete example of migrating an existing endpoint from the broken email-based auth to secure JWT authentication.

---

## Example: `/api/profile` Endpoint

### BEFORE (Insecure - Broken)

```javascript
/**
 * Cloudflare Pages Function: /api/profile
 * INSECURE VERSION - DO NOT USE
 */

import { hashWallet } from '../utils/encryption.js';

// ❌ BROKEN: Uses email from header without validation
export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { walletAddress, ...profileData } = body;

    // ❌ Gets unverified email from header
    const authHeader = context.request.headers.get('Authorization');
    const email = authHeader?.substring(7); // Just strips "Bearer "

    if (!email) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // ⚠️ VULNERABILITY: Anyone can send any email and impersonate users!
    // An attacker could send: Authorization: Bearer victim@example.com

    const walletHash = await hashWallet(walletAddress);

    const user = await context.env.DB.prepare(
      'SELECT id FROM users WHERE wallet_hash = ? AND email = ?'
    )
      .bind(walletHash, email) // ❌ Using unverified email!
      .first();

    // ... rest of endpoint
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}
```

**Vulnerability:** Attacker sends `Authorization: Bearer admin@mitobyte.com` and can modify any profile.

---

### AFTER (Secure - JWT)

```javascript
/**
 * Cloudflare Pages Function: /api/profile
 * SECURE VERSION with JWT authentication
 */

import { hashWallet } from '../utils/encryption.js';
import { requireAuth } from '../utils/auth.js'; // ✅ Import JWT auth

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/profile - Update user profile
 * Requires valid JWT token
 */
export async function onRequestPost(context) {
  try {
    // ✅ Validate JWT token and get authenticated user
    let authenticatedUser;
    try {
      authenticatedUser = await requireAuth(
        context.request,
        context.env.JWT_SECRET
      );
    } catch (authError) {
      return jsonResponse(
        { error: `Authentication failed: ${authError.message}` },
        401
      );
    }

    // ✅ authenticatedUser contains:
    // - userId (verified from JWT)
    // - email (verified from JWT)
    // - walletHash (verified from JWT)
    // - isAdmin, isHost, isSponsor (verified from JWT)

    const body = await context.request.json();
    const { walletAddress, ...profileData } = body;

    if (!walletAddress) {
      return jsonResponse({ error: 'walletAddress required' }, 400);
    }

    // ✅ Verify the wallet matches the authenticated user
    const walletHash = await hashWallet(walletAddress);

    if (walletHash !== authenticatedUser.walletHash) {
      return jsonResponse(
        { error: 'Cannot update profile for different user' },
        403
      );
    }

    // ✅ Use authenticated userId (from verified JWT)
    const user = await context.env.DB.prepare(
      'SELECT id FROM users WHERE id = ? AND wallet_hash = ?'
    )
      .bind(authenticatedUser.userId, walletHash)
      .first();

    if (!user) {
      return jsonResponse({ error: 'User not found' }, 404);
    }

    // Update profile using verified user ID
    const fields = [];
    const values = [];

    Object.entries(profileData).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length > 0) {
      fields.push('updated_at = datetime("now")');
      values.push(user.id);

      const updateSQL = `UPDATE user_profiles SET ${fields.join(', ')} WHERE user_id = ?`;

      await context.env.DB.prepare(updateSQL)
        .bind(...values)
        .run();
    }

    return jsonResponse({
      success: true,
      message: 'Profile updated',
      userId: authenticatedUser.userId, // ✅ Verified user ID
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return jsonResponse(
      { error: 'Failed to update profile', details: error.message },
      500
    );
  }
}

/**
 * GET /api/profile - Get user profile
 * Can be called with or without authentication
 */
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const walletAddress = url.searchParams.get('walletAddress');

    if (!walletAddress) {
      return jsonResponse({ error: 'walletAddress parameter required' }, 400);
    }

    const walletHash = await hashWallet(walletAddress);

    // Public profile - no auth required
    const user = await context.env.DB.prepare(
      'SELECT id, display_name, email FROM users WHERE wallet_hash = ?'
    )
      .bind(walletHash)
      .first();

    if (!user) {
      return jsonResponse({ error: 'User not found' }, 404);
    }

    const profile = await context.env.DB.prepare(
      'SELECT * FROM user_profiles WHERE user_id = ?'
    )
      .bind(user.id)
      .first();

    return jsonResponse({
      success: true,
      profile: {
        ...(profile || {}),
        display_name: user.display_name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return jsonResponse({ error: 'Failed to fetch profile' }, 500);
  }
}
```

---

## Key Changes

### 1. Import JWT Auth Utility
```javascript
import { requireAuth } from '../utils/auth.js';
```

### 2. Validate JWT Token
```javascript
try {
  const authenticatedUser = await requireAuth(
    context.request,
    context.env.JWT_SECRET
  );
} catch (authError) {
  return jsonResponse({ error: authError.message }, 401);
}
```

### 3. Use Verified User Data
```javascript
// ✅ Before: Unverified email from header
const email = authHeader?.substring(7);

// ✅ After: Verified data from JWT
const userId = authenticatedUser.userId;
const email = authenticatedUser.email;
const walletHash = authenticatedUser.walletHash;
```

### 4. Check Permissions
```javascript
// Verify user can only update their own profile
if (walletHash !== authenticatedUser.walletHash) {
  return jsonResponse(
    { error: 'Cannot update profile for different user' },
    403
  );
}
```

---

## Admin Endpoint Example

### BEFORE (Insecure)

```javascript
import { requireAdmin } from '../../utils/adminAuth.js';

export async function onRequestGet(context) {
  try {
    // ❌ Only checks email format, doesn't verify signature
    const adminEmail = await requireAdmin(context.request, context.env.DB);

    // ... admin operations
  } catch (error) {
    return errorResponse(error.message, 403);
  }
}
```

### AFTER (Secure)

```javascript
import { requireAdmin } from '../../utils/adminAuth.js';

export async function onRequestGet(context) {
  try {
    // ✅ Validates JWT + checks admin flag
    const admin = await requireAdmin(
      context.request,
      context.env.JWT_SECRET
    );

    // admin contains verified user data + admin status
    console.log('Admin operation by:', admin.email);

    // ... admin operations using admin.userId
  } catch (error) {
    return errorResponse(error.message, 403);
  }
}
```

---

## Testing the Updated Endpoint

### 1. Get JWT Token
```bash
# Register or login to get token
curl -X POST http://localhost:8788/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x123"}' \
  | jq -r '.accessToken'
```

### 2. Use Token in Request
```bash
# Store token
TOKEN="eyJhbGciOiJIUzI1NiIs..."

# Update profile with JWT
curl -X POST http://localhost:8788/api/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x123",
    "bio": "Updated bio",
    "location": "Milwaukee"
  }'
```

### 3. Test Invalid Token
```bash
# Should fail with 401
curl -X POST http://localhost:8788/api/profile \
  -H "Authorization: Bearer invalid_token" \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x123"}'

# Response:
# {"error":"Authentication failed: Invalid token"}
```

### 4. Test Expired Token
```bash
# Wait 24 hours or use old token
# Should fail with 401 and "Token has expired"
```

---

## Migration Checklist for Each Endpoint

When updating an endpoint, verify:

- [ ] Imported `requireAuth` or `requireAdmin` from utils
- [ ] Called auth function with `context.env.JWT_SECRET`
- [ ] Handled auth errors with 401/403 status
- [ ] Used `authenticatedUser.userId` instead of email lookups
- [ ] Verified user can only access their own data
- [ ] Tested with valid JWT token
- [ ] Tested with invalid/expired token
- [ ] Tested permission boundaries (user can't access other user's data)
- [ ] Removed any email-based auth code
- [ ] Updated error messages

---

## Common Patterns

### Pattern 1: User Resource Access
```javascript
const user = await requireAuth(request, env.JWT_SECRET);

// Verify resource belongs to user
if (resource.userId !== user.userId) {
  return jsonResponse({ error: 'Access denied' }, 403);
}
```

### Pattern 2: Admin-Only Access
```javascript
const admin = await requireAdmin(request, env.JWT_SECRET);

// Admin can access all resources
// Use admin.userId for audit logging
```

### Pattern 3: Optional Auth
```javascript
let user = null;

try {
  user = await requireAuth(request, env.JWT_SECRET);
} catch {
  // Not authenticated - public access
}

// Show different data based on auth status
if (user) {
  // Return private data
} else {
  // Return public data only
}
```

### Pattern 4: Role-Based Access
```javascript
const user = await requireAuth(request, env.JWT_SECRET);

if (!user.isHost && !user.isAdmin) {
  return jsonResponse(
    { error: 'Host or admin access required' },
    403
  );
}

// User has required role
```

---

## Error Handling

### Comprehensive Error Handling
```javascript
export async function onRequestPost(context) {
  // Check JWT_SECRET exists
  if (!context.env.JWT_SECRET) {
    console.error('JWT_SECRET not configured');
    return jsonResponse(
      { error: 'Server configuration error' },
      500
    );
  }

  // Validate JWT
  let user;
  try {
    user = await requireAuth(context.request, context.env.JWT_SECRET);
  } catch (authError) {
    // Specific error messages help debugging
    if (authError.message.includes('expired')) {
      return jsonResponse(
        { error: 'Token expired. Please login again.' },
        401
      );
    }

    if (authError.message.includes('signature')) {
      return jsonResponse(
        { error: 'Invalid token signature' },
        401
      );
    }

    return jsonResponse(
      { error: `Authentication failed: ${authError.message}` },
      401
    );
  }

  try {
    // Business logic here
  } catch (error) {
    console.error('Operation failed:', error);
    return jsonResponse(
      { error: 'Operation failed', details: error.message },
      500
    );
  }
}
```

---

**File:** `claudedocs/ENDPOINT_UPDATE_EXAMPLE.md`
**Last Updated:** 2025-01-14
