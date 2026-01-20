/**
 * Replyke Integration Utilities
 * Handles JWT signing and user registration with Replyke service
 */

import jwt from '@tsndr/cloudflare-worker-jwt';

/**
 * Sign a JWT token for Replyke authentication
 * @param {Object} user - User object with id and username
 * @param {string} privateKey - Replyke private signing key (PEM format)
 * @param {string} projectId - Replyke project ID
 * @returns {Promise<string>} Signed JWT token
 */
export async function signReplykeJwt(user, privateKey, projectId) {
  console.log('┌─────────────────────────────────────────────────────────┐');
  console.log('│  🔐 signReplykeJwt FUNCTION CALLED                     │');
  console.log('└─────────────────────────────────────────────────────────┘');

  console.log('📋 Step 1/7: Validating inputs...');

  if (!user || !user.id) {
    console.error('❌ VALIDATION FAILED: Missing user or user.id');
    throw new Error('User object with id is required');
  }
  console.log('  ✅ User object valid');
  console.log('  - User ID:', user.id);
  console.log('  - User email:', user.email);

  if (!privateKey || !projectId) {
    console.error('❌ VALIDATION FAILED: Missing credentials');
    throw new Error('Replyke credentials (privateKey and projectId) are required');
  }
  console.log('  ✅ Credentials present');
  console.log('  - Project ID:', projectId);
  console.log('');

  console.log('📋 Step 2/7: Analyzing private key...');
  console.log('  - Type:', typeof privateKey);
  console.log('  - Length:', privateKey?.length);
  console.log('  - First 100 chars:', privateKey?.substring(0, 100));
  console.log('  - Last 50 chars:', privateKey?.substring(privateKey?.length - 50));
  console.log('');

  console.log('📋 Step 3/7: Parsing JWK from string...');
  let jwk;
  try {
    console.log('  - Attempting JSON.parse()...');
    jwk = typeof privateKey === 'string' ? JSON.parse(privateKey) : privateKey;
    console.log('  - ✅ JSON.parse() succeeded');
    console.log('  - JWK object keys:', Object.keys(jwk).join(', '));
    console.log('  - JWK.kty:', jwk.kty);
    console.log('  - JWK.alg:', jwk.alg);
    console.log('  - JWK.use:', jwk.use);
    console.log('  - JWK.n (first 30):', jwk.n?.substring(0, 30));
    console.log('  - JWK.e:', jwk.e);
    console.log('  - JWK.d (first 30):', jwk.d?.substring(0, 30));
    console.log('');
  } catch (e) {
    console.error('❌ JSON PARSE FAILED');
    console.error('  - Error:', e.message);
    console.error('  - Error type:', e.constructor?.name);
    throw new Error(`Invalid private key format. Must be valid JWK JSON string. Error: ${e.message}`);
  }

  console.log('📋 Step 4/7: Validating JWK structure...');
  if (!jwk.kty || !jwk.n || !jwk.e || !jwk.d) {
    console.error('❌ JWK VALIDATION FAILED - Missing required fields:');
    console.error('  - kty present:', !!jwk.kty, jwk.kty);
    console.error('  - n present:', !!jwk.n);
    console.error('  - e present:', !!jwk.e, jwk.e);
    console.error('  - d present:', !!jwk.d);
    throw new Error('Invalid JWK format. Missing required fields (kty, n, e, d).');
  }
  console.log('  - ✅ All required fields present');
  console.log('');

  console.log('📋 Step 5/7: Building JWT payload...');
  const payload = {
    id: user.id,
    username: user.username || user.displayName || user.email?.split('@')[0] || `user_${user.id}`,
    email: user.email,
    // Optional fields for richer user profiles
    avatarUrl: user.avatarUrl || user.avatar_url,
    displayName: user.displayName || user.display_name,
    // Include project ID in payload
    projectId: projectId
  };

  console.log('  - ✅ Payload created:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('');

  try {
    console.log('📋 Step 6/7: Preparing JWT claims...');

    // Add standard JWT claims with timestamps
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (7 * 24 * 60 * 60); // 7 days from now

    const jwtPayload = {
      ...payload,
      iat: now,
      exp: exp,
      iss: 'mitobyte-voting-app',
      aud: 'replyke'
    };

    console.log('  - ✅ JWT claims prepared:');
    console.log(JSON.stringify(jwtPayload, null, 2));
    console.log('  - Issued at (iat):', new Date(now * 1000).toISOString());
    console.log('  - Expires at (exp):', new Date(exp * 1000).toISOString());
    console.log('');

    console.log('📋 Step 7/7: Signing JWT with worker-specific library...');
    console.log('  - Using @tsndr/cloudflare-worker-jwt library');
    console.log('  - Algorithm: RS256');
    console.log('  - Calling jwt.sign() with JWK...');
    console.log('  - ⚠️  THIS IS THE CRITICAL STEP - Using Worker-compatible JWT library...');

    const token = await jwt.sign(jwtPayload, jwk, { algorithm: 'RS256' });

    console.log('  - 🎉 TOKEN SIGNED SUCCESSFULLY!');
    console.log('  - Token length:', token?.length);
    console.log('  - Token preview (first 80):', token?.substring(0, 80));
    console.log('');
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│  ✅ signReplykeJwt COMPLETED SUCCESSFULLY              │');
    console.log('└─────────────────────────────────────────────────────────┘');

    return token;
  } catch (error) {
    console.error('┌─────────────────────────────────────────────────────────┐');
    console.error('│  ❌ signReplykeJwt FAILED                              │');
    console.error('└─────────────────────────────────────────────────────────┘');
    console.error('💥 ERROR DETAILS:');
    console.error('  - Name:', error.name);
    console.error('  - Message:', error.message);
    console.error('  - Constructor:', error.constructor?.name);
    console.error('  - Stack:', error.stack);
    console.error('');
    throw new Error(`JWT signing failed: ${error.message}. Ensure REPLYKE_PRIVATE_KEY is a valid JWK format.`);
  }
}

/**
 * Register or update a user with Replyke
 * Creates a JWT token that Replyke will use to identify the user
 * @param {Object} user - User object from your database
 * @param {Object} env - Cloudflare environment with REPLYKE_PRIVATE_KEY and VITE_REPLYKE_PROJECT_ID
 * @returns {Promise<Object>} Object containing JWT token and user info
 */
export async function registerUserWithReplyke(user, env) {
  const privateKey = env.REPLYKE_PRIVATE_KEY;
  const projectId = env.VITE_REPLYKE_PROJECT_ID;

  if (!privateKey) {
    throw new Error('REPLYKE_PRIVATE_KEY environment variable not set');
  }

  if (!projectId) {
    throw new Error('VITE_REPLYKE_PROJECT_ID environment variable not set');
  }

  const token = await signReplykeJwt(user, privateKey, projectId);

  return {
    token,
    userId: user.id,
    username: user.username || user.displayName || user.email?.split('@')[0] || `user_${user.id}`,
    expiresIn: '7d'
  };
}

/**
 * Format user data from your database for Replyke
 * @param {Object} dbUser - User from your database
 * @param {string} walletAddress - User's wallet address
 * @returns {Object} Formatted user object for Replyke
 */
export function formatUserForReplyke(dbUser, walletAddress) {
  return {
    id: walletAddress, // Use wallet address as unique ID
    username: dbUser.display_name || dbUser.email?.split('@')[0] || `user_${walletAddress.slice(0, 8)}`,
    email: dbUser.email,
    displayName: dbUser.display_name,
    avatarUrl: dbUser.avatar_url,
    // Include any other relevant user metadata
    metadata: {
      walletAddress: walletAddress,
      joinedAt: dbUser.created_at,
      bio: dbUser.bio,
      skills: dbUser.skills
    }
  };
}
