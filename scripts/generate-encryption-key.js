/**
 * Generate a secure 256-bit (32-byte) encryption key for wallet encryption
 * Run with: node scripts/generate-encryption-key.js
 */

import crypto from 'crypto';

// Generate 32 random bytes (256 bits) for AES-256
const key = crypto.randomBytes(32);

// Convert to hex string
const keyHex = key.toString('hex');

console.log('\n✅ Generated Encryption Key (keep this secret!):\n');
console.log(keyHex);
console.log('\n📋 Instructions:\n');
console.log('1. Copy the key above');
console.log('2. Add it as a secret in Cloudflare Pages:');
console.log('   - Go to: Workers & Pages > mitobyte-voting > Settings > Environment variables');
console.log('   - Add variable: WALLET_ENCRYPTION_KEY');
console.log('   - Type: Secret');
console.log('   - Paste the key as the value');
console.log('   - Apply to: Production');
console.log('\n3. OR set it via CLI:');
console.log(`   echo "${keyHex}" | wrangler pages secret put WALLET_ENCRYPTION_KEY\n`);
console.log('⚠️  NEVER commit this key to git or share it publicly!\n');
