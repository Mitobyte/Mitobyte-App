/**
 * Cloudflare Pages Function: /api/profile
 * Handles user profile operations (GET, POST, PUT)
 */

import { hashWallet } from '../utils/encryption.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/profile - Get user profile by wallet address or hash
 * Query params:
 *   - walletAddress: user's wallet address or email identifier (will be hashed)
 *   - walletHash: user's already-hashed wallet address (skips hashing)
 */
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const walletAddress = url.searchParams.get('walletAddress');
    const walletHash = url.searchParams.get('walletHash');

    if (!walletAddress && !walletHash) {
      return jsonResponse({ error: 'walletAddress or walletHash parameter required' }, 400);
    }

    // Use provided hash or hash the wallet address
    const finalWalletHash = walletHash || await hashWallet(walletAddress);

    // Get user data with display_name
    const user = await context.env.DB.prepare(
      `SELECT id, display_name, email FROM users WHERE wallet_hash = ?`
    )
      .bind(finalWalletHash)
      .first();

    if (!user) {
      return jsonResponse({ error: 'User not found' }, 404);
    }

    // Get user profile
    const profile = await context.env.DB.prepare(
      `SELECT * FROM user_profiles WHERE user_id = ?`
    )
      .bind(user.id)
      .first();

    // Merge user data with profile
    const mergedProfile = {
      ...(profile || {}),
      display_name: user.display_name,
      email: user.email
    };

    return jsonResponse({
      success: true,
      profile: mergedProfile
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return jsonResponse({ error: 'Failed to fetch profile' }, 500);
  }
}

/**
 * POST /api/profile - Create or update user profile
 * Body: {
 *   walletAddress: string,
 *   avatar_url?: string,
 *   tagline?: string,
 *   bio?: string,
 *   location?: string,
 *   website?: string,
 *   github_username?: string,
 *   twitter_username?: string,
 *   linkedin_url?: string,
 *   discord_username?: string,
 *   skills?: string (JSON array),
 *   interests?: string (JSON array),
 *   profile_completed?: boolean,
 *   markComplete?: boolean (marks profile as complete with timestamp)
 * }
 */
