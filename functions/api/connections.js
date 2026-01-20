/**
 * Cloudflare Pages Function: /api/connections
 * Manage user connections
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/connections?walletAddress={address}
 * Get all connections for a user
 */
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    let walletAddress = url.searchParams.get('walletAddress');

    if (!walletAddress) {
      return jsonResponse({ error: 'Missing walletAddress parameter' }, 400);
    }

    // Handle email: prefix format
    let actualWalletHash = walletAddress;
    if (walletAddress.startsWith('email:')) {
      const email = walletAddress.substring(6); // Remove 'email:' prefix
      const user = await context.env.DB.prepare(
        'SELECT wallet_hash FROM users WHERE email = ?'
      ).bind(email).first();

      if (!user) {
        return jsonResponse({ error: 'User not found' }, 404);
      }
      actualWalletHash = user.wallet_hash;
    }

    // Get all users this user has connected with
    const { results: connections } = await context.env.DB.prepare(
      `SELECT
        c.id,
        c.connected_wallet_hash,
        c.created_at,
        u.display_name,
        u.email
       FROM connections c
       LEFT JOIN users u ON c.connected_wallet_hash = u.wallet_hash
       WHERE c.user_wallet_hash = ?
       ORDER BY c.created_at DESC`
    )
      .bind(actualWalletHash)
      .all();

    // Get count of connections
    const count = connections.length;

    return jsonResponse({
      success: true,
      connections: connections.map(c => ({
        id: c.id,
        walletAddress: c.connected_wallet_hash,
        displayName: c.display_name || c.email || 'Anonymous',
        email: c.email,
        connectedAt: c.created_at
      })),
      count
    });
  } catch (error) {
    console.error('Get connections error:', error);
    return jsonResponse({
      error: 'Failed to fetch connections',
      details: error.message,
      stack: error.stack
    }, 500);
  }
}

/**
 * Helper function to resolve wallet address to wallet_hash
 * Handles both direct wallet_hash and email: prefix formats
 */
async function resolveToWalletHash(identifier, db) {
  if (!identifier) return null;

  // If it starts with "email:", look up the user by email
  if (identifier.startsWith('email:')) {
    const email = identifier.substring(6);
    const user = await db.prepare(
      'SELECT wallet_hash FROM users WHERE email = ?'
    ).bind(email).first();

    if (!user) return null;
    return user.wallet_hash;
  }

  // If it's a 64-character hex string, it's already a wallet_hash
  if (/^[a-f0-9]{64}$/i.test(identifier)) {
    return identifier;
  }

  // Otherwise, treat it as a wallet address and look it up
  // Try to find user by display_name or email matching the identifier
  const user = await db.prepare(
    'SELECT wallet_hash FROM users WHERE email = ? OR display_name = ?'
  ).bind(identifier, identifier).first();

  if (user) return user.wallet_hash;

  // If still not found, return the identifier as-is (might be wallet_hash)
  return identifier;
}

/**
 * POST /api/connections
 * Add a new connection
 * Body: { userWalletHash, connectedWalletHash }
 */
