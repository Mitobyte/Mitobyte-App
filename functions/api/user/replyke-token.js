/**
 * Replyke User Registration Endpoint
 * Generates JWT token for authenticated users to use with Replyke services
 * Called after login to register/authenticate user with Replyke
 */

import { registerUserWithReplyke, formatUserForReplyke } from '../../utils/replyke.js';

export async function onRequestGet(context) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔵 REPLYKE TOKEN REQUEST STARTED');
  console.log('═══════════════════════════════════════════════════════════');

  try {
    const url = new URL(context.request.url);
    const walletAddress = url.searchParams.get('walletAddress');

    console.log('📥 Request Parameters:');
    console.log('  - URL:', url.toString());
    console.log('  - walletAddress:', walletAddress);

    if (!walletAddress) {
      console.log('❌ VALIDATION FAILED: Missing wallet address');
      return new Response(JSON.stringify({
        success: false,
        error: 'Wallet address is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Wallet address validation passed');
    console.log('');
    console.log('🔍 Checking Replyke Configuration...');

    // Check if Replyke is configured
    const hasPrivateKey = !!context.env.REPLYKE_PRIVATE_KEY;
    const hasProjectId = !!context.env.VITE_REPLYKE_PROJECT_ID;

    console.log('  - REPLYKE_PRIVATE_KEY exists:', hasPrivateKey);
    console.log('  - REPLYKE_PRIVATE_KEY length:', context.env.REPLYKE_PRIVATE_KEY?.length || 0);
    console.log('  - VITE_REPLYKE_PROJECT_ID exists:', hasProjectId);
    console.log('  - VITE_REPLYKE_PROJECT_ID value:', context.env.VITE_REPLYKE_PROJECT_ID || '(not set)');

    if (!hasPrivateKey || !hasProjectId) {
      console.log('❌ CONFIGURATION FAILED: Missing environment variables');
      return new Response(JSON.stringify({
        success: false,
        error: 'Replyke is not configured. Please set REPLYKE_PRIVATE_KEY and VITE_REPLYKE_PROJECT_ID environment variables.',
        configured: false
      }), {
        status: 503, // Service Unavailable (not a server error)
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Replyke configuration found');
    console.log('');

    console.log('🔐 Validating Private Key Format...');
    const privateKey = context.env.REPLYKE_PRIVATE_KEY;
    console.log('  - Private key type:', typeof privateKey);
    console.log('  - Private key length:', privateKey?.length);
    console.log('  - First 50 chars:', privateKey?.substring(0, 50));
    console.log('  - Last 50 chars:', privateKey?.substring(privateKey.length - 50));

    try {
      console.log('  - Attempting JSON.parse...');
      const jwk = JSON.parse(privateKey);
      console.log('  - ✅ JSON.parse succeeded');
      console.log('  - JWK keys present:', Object.keys(jwk).join(', '));
      console.log('  - JWK.kty:', jwk.kty);
      console.log('  - JWK.alg:', jwk.alg);
      console.log('  - JWK.n (first 50):', jwk.n?.substring(0, 50));
      console.log('  - JWK.e:', jwk.e);
      console.log('  - JWK.d (first 50):', jwk.d?.substring(0, 50));

      if (!jwk.kty || !jwk.n || !jwk.e || !jwk.d) {
        console.log('  - ❌ Missing required JWK fields:');
        console.log('    - kty present:', !!jwk.kty);
        console.log('    - n present:', !!jwk.n);
        console.log('    - e present:', !!jwk.e);
        console.log('    - d present:', !!jwk.d);
        throw new Error('Missing required JWK fields');
      }
      console.log('  - ✅ All required JWK fields present');
    } catch (e) {
      console.error('❌ PRIVATE KEY VALIDATION FAILED');
      console.error('  - Error:', e.message);
      console.error('  - Error type:', e.constructor.name);
      console.error('  - Stack:', e.stack);
      return new Response(JSON.stringify({
        success: false,
        error: 'Replyke private key is not in correct format. Must be RSA private key in JWK JSON format.',
        configured: false
      }), {
        status: 503, // Service Unavailable
        headers: { 'Content-Type': 'application/json' }
      });
    }
    console.log('✅ Private key format validation passed');
    console.log('');

    console.log('🔍 Looking up user in database...');
    console.log('  - Search method: wallet_hash');
    console.log('  - Search value:', walletAddress);

    // Get user from database - try wallet_hash first
    let userResult = await context.env.DB.prepare(`
      SELECT
        u.wallet_hash,
        u.email,
        u.display_name,
        u.created_at,
        up.bio,
        up.skills,
        up.avatar_url
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.wallet_hash = ?
    `).bind(walletAddress).first();

    console.log('  - wallet_hash query result:', userResult ? '✅ Found' : '❌ Not found');

    // Fallback: If not found and walletAddress starts with 'email:', try email lookup
    if (!userResult && walletAddress.startsWith('email:')) {
      const email = walletAddress.replace('email:', '');
      console.log('  - Trying email fallback...');
      console.log('  - Email value:', email);

      userResult = await context.env.DB.prepare(`
        SELECT
          u.wallet_hash,
          u.email,
          u.display_name,
          u.created_at,
          up.bio,
          up.skills,
          up.avatar_url
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE u.email = ?
      `).bind(email).first();

      console.log('  - Email query result:', userResult ? '✅ Found' : '❌ Not found');
    }

    if (!userResult) {
      console.log('❌ USER NOT FOUND in database');
      return new Response(JSON.stringify({
        success: false,
        error: 'User not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ User found in database');
    console.log('  - Email:', userResult.email);
    console.log('  - Display name:', userResult.display_name);
    console.log('  - Wallet hash:', userResult.wallet_hash);
    console.log('');

    console.log('🔄 Formatting user for Replyke...');
    const replykeUser = formatUserForReplyke(userResult, walletAddress);
    console.log('  - Formatted user:', JSON.stringify(replykeUser, null, 2));
    console.log('');

    console.log('🔐 Generating JWT token...');
    console.log('  - Calling registerUserWithReplyke...');

    const result = await registerUserWithReplyke(replykeUser, context.env);

    console.log('✅ JWT TOKEN GENERATION SUCCEEDED!');
    console.log('  - Token length:', result.token?.length);
    console.log('  - Token preview (first 50):', result.token?.substring(0, 50));
    console.log('  - User ID:', result.userId);
    console.log('  - Username:', result.username);
    console.log('  - Expires in:', result.expiresIn);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🟢 REPLYKE TOKEN REQUEST COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════════');

    return new Response(JSON.stringify({
      success: true,
      token: result.token,
      user: {
        id: result.userId,
        username: result.username
      },
      expiresIn: result.expiresIn,
      projectId: context.env.VITE_REPLYKE_PROJECT_ID
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('═══════════════════════════════════════════════════════════');
    console.error('🔴 REPLYKE TOKEN REQUEST FAILED');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('❌ Error:', error.message);
    console.error('❌ Error type:', error.constructor?.name);
    console.error('❌ Error stack:', error.stack);
    console.error('═══════════════════════════════════════════════════════════');

    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to generate Replyke token'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
