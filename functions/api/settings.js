/**
 * Cloudflare Pages Function: /api/settings
 * Handles user app settings operations (GET, POST)
 */

import { hashWallet } from '../utils/encryption.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/settings - Get user settings by wallet address
 * Query params:
 *   - walletAddress: user's wallet address or email identifier
 */
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const walletAddress = url.searchParams.get('walletAddress');

    if (!walletAddress) {
      return jsonResponse({ error: 'walletAddress parameter required' }, 400);
    }

    // Hash wallet address to match database storage
    const walletHash = await hashWallet(walletAddress);

    // Get user ID from wallet hash
    const user = await context.env.DB.prepare(
      `SELECT id FROM users WHERE wallet_hash = ?`
    )
      .bind(walletHash)
      .first();

    if (!user) {
      return jsonResponse({ error: 'User not found' }, 404);
    }

    // Get user settings
    const settings = await context.env.DB.prepare(
      `SELECT * FROM user_settings WHERE user_id = ?`
    )
      .bind(user.id)
      .first();

    // Return settings or default values
    const defaultSettings = {
      eventReminders: true,
      communityUpdates: true,
      emailNotifications: true,
      profileVisibility: 'public',
      showEmail: false,
      showActivity: true,
      defaultView: 'home'
    };

    return jsonResponse({
      success: true,
      settings: settings ? {
        eventReminders: settings.event_reminders === 1,
        communityUpdates: settings.community_updates === 1,
        emailNotifications: settings.email_notifications === 1,
        profileVisibility: settings.profile_visibility,
        showEmail: settings.show_email === 1,
        showActivity: settings.show_activity === 1,
        defaultView: settings.default_view
      } : defaultSettings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return jsonResponse({ error: 'Failed to fetch settings' }, 500);
  }
}

/**
 * POST /api/settings - Create or update user settings
 * Body: {
 *   walletAddress: string,
 *   eventReminders?: boolean,
 *   communityUpdates?: boolean,
 *   emailNotifications?: boolean,
 *   profileVisibility?: string,
 *   showEmail?: boolean,
 *   showActivity?: boolean,
 *   defaultView?: string
 * }
 */
export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { walletAddress, ...settingsData } = body;

    if (!walletAddress) {
      return jsonResponse({ error: 'walletAddress required' }, 400);
    }

    // Hash wallet address to match database storage
    const walletHash = await hashWallet(walletAddress);

    // Get user ID from wallet hash
    const user = await context.env.DB.prepare(
      `SELECT id FROM users WHERE wallet_hash = ?`
    )
      .bind(walletHash)
      .first();

    if (!user) {
      return jsonResponse({ error: 'User not found' }, 404);
    }

    // Convert camelCase to snake_case and boolean to integer
    const dbSettings = {};
    if (settingsData.eventReminders !== undefined) {
      dbSettings.event_reminders = settingsData.eventReminders ? 1 : 0;
    }
    if (settingsData.communityUpdates !== undefined) {
      dbSettings.community_updates = settingsData.communityUpdates ? 1 : 0;
    }
    if (settingsData.emailNotifications !== undefined) {
      dbSettings.email_notifications = settingsData.emailNotifications ? 1 : 0;
    }
    if (settingsData.profileVisibility !== undefined) {
      dbSettings.profile_visibility = settingsData.profileVisibility;
    }
    if (settingsData.showEmail !== undefined) {
      dbSettings.show_email = settingsData.showEmail ? 1 : 0;
    }
    if (settingsData.showActivity !== undefined) {
      dbSettings.show_activity = settingsData.showActivity ? 1 : 0;
    }
    if (settingsData.defaultView !== undefined) {
      dbSettings.default_view = settingsData.defaultView;
    }

    // Check if settings exist
    const existingSettings = await context.env.DB.prepare(
      `SELECT id FROM user_settings WHERE user_id = ?`
    )
      .bind(user.id)
      .first();

    if (existingSettings) {
      // Update existing settings
      const fields = [];
      const values = [];

      Object.entries(dbSettings).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      });

      if (fields.length > 0) {
        fields.push('updated_at = datetime(\'now\')');
        values.push(user.id);

        await context.env.DB.prepare(
          `UPDATE user_settings SET ${fields.join(', ')} WHERE user_id = ?`
        )
          .bind(...values)
          .run();
      }

      return jsonResponse({
        success: true,
        message: 'Settings updated'
      });
    } else {
      // Create new settings with defaults
      const fields = ['user_id'];
      const placeholders = ['?'];
      const values = [user.id];

      // Set defaults
      const defaultDbSettings = {
        event_reminders: 1,
        community_updates: 1,
        email_notifications: 1,
        profile_visibility: 'public',
        show_email: 0,
        show_activity: 1,
        default_view: 'home',
        ...dbSettings // Override with provided settings
      };

      Object.entries(defaultDbSettings).forEach(([key, value]) => {
        fields.push(key);
        placeholders.push('?');
        values.push(value);
      });

      await context.env.DB.prepare(
        `INSERT INTO user_settings (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`
      )
        .bind(...values)
        .run();

      return jsonResponse({
        success: true,
        message: 'Settings created'
      }, 201);
    }
  } catch (error) {
    console.error('Create/update settings error:', error);
    return jsonResponse({ error: 'Failed to save settings' }, 500);
  }
}