export async function onRequestPost(context) {
  try {
    const { userWalletHash, connectedWalletHash } = await context.request.json();

    console.log('🔍 POST /api/connections - Received:', { userWalletHash, connectedWalletHash });

    if (!userWalletHash || !connectedWalletHash) {
      return jsonResponse({
        error: 'Required fields: userWalletHash, connectedWalletHash'
      }, 400);
    }

    // Resolve both identifiers to wallet_hash format
    const actualUserWalletHash = await resolveToWalletHash(userWalletHash, context.env.DB);
    const actualConnectedWalletHash = await resolveToWalletHash(connectedWalletHash, context.env.DB);

    console.log('✅ Resolved wallet hashes:', {
      actualUserWalletHash,
      actualConnectedWalletHash
    });

    if (!actualUserWalletHash || !actualConnectedWalletHash) {
      return jsonResponse({
        error: 'Unable to resolve one or both wallet addresses. Please ensure both users have accounts.',
        debug: {
          userResolved: !!actualUserWalletHash,
          connectedResolved: !!actualConnectedWalletHash,
          userInput: userWalletHash,
          connectedInput: connectedWalletHash
        }
      }, 404);
    }

    // Check if they're trying to connect with themselves
    if (actualUserWalletHash === actualConnectedWalletHash) {
      return jsonResponse({
        error: 'You cannot connect with yourself'
      }, 400);
    }

    // Ensure the connecting user exists in the database
    const connectingUser = await context.env.DB.prepare(
      `SELECT wallet_hash FROM users WHERE wallet_hash = ?`
    )
      .bind(actualUserWalletHash)
      .first();

    if (!connectingUser) {
      return jsonResponse({
        error: 'User account not found. Please ensure you are logged in.',
        debug: { actualUserWalletHash }
      }, 404);
    }

    // Check if the user being connected to exists
    const connectedUser = await context.env.DB.prepare(
      `SELECT wallet_hash FROM users WHERE wallet_hash = ?`
    )
      .bind(actualConnectedWalletHash)
      .first();

    if (!connectedUser) {
      return jsonResponse({
        error: 'Cannot connect to this user. They may not have an account yet.',
        debug: { actualConnectedWalletHash }
      }, 404);
    }

    // Check if connection already exists
    const existingConnection = await context.env.DB.prepare(
      `SELECT id FROM connections WHERE user_wallet_hash = ? AND connected_wallet_hash = ?`
    )
      .bind(actualUserWalletHash, actualConnectedWalletHash)
      .first();

    if (existingConnection) {
      return jsonResponse({
        error: 'Connection already exists'
      }, 400);
    }

    // Create the connection
    await context.env.DB.prepare(
      `INSERT INTO connections (user_wallet_hash, connected_wallet_hash)
       VALUES (?, ?)`
    )
      .bind(actualUserWalletHash, actualConnectedWalletHash)
      .run();

    console.log('✅ Connection created successfully');

    return jsonResponse({
      success: true,
      message: 'Connection added successfully'
    }, 201);
  } catch (error) {
    console.error('❌ Add connection error:', error);
    return jsonResponse({
      error: 'Failed to add connection',
      details: error.message,
      stack: error.stack
    }, 500);
  }
}

/**
 * DELETE /api/connections
 * Remove a connection
 * Body: { userWalletHash, connectedWalletHash }
 */
export async function onRequestDelete(context) {
  try {
    const { userWalletHash, connectedWalletHash } = await context.request.json();

    console.log('🔍 DELETE /api/connections - Received:', { userWalletHash, connectedWalletHash });

    if (!userWalletHash || !connectedWalletHash) {
      return jsonResponse({
        error: 'Required fields: userWalletHash, connectedWalletHash'
      }, 400);
    }

    // Resolve both identifiers to wallet_hash format
    const actualUserWalletHash = await resolveToWalletHash(userWalletHash, context.env.DB);
    const actualConnectedWalletHash = await resolveToWalletHash(connectedWalletHash, context.env.DB);

    console.log('✅ Resolved wallet hashes for deletion:', {
      actualUserWalletHash,
      actualConnectedWalletHash
    });

    if (!actualUserWalletHash || !actualConnectedWalletHash) {
      return jsonResponse({
        error: 'Unable to resolve one or both wallet addresses.',
        debug: {
          userResolved: !!actualUserWalletHash,
          connectedResolved: !!actualConnectedWalletHash
        }
      }, 404);
    }

    // Delete the connection
    const result = await context.env.DB.prepare(
      `DELETE FROM connections WHERE user_wallet_hash = ? AND connected_wallet_hash = ?`
    )
      .bind(actualUserWalletHash, actualConnectedWalletHash)
      .run();

    if (result.meta.changes === 0) {
      return jsonResponse({
        error: 'Connection not found'
      }, 404);
    }

    console.log('✅ Connection deleted successfully');

    return jsonResponse({
      success: true,
      message: 'Connection removed successfully'
    });
  } catch (error) {
    console.error('❌ Remove connection error:', error);
    return jsonResponse({
      error: 'Failed to remove connection',
      details: error.message,
      stack: error.stack
    }, 500);
  }
}
