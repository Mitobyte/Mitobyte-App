/**
 * Cloudflare Pages Function: /api/checkin
 * Handles QR code check-in for events
 */

import { processStandupResponses } from '../utils/standup-processor.js';
import { hashWallet } from '../utils/encryption.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Validate check-in code format
 */
function isValidCheckInCode(code) {
  return /^EVT-\d+-[a-z0-9]+$/.test(code);
}

/**
 * Extract event ID from check-in code
 */
function extractEventIdFromCode(code) {
  const match = code.match(/^EVT-(\d+)-/);
  return match ? parseInt(match[1]) : null;
}

/**
 * POST /api/checkin - Check in to an event using QR code
 * Body: {
 *   checkInCode: string,
 *   userWalletHash: string,
 *   deviceInfo?: string,
 *   workingOn?: string,
 *   canHelpWith?: string,
 *   needHelpWith?: string,
 *   rawWorkingOn?: string,
 *   rawCanHelpWith?: string,
 *   rawNeedHelpWith?: string,
 *   isProcessed?: boolean
 * }
 */
export async function onRequestPost(context) {
  try {
    const {
      checkInCode,
      userWalletHash,
      deviceInfo,
      customFormResponses,
      formId,
      workingOn,
      canHelpWith,
      needHelpWith,
      rawWorkingOn,
      rawCanHelpWith,
      rawNeedHelpWith,
      isProcessed
    } = await context.request.json();

    // Validate required fields
    if (!checkInCode || !userWalletHash) {
      return jsonResponse({
        error: 'Required fields: checkInCode, userWalletHash'
      }, 400);
    }

    // Validate check-in code format
    if (!isValidCheckInCode(checkInCode)) {
      return jsonResponse({
        error: 'Invalid check-in code format'
      }, 400);
    }

    // Verify event exists and get event details
    const event = await context.env.DB.prepare(
      `SELECT id, title, date, time, capacity, event_type FROM events WHERE check_in_code = ?`
    )
      .bind(checkInCode)
      .first();

    if (!event) {
      return jsonResponse({
        error: 'Event not found or check-in code is invalid'
      }, 404);
    }

    // Hash the wallet address for database lookups
    const hashedWalletAddress = await hashWallet(userWalletHash);

    // Determine if this event type requires standup responses
    const requiresStandUp = event.event_type === 'code_and_coffee' || event.event_type === 'code_and_brews';

    // Process standup responses if provided (optional legacy support)
    let processedResponses = null;
    let confidence = null;
    let contentWarnings = null;

    if (workingOn && canHelpWith && !customFormResponses) {
      // If not already processed by preview, process now
      if (!isProcessed && context.env.AI) {
        const processingResult = await processStandupResponses(context.env.AI, {
          workingOn,
          canHelpWith,
          needHelpWith
        });

        if (!processingResult.success) {
          return jsonResponse({
            error: processingResult.error,
            warnings: processingResult.warnings
          }, 400);
        }

        processedResponses = processingResult.data.cleaned;
        confidence = processingResult.data.confidence;
        contentWarnings = processingResult.data.contentWarnings;
      } else {
        // Use already processed responses from preview
        processedResponses = {
          workingOn,
          canHelpWith,
          needHelpWith
        };
        confidence = 0.95; // High confidence for user-edited data
      }
    }

    // Check if user already checked in
    const existingCheckIn = await context.env.DB.prepare(
      `SELECT id FROM checkins WHERE event_id = ? AND user_wallet_hash = ?`
    )
      .bind(event.id, hashedWalletAddress)
      .first();

    if (existingCheckIn) {
      return jsonResponse({
        error: 'You have already checked in to this event',
        alreadyCheckedIn: true
      }, 409);
    }

    // Check capacity if set
    if (event.capacity) {
      const { count } = await context.env.DB.prepare(
        `SELECT COUNT(*) as count FROM checkins WHERE event_id = ?`
      )
        .bind(event.id)
        .first();

      if (count >= event.capacity) {
        return jsonResponse({
          error: 'Event has reached maximum capacity'
        }, 403);
      }
    }

    // Create check-in record with stand-up data if applicable
    const result = await context.env.DB.prepare(
      `INSERT INTO checkins (
        event_id, user_wallet_hash, check_in_method, device_info,
        working_on, can_help_with, need_help_with,
        raw_working_on, raw_can_help_with, raw_need_help_with,
        is_safe, confidence_score, content_warnings
      )
       VALUES (?, ?, 'qr_code', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        event.id,
        hashedWalletAddress,
        deviceInfo || null,
        requiresStandUp ? processedResponses.workingOn : null,
        requiresStandUp ? processedResponses.canHelpWith : null,
        requiresStandUp ? processedResponses.needHelpWith : null,
        requiresStandUp ? (rawWorkingOn || workingOn) : null,
        requiresStandUp ? (rawCanHelpWith || canHelpWith) : null,
        requiresStandUp ? (rawNeedHelpWith || needHelpWith) : null,
        requiresStandUp ? 1 : null,
        requiresStandUp ? confidence : null,
        requiresStandUp && contentWarnings ? JSON.stringify(contentWarnings) : null
      )
      .run();

    const checkInId = result.meta.last_row_id;

    // Save custom form responses if present
    if (customFormResponses && formId) {
      try {
        await context.env.DB.prepare(
          `INSERT INTO form_responses (check_in_id, form_id, responses, created_at)
           VALUES (?, ?, ?, datetime('now'))`
        )
          .bind(checkInId, formId, customFormResponses)
          .run();
      } catch (formError) {
        console.error('Error saving form responses:', formError);
        // Don't fail the entire check-in if form response saving fails
      }
    }

    // Trigger badge generation asynchronously (don't wait for it)
    context.waitUntil(generateBadgeForCheckIn(context, checkInId, event, hashedWalletAddress));

    return jsonResponse({
      success: true,
      checkInId: checkInId,
      event: {
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.time
      },
      message: `Successfully checked in to ${event.title}`
    }, 201);
  } catch (error) {
    console.error('Check-in error:', error);
    return jsonResponse({ error: 'Failed to process check-in' }, 500);
  }
}

/**
 * GET /api/checkin?code={checkInCode} - Get event details for check-in code
 * Used to preview event before checking in
 */
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const checkInCode = url.searchParams.get('code');

    if (!checkInCode) {
      return jsonResponse({
        error: 'Missing check-in code parameter'
      }, 400);
    }

    if (!isValidCheckInCode(checkInCode)) {
      return jsonResponse({
        error: 'Invalid check-in code format'
      }, 400);
    }

    // Get event details
    const event = await context.env.DB.prepare(
      `SELECT id, title, description, event_type, date, time, location, capacity
       FROM events WHERE check_in_code = ?`
    )
      .bind(checkInCode)
      .first();

    if (!event) {
      return jsonResponse({
        error: 'Event not found'
      }, 404);
    }

    // Get current check-in count
    const { count } = await context.env.DB.prepare(
      `SELECT COUNT(*) as count FROM checkins WHERE event_id = ?`
    )
      .bind(event.id)
      .first();

    return jsonResponse({
      event: {
        ...event,
        checkInCount: count,
        spotsRemaining: event.capacity ? event.capacity - count : null
      }
    });
  } catch (error) {
    console.error('Get event for check-in error:', error);
    return jsonResponse({ error: 'Failed to fetch event details' }, 500);
  }
}

/**
 * Generate badge for check-in (async, non-blocking)
 */
async function generateBadgeForCheckIn(context, checkInId, event, hashedWalletAddress) {
  try {
    console.log('🎨 Starting badge generation for check-in:', checkInId);

    // Get user profile
    const user = await context.env.DB.prepare(
      `SELECT u.display_name, u.email, up.bio, up.skills, up.interests, up.tagline
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.wallet_hash = ?`
    ).bind(hashedWalletAddress).first();

    if (!user) {
      console.warn('⚠️ User not found for badge generation');
      return;
    }

    const eventDetails = {
      title: event.title,
      event_type: event.event_type,
      description: event.description || '',
      location: event.location || 'Milwaukee',
      date: event.date
    };

    const userProfile = {
      display_name: user.display_name || user.email,
      bio: user.bio || '',
      skills: user.skills || '',
      interests: user.interests || ''
    };

    // Call badge generation API
    const badgeResponse = await fetch(`${context.request.url.origin}/api/badges/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventDetails,
        userProfile,
        checkInId
      })
    });

    if (!badgeResponse.ok) {
      const error = await badgeResponse.text();
      console.error('❌ Badge generation failed:', error);
      return;
    }

    const badgeData = await badgeResponse.json();
    console.log('✅ Badge generated successfully for check-in:', checkInId);

  } catch (error) {
    console.error('❌ Error in badge generation:', error);
    // Don't throw - badge generation failure shouldn't block check-in
  }
}
