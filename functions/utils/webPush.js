/**
 * Web Push Protocol Implementation for Cloudflare Workers
 * Implements RFC 8291 (Message Encryption) and RFC 8292 (VAPID)
 * Compatible with Cloudflare Workers Web Crypto API
 */

/**
 * Generate VAPID JWT token for authentication
 */
async function generateVAPIDToken(vapidPrivateKey, vapidPublicKey, audience, subject) {
  // Convert web-push format keys (base64url raw bytes) to JWK format for Web Crypto API
  const privateKeyBytes = base64UrlToArrayBuffer(vapidPrivateKey)
  const publicKeyBytes = base64UrlToArrayBuffer(vapidPublicKey)

  // Extract x and y coordinates from uncompressed public key (65 bytes: 0x04 + x + y)
  const publicKeyArray = new Uint8Array(publicKeyBytes)
  const x = publicKeyArray.slice(1, 33) // Skip 0x04 prefix, get first 32 bytes
  const y = publicKeyArray.slice(33, 65) // Get last 32 bytes

  // Create JWK for private key
  const privateKeyJwk = {
    kty: 'EC',
    crv: 'P-256',
    x: arrayBufferToBase64Url(x),
    y: arrayBufferToBase64Url(y),
    d: arrayBufferToBase64Url(privateKeyBytes),
    ext: true
  }

  // Import private key
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    privateKeyJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  // Create JWT header and payload
  const header = { typ: 'JWT', alg: 'ES256' }
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 43200, // 12 hours
    sub: subject
  }

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const unsignedToken = `${encodedHeader}.${encodedPayload}`

  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  )

  // Web Crypto API returns IEEE P1363 format (raw r+s), but JWT requires DER
  const derSignature = convertIEEEP1363ToDER(new Uint8Array(signature))
  const encodedSignature = arrayBufferToBase64Url(derSignature)

  return `${unsignedToken}.${encodedSignature}`
}

/**
 * Convert ECDSA signature from IEEE P1363 format (raw r+s) to DER format
 */
function convertIEEEP1363ToDER(rawSignature) {
  // ECDSA signature is 64 bytes: r (32 bytes) + s (32 bytes)
  const r = rawSignature.slice(0, 32)
  const s = rawSignature.slice(32, 64)

  // Build DER sequence
  const rDER = buildDERInteger(r)
  const sDER = buildDERInteger(s)

  const sequenceLength = rDER.length + sDER.length
  const der = new Uint8Array(2 + sequenceLength)

  der[0] = 0x30 // SEQUENCE tag
  der[1] = sequenceLength
  der.set(rDER, 2)
  der.set(sDER, 2 + rDER.length)

  return der
}

/**
 * Build DER integer
 */
function buildDERInteger(bytes) {
  // Remove leading zeros
  let start = 0
  while (start < bytes.length && bytes[start] === 0) {
    start++
  }

  // If MSB is set, prepend 0x00 to indicate positive number
  const needsPadding = bytes[start] >= 0x80
  const length = bytes.length - start + (needsPadding ? 1 : 0)

  const der = new Uint8Array(2 + length)
  der[0] = 0x02 // INTEGER tag
  der[1] = length

  if (needsPadding) {
    der[2] = 0x00
    der.set(bytes.slice(start), 3)
  } else {
    der.set(bytes.slice(start), 2)
  }

  return der
}

/**
 * Encrypt push notification payload using AES-GCM
 */
async function encryptPayload(payload, userPublicKey, userAuth) {
  const payloadBuffer = new TextEncoder().encode(JSON.stringify(payload))

  // Generate local key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )

  // Import user's public key
  const userPublicKeyBuffer = base64UrlToArrayBuffer(userPublicKey)
  const importedUserPublicKey = await crypto.subtle.importKey(
    'raw',
    userPublicKeyBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: importedUserPublicKey },
    localKeyPair.privateKey,
    256
  )

  // Import auth secret
  const authBuffer = base64UrlToArrayBuffer(userAuth)

  // Derive encryption key and nonce
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const { contentEncryptionKey, nonce } = await deriveKeyAndNonce(
    sharedSecret,
    authBuffer,
    salt
  )

  // Encrypt payload with padding
  const paddedPayload = addPadding(payloadBuffer, 2)
  const encryptedPayload = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    contentEncryptionKey,
    paddedPayload
  )

  // Export local public key
  const localPublicKey = await crypto.subtle.exportKey('raw', localKeyPair.publicKey)

  return {
    ciphertext: new Uint8Array(encryptedPayload),
    salt: salt,
    publicKey: new Uint8Array(localPublicKey)
  }
}

