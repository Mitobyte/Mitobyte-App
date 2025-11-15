/**
 * Generate a secure JWT secret for production use
 * Run: node scripts/generate-jwt-secret.js
 */

import crypto from 'crypto';

console.log('🔐 Generating secure JWT secret...\n');

// Generate 32 bytes (256 bits) of random data
const secret = crypto.randomBytes(32);
const secretHex = secret.toString('hex');

console.log('✅ JWT Secret Generated!\n');
console.log('Secret (hex format):');
console.log(secretHex);
console.log('\n📋 Add to your environment:\n');

console.log('For Local Development (.dev.vars):');
console.log('─────────────────────────────────────');
console.log(`JWT_SECRET=${secretHex}`);

console.log('\n\nFor Production (Cloudflare Pages):');
console.log('─────────────────────────────────────');
console.log('Option 1: Using wrangler CLI:');
console.log(`echo "${secretHex}" | wrangler pages secret put JWT_SECRET --project-name=mitobyte-voting\n`);

console.log('Option 2: Using Cloudflare Dashboard:');
console.log('1. Go to Cloudflare Dashboard > Pages > mitobyte-voting');
console.log('2. Navigate to Settings > Environment Variables');
console.log('3. Add variable: JWT_SECRET');
console.log(`4. Value: ${secretHex}`);
console.log('5. Apply to: Production (and Preview if needed)\n');

console.log('⚠️  SECURITY WARNINGS:');
console.log('- NEVER commit this secret to version control');
console.log('- Store it securely in environment variables only');
console.log('- Use different secrets for dev and production');
console.log('- Rotate this secret periodically (invalidates all tokens)');
console.log('- Keep this secret as secure as your database credentials\n');