export async function onRequestPost(context) {
  try {
    console.log('=== PROFILE SAVE START ===');
    const body = await context.request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));

    const { walletAddress, markComplete, display_name, email, ...profileData } = body;
    console.log('Extracted fields:', { walletAddress, markComplete, display_name, email, profileDataKeys: Object.keys(profileData) });

    if (!walletAddress) {
      console.error('ERROR: walletAddress missing');
      return jsonResponse({ error: 'walletAddress required' }, 400);
    }

    // Hash wallet address to match database storage
    console.log('Hashing wallet address...');
    const walletHash = await hashWallet(walletAddress);
    console.log('Wallet hash:', walletHash);

    // Get user ID from wallet hash
    console.log('Looking up user...');
    const user = await context.env.DB.prepare(
      `SELECT id FROM users WHERE wallet_hash = ?`
    )
      .bind(walletHash)
      .first();
    console.log('User found:', user);

    if (!user) {
      console.error('ERROR: User not found for hash:', walletHash);
      return jsonResponse({ error: 'User not found' }, 404);
    }

    // If email is provided, update it in users table
    if (email !== undefined && email !== null) {
      console.log('Updating email in users table:', email);
      try {
        await context.env.DB.prepare(
          `UPDATE users SET email = ?, updated_at = datetime('now') WHERE wallet_hash = ?`
        )
          .bind(email.trim(), walletHash)
          .run();
        console.log('Email updated successfully');
      } catch (emailError) {
        console.error('ERROR updating email:', emailError);
        throw emailError;
      }
    }

    // If display_name is provided, update it in users table
    if (display_name !== undefined) {
      // Validate display_name
      if (display_name.trim().length < 3) {
        return jsonResponse({ error: 'Username must be at least 3 characters' }, 400);
      }

      // Check if username is already taken by another user
      const existingUser = await context.env.DB.prepare(
        `SELECT id FROM users WHERE LOWER(display_name) = LOWER(?) AND wallet_hash != ? LIMIT 1`
      )
        .bind(display_name.trim(), walletHash)
        .first();

      if (existingUser) {
        return jsonResponse({ error: 'Username is already taken' }, 409);
      }

      // Update display_name in users table
      await context.env.DB.prepare(
        `UPDATE users SET display_name = ?, updated_at = datetime('now') WHERE wallet_hash = ?`
      )
        .bind(display_name.trim(), walletHash)
        .run();
    }

    // Check if profile exists
    console.log('Checking if profile exists for user_id:', user.id);
    const existingProfile = await context.env.DB.prepare(
      `SELECT id FROM user_profiles WHERE user_id = ?`
    )
      .bind(user.id)
      .first();
    console.log('Existing profile:', existingProfile);

    if (existingProfile) {
      console.log('Updating existing profile...');
      // Update existing profile
      const fields = [];
      const values = [];

      console.log('Processing profile data fields:', Object.keys(profileData));
      Object.entries(profileData).forEach(([key, value]) => {
        if (value !== undefined) {
          console.log(`Field ${key}:`, typeof value, value);
          // Convert boolean profile_completed to integer for SQLite
          if (key === 'profile_completed') {
            fields.push(`${key} = ?`);
            values.push(value ? 1 : 0);
          }
          // Convert arrays (skills, interests) to JSON strings for SQLite
          else if (Array.isArray(value)) {
            console.log(`Converting array field ${key} to JSON string`);
            fields.push(`${key} = ?`);
            values.push(JSON.stringify(value));
          } else {
            fields.push(`${key} = ?`);
            values.push(value);
          }
        }
      });

      // If markComplete flag is true, set completion fields
      if (markComplete) {
        console.log('Setting profile as complete');
        fields.push('profile_completed = ?');
        values.push(1);
        fields.push('onboarding_completed_at = datetime(\'now\')');
      }

      if (fields.length > 0) {
        fields.push('updated_at = datetime(\'now\')');
        values.push(user.id);

        const updateSQL = `UPDATE user_profiles SET ${fields.join(', ')} WHERE user_id = ?`;
        console.log('Update SQL:', updateSQL);
        console.log('Update values:', values);

        try {
          const updateResult = await context.env.DB.prepare(updateSQL)
            .bind(...values)
            .run();
          console.log('Update result:', updateResult);
        } catch (updateError) {
          console.error('ERROR during profile update:', updateError);
          console.error('Update SQL:', updateSQL);
          console.error('Update values:', values);
          throw updateError;
        }
      }

      console.log('Profile updated successfully');
      return jsonResponse({
        success: true,
        message: 'Profile updated'
      });
    } else {
      console.log('Creating new profile...');
      // Create new profile
      const fields = ['user_id'];
      const placeholders = ['?'];
      const values = [user.id];

      console.log('Processing profile data fields for insert:', Object.keys(profileData));
      Object.entries(profileData).forEach(([key, value]) => {
        if (value !== undefined) {
          console.log(`Field ${key}:`, typeof value, value);
          // Convert boolean profile_completed to integer for SQLite
          if (key === 'profile_completed') {
            fields.push(key);
            placeholders.push('?');
            values.push(value ? 1 : 0);
          }
          // Convert arrays (skills, interests) to JSON strings for SQLite
          else if (Array.isArray(value)) {
            console.log(`Converting array field ${key} to JSON string`);
            fields.push(key);
            placeholders.push('?');
            values.push(JSON.stringify(value));
          } else {
            fields.push(key);
            placeholders.push('?');
            values.push(value);
          }
        }
      });

      // If markComplete flag is true, set completion fields
      if (markComplete) {
        console.log('Setting profile as complete on creation');
        fields.push('profile_completed');
        placeholders.push('?');
        values.push(1);
        fields.push('onboarding_completed_at');
        placeholders.push('datetime(\'now\')');
      }

      const insertSQL = `INSERT INTO user_profiles (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
      console.log('Insert SQL:', insertSQL);
      console.log('Insert values:', values);

      try {
        const insertResult = await context.env.DB.prepare(insertSQL)
          .bind(...values)
          .run();
        console.log('Insert result:', insertResult);
      } catch (insertError) {
        console.error('ERROR during profile insert:', insertError);
        console.error('Insert SQL:', insertSQL);
        console.error('Insert values:', values);
        throw insertError;
      }

      console.log('Profile created successfully');
      return jsonResponse({
        success: true,
        message: 'Profile created'
      }, 201);
    }
  } catch (error) {
    console.error('=== PROFILE SAVE ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));

    // Return detailed error for debugging
    return jsonResponse({
      success: false,
      error: error.message || 'Failed to save profile',
      errorType: error.constructor.name,
      details: error.stack
    }, 500);
  }
}