/**
 * Derive content encryption key and nonce using HKDF
 */
async function deriveKeyAndNonce(sharedSecret, authSecret, salt) {
  // Create pseudo-random key (PRK)
  const authKey = await crypto.subtle.importKey(
    'raw',
    authSecret,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const prk = await crypto.subtle.sign('HMAC', authKey, new Uint8Array(sharedSecret))

  // Derive content encryption key
  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\x00')
  const cekHkdf = await hkdf(new Uint8Array(prk), salt, cekInfo, 16)
  const contentEncryptionKey = await crypto.subtle.importKey(
    'raw',
    cekHkdf,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )

  // Derive nonce
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\x00')
  const nonce = await hkdf(new Uint8Array(prk), salt, nonceInfo, 12)

  return { contentEncryptionKey, nonce }
}

/**
 * HKDF (HMAC-based Key Derivation Function)
 */
async function hkdf(prk, salt, info, length) {
  const key = await crypto.subtle.importKey(
    'raw',
    prk,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const infoAndCounter = new Uint8Array(info.length + 1)
  infoAndCounter.set(info)
  infoAndCounter[info.length] = 0x01

  const okm = await crypto.subtle.sign('HMAC', key, infoAndCounter)
  return new Uint8Array(okm).slice(0, length)
}

/**
 * Add padding to payload
 */
function addPadding(payload, paddingLength) {
  const padded = new Uint8Array(payload.length + paddingLength + 1)
  padded.set(payload, paddingLength)
  // Padding delimiter
  padded[paddingLength] = 0x02
  return padded
}

/**
 * Send push notification to a single subscription
 */
export async function sendPushNotification(subscription, payload, vapidKeys, subject) {
  try {
    const { endpoint, keys } = subscription

    // Encrypt payload
    const encrypted = await encryptPayload(payload, keys.p256dh, keys.auth)

    // Build request body
    const body = new Uint8Array(
      encrypted.salt.length +
      4 + // record size
      1 + // public key length
      encrypted.publicKey.length +
      encrypted.ciphertext.length
    )

    let offset = 0
    body.set(encrypted.salt, offset)
    offset += encrypted.salt.length

    // Record size (4096)
    const recordSize = new DataView(new ArrayBuffer(4))
    recordSize.setUint32(0, 4096, false)
    body.set(new Uint8Array(recordSize.buffer), offset)
    offset += 4

    // Public key length
    body[offset] = encrypted.publicKey.length
    offset += 1

    body.set(encrypted.publicKey, offset)
    offset += encrypted.publicKey.length

    body.set(encrypted.ciphertext, offset)

    // Extract audience from endpoint (origin)
    const url = new URL(endpoint)
    const audience = `${url.protocol}//${url.host}`

    // Generate VAPID token
    const vapidToken = await generateVAPIDToken(
      vapidKeys.privateKey,
      vapidKeys.publicKey,
      audience,
      subject
    )

    // Send push notification
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Authorization': `vapid t=${vapidToken}, k=${arrayBufferToBase64Url(base64UrlToArrayBuffer(vapidKeys.publicKey))}`,
        'TTL': '86400', // 24 hours
        'Urgency': 'high'
      },
      body: body
    })

    // Get error response body for debugging
    let errorBody = null
    if (!response.ok) {
      try {
        errorBody = await response.text()
      } catch (e) {
        // Ignore error reading body
      }
    }

    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      errorBody,
      shouldDelete: response.status === 410 || response.status === 404
    }
  } catch (error) {
    console.error('Push notification error:', error)
    return {
      success: false,
      error: error.message,
      stack: error.stack,
      shouldDelete: false
    }
  }
}

/**
 * Utility: Base64 URL encode
 */
function base64UrlEncode(str) {
  const base64 = btoa(str)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Utility: Array buffer to Base64 URL
 */
function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Utility: Base64 URL to ArrayBuffer
 */
function base64UrlToArrayBuffer(base64Url) {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const padding = (4 - (base64.length % 4)) % 4
  const paddedBase64 = base64 + '='.repeat(padding)
  const binary = atob(paddedBase64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}
