/**
 * Wallet Encryption Utilities for Cloudflare Pages Functions
 * Uses Web Crypto API (AES-GCM) for encryption
 */

// Convert hex string to Uint8Array
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Convert Uint8Array to hex string
function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Import encryption key from hex string
async function importKey(keyHex) {
  const keyBytes = hexToBytes(keyHex);
  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt wallet address
 * @param {string} walletAddress - Plain wallet address
 * @param {string} keyHex - 32-byte hex encryption key
 * @returns {Promise<string>} - Format: iv:authTag:encrypted (all hex)
 */
export async function encryptWallet(walletAddress, keyHex) {
  const key = await importKey(keyHex);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM

  const encoder = new TextEncoder();
  const data = encoder.encode(walletAddress);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    data
  );

  // GCM mode includes auth tag in output (last 16 bytes)
  const encrypted = new Uint8Array(encryptedBuffer);
  const ciphertext = encrypted.slice(0, -16);
  const authTag = encrypted.slice(-16);

  // Return as iv:authTag:ciphertext (all hex)
  return `${bytesToHex(iv)}:${bytesToHex(authTag)}:${bytesToHex(ciphertext)}`;
}

/**
 * Decrypt wallet address
 * @param {string} encryptedData - Format: iv:authTag:encrypted (hex)
 * @param {string} keyHex - 32-byte hex encryption key
 * @returns {Promise<string>} - Plain wallet address
 */
export async function decryptWallet(encryptedData, keyHex) {
  const [ivHex, authTagHex, ciphertextHex] = encryptedData.split(':');

  const key = await importKey(keyHex);
  const iv = hexToBytes(ivHex);
  const authTag = hexToBytes(authTagHex);
  const ciphertext = hexToBytes(ciphertextHex);

  // Combine ciphertext + authTag for GCM decryption
  const encryptedBuffer = new Uint8Array([...ciphertext, ...authTag]);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    encryptedBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Hash wallet address (SHA-256) for lookups
 * @param {string} walletAddress - Plain wallet address
 * @returns {Promise<string>} - 64-character hex hash
 */
export async function hashWallet(walletAddress) {
  const encoder = new TextEncoder();
  const data = encoder.encode(walletAddress.toLowerCase()); // Normalize case
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(hashBuffer));
}
