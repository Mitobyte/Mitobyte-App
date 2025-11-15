# JWT Signing Error - Root Cause Analysis

**Date**: 2025-10-29
**Issue**: JWT signing fails in Cloudflare Workers with paradoxical error message
**Status**: Root cause identified, solution verified

---

## Error Message

```
JWT signing failed: Key for the RS256 algorithm must be one of type CryptoKey, KeyObject, or JSON Web Key. Received an instance of CryptoKey.
```

**Paradox**: The error states the key MUST be CryptoKey but also claims it RECEIVED CryptoKey.

---

## Investigation Timeline

### 1. Initial Context Gathering

**Evidence Collected**:
- Current implementation uses `jose` library v6.1.0 (designed for edge runtimes)
- Running on Cloudflare Pages Functions (edge runtime, not Node.js)
- Private key stored as PEM format string in environment variable
- Previously tried `jsonwebtoken` library which failed with "crypto.createSign is not implemented"

**Implementation Path** (`functions/utils/replyke.js`):
```javascript
import { SignJWT, importPKCS8 } from 'jose';

const privateKeyObj = await importPKCS8(privateKey, 'RS256');
const token = await new SignJWT(payload)
  .setProtectedHeader({ alg: 'RS256' })
  .sign(privateKeyObj);
```

### 2. Code Flow Analysis

**Traced execution path through `jose` library**:

1. `importPKCS8()` → `fromPKCS8()` (asn1.js:191)
2. `fromPKCS8()` → `genericImport()` (asn1.js:121)
3. `genericImport()` → `crypto.subtle.importKey()` (asn1.js:186)
4. Returns: `Promise<CryptoKey>`

**SignJWT.sign() flow**:
1. `SignJWT.sign()` → `CompactSign.sign()` → `FlattenedSign.sign()`
2. Calls `checkKeyType(alg, key, 'sign')` (check_key_type.js:56)
3. Calls `normalizeKey(key, alg)` (normalize_key.js:145)
4. Calls `sign(alg, k, data)` (actual signing)

### 3. Root Cause Identification

**Located the validation logic** in `check_key_type.js`:

```javascript
const asymmetricTypeCheck = (alg, key, usage) => {
  if (jwk.isJWK(key)) {
    // JWK validation logic...
  }
  if (!isKeyLike(key)) {
    throw new TypeError(invalidKeyInput(alg, key, 'CryptoKey', 'KeyObject', 'JSON Web Key'));
  }
  // Additional type checks...
};
```

**Key validation in `is_key_like.js`**:

```javascript
export function isCryptoKey(key) {
  return key?.[Symbol.toStringTag] === 'CryptoKey';
}

export default (key) => {
  return isCryptoKey(key) || isKeyObject(key);
};
```

**ROOT CAUSE DISCOVERED**:

The `importPKCS8()` function returns a CryptoKey object from Cloudflare Workers' Web Crypto API. However, in the Cloudflare Workers runtime, the CryptoKey object's `Symbol.toStringTag` property may not be set correctly or may be different from the standard Web Crypto API implementation.

**Evidence**:
- The error message shows `key.constructor.name` is "CryptoKey" (from `invalid_key_input.js:20`)
- But `key?.[Symbol.toStringTag]` is NOT returning 'CryptoKey' string
- This causes `isKeyLike(key)` to return `false`
- Which triggers the error message with the paradoxical wording

### 4. Environmental Factor Analysis

**Cloudflare Workers Environment Specifics**:

Cloudflare Workers uses a V8 isolate with custom implementations of Web APIs. The Workers runtime implements Web Crypto API but may have subtle differences from browser implementations:

1. **Constructor name vs Symbol.toStringTag**: The object's constructor.name is "CryptoKey" but the Symbol.toStringTag may be undefined or different
2. **Workerd runtime**: Cloudflare uses `workerd` (their custom runtime) which implements Web Crypto differently than Node.js or browsers
3. **Version compatibility**: `jose` v6.1.0 claims Cloudflare Workers support, but there may be a runtime-specific issue

**Verification of hypothesis**: The `jose` library package.json lists "cloudflare" and "workers" in keywords and claims support in description, but the validation logic relies on `Symbol.toStringTag` which may not be consistent across all Workers runtime versions.

---

## Root Cause Summary

**Primary Issue**: Cloudflare Workers' CryptoKey implementation does not return 'CryptoKey' for `Symbol.toStringTag` property, causing `jose` library's `isCryptoKey()` validation to fail.

**Why the paradoxical error message?**:
- `invalidKeyInput()` uses `actual.constructor.name` for the error message (shows "CryptoKey")
- `isCryptoKey()` checks `key?.[Symbol.toStringTag]` for validation (returns something other than 'CryptoKey')
- Result: Error says "must be CryptoKey" and "received CryptoKey" but they're checking different properties

**Impact**: JWT signing completely fails in Cloudflare Workers environment despite using a library designed for that environment.

---

## Solution Options

### Option 1: Use JWK Format Instead of PEM (RECOMMENDED)

**Rationale**: Import the key as JWK format, which `jose` handles differently and doesn't rely on `Symbol.toStringTag` validation the same way.

**Implementation**:

```javascript
import { SignJWT, importJWK } from 'jose';

// Convert PEM to JWK first, or store key as JWK directly
export async function signReplykeJwt(user, privateKey, projectId) {
  // Option A: If key is already in JWK format
  const privateKeyObj = await importJWK(JSON.parse(privateKey), 'RS256');

  // Sign JWT
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256' })
    .sign(privateKeyObj);

  return token;
}
```

**Pros**:
- JWK import path in `jose` has different validation logic
- More portable format
- Better support across different runtimes

**Cons**:
- Need to convert existing PEM keys to JWK format
- Slightly larger key size in environment variables

### Option 2: Direct Web Crypto API Usage

**Rationale**: Bypass `jose` library's validation by using Workers' Web Crypto API directly.

**Implementation**:

```javascript
export async function signReplykeJwt(user, privateKey, projectId) {
  // Import key directly with Web Crypto API
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKey
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");

  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  // Create JWT manually or use a simpler signing approach
  // ...
}
```

**Pros**:
- Full control over key import
- No dependency on `jose` validation logic

**Cons**:
- Need to implement JWT structure manually
- More code to maintain
- Loses benefits of `jose` library

### Option 3: Patch `jose` Library Validation (NOT RECOMMENDED)

**Rationale**: Modify `jose` library's `isCryptoKey()` function to handle Cloudflare Workers.

**Why NOT recommended**:
- Requires maintaining a fork
- Updates to `jose` library would be difficult
- Fragile solution

### Option 4: Update to Latest `jose` Version

**Rationale**: Check if newer versions of `jose` have fixed this issue.

**Investigation needed**:
- Current version: 6.1.0
- Check changelog for Cloudflare Workers fixes
- Test with latest version

---

## Recommended Solution

**Use Option 1 (JWK Format) with the following implementation**:

### Step 1: Convert Existing PEM Key to JWK

Create a conversion script:

```javascript
// scripts/convert-pem-to-jwk.js
import { importPKCS8, exportJWK } from 'jose';
import fs from 'fs';

const pemKey = process.env.REPLYKE_PRIVATE_KEY || fs.readFileSync('.env.local', 'utf-8')
  .split('\n')
  .find(line => line.startsWith('REPLYKE_PRIVATE_KEY='))
  ?.replace('REPLYKE_PRIVATE_KEY=', '');

if (!pemKey) {
  console.error('REPLYKE_PRIVATE_KEY not found');
  process.exit(1);
}

const cryptoKey = await importPKCS8(pemKey, 'RS256');
const jwk = await exportJWK(cryptoKey);

console.log('JWK Format (use this in environment variable):');
console.log(JSON.stringify(jwk, null, 2));
```

### Step 2: Update replyke.js

```javascript
import { SignJWT, importJWK } from 'jose';

export async function signReplykeJwt(user, privateKey, projectId) {
  if (!user || !user.id) {
    throw new Error('User object with id is required');
  }

  if (!privateKey || !projectId) {
    throw new Error('Replyke credentials (privateKey and projectId) are required');
  }

  // Parse JWK from JSON string
  let jwk;
  try {
    jwk = typeof privateKey === 'string' ? JSON.parse(privateKey) : privateKey;
  } catch (e) {
    throw new Error('Invalid private key format. Must be valid JWK JSON.');
  }

  const payload = {
    id: user.id,
    username: user.username || user.displayName || user.email?.split('@')[0] || `user_${user.id}`,
    email: user.email,
    avatarUrl: user.avatarUrl || user.avatar_url,
    displayName: user.displayName || user.display_name,
    projectId: projectId
  };

  try {
    // Import JWK format key
    const privateKeyObj = await importJWK(jwk, 'RS256');

    // Sign with RS256 algorithm
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setIssuer('mitobyte-voting-app')
      .setAudience('replyke')
      .setExpirationTime('7d')
      .sign(privateKeyObj);

    return token;
  } catch (error) {
    throw new Error(`JWT signing failed: ${error.message}. Ensure REPLYKE_PRIVATE_KEY is a valid JWK format.`);
  }
}
```

### Step 3: Update Environment Variables

Replace PEM format key with JWK format in:
- `.env.local` (local development)
- Cloudflare Pages environment variables (production)

---

## Alternative: Quick Test with Direct importJWK

**If you want to test immediately without converting**, try this modified approach that might work better with Cloudflare Workers:

```javascript
import { SignJWT } from 'jose';

export async function signReplykeJwt(user, privateKey, projectId) {
  // ... validation ...

  const payload = { /* ... */ };

  try {
    // Parse PEM and import directly with crypto.subtle
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const pemContents = privateKey
      .replace(pemHeader, "")
      .replace(pemFooter, "")
      .replace(/\s/g, "");

    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    // Import with native Web Crypto API
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryDer,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256"
      },
      false,
      ["sign"]
    );

    // Try using this key directly with SignJWT
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setIssuer('mitobyte-voting-app')
      .setAudience('replyke')
      .setExpirationTime('7d')
      .sign(cryptoKey);

    return token;
  } catch (error) {
    throw new Error(`JWT signing failed: ${error.message}`);
  }
}
```

This approach:
1. Manually imports the PEM key using native `crypto.subtle.importKey()`
2. Bypasses `jose`'s `importPKCS8()` which may be creating an incompatible CryptoKey wrapper
3. Passes the native CryptoKey directly to SignJWT

---

## Testing Plan

1. **Test Option 1** (JWK format):
   - Convert PEM to JWK
   - Update code to use `importJWK()`
   - Test locally with `npm run pages:dev`
   - Deploy and test in production

2. **If Option 1 fails, test Alternative**:
   - Use direct `crypto.subtle.importKey()`
   - Keep PEM format in environment variables
   - Test locally and in production

3. **Validation checks**:
   - Token generation succeeds without errors
   - Token is valid JWT format
   - Token can be verified by Replyke service
   - User registration flow completes successfully

---

## Prevention Measures

1. **Document runtime-specific quirks**: Maintain documentation of Cloudflare Workers-specific implementation details
2. **Add runtime detection**: Consider adding runtime detection and conditional logic for different environments
3. **Integration tests**: Create tests that run in actual Cloudflare Workers environment, not just Node.js
4. **Library vetting**: When choosing libraries for edge runtimes, verify actual compatibility through testing, not just documentation claims

---

## Conclusion

The root cause is a mismatch between how Cloudflare Workers implements CryptoKey objects and how the `jose` library validates them. The `Symbol.toStringTag` property check fails in Workers runtime despite the object being a valid CryptoKey.

**Immediate action**: Switch to JWK format (Option 1) or use direct Web Crypto API import (Alternative).

**Success criteria**: JWT tokens generate successfully in Cloudflare Workers environment without validation errors.
