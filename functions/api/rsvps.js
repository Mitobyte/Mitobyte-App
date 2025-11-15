/**
 * Cloudflare Pages Function: /api/rsvps
 * Handles RSVP creation and updates
 */

import { hashWallet } from '../utils/encryption.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/rsvps - Create or update RSVP
 */
export async function onRequestPost(context) {
  try {
    const { eventId, walletAddress, rsvpStatus } = await context.request.json();

    // Validate required fields
    if (!eventId || !walletAddress || !rsvpStatus) {
      return jsonResponse({
        error: 'Required fields: eventId, walletAddress, rsvpStatus'
      }, 400);
    }

    // Validate RSVP status
    const validStatuses = ['going', 'maybe', 'no'];
    if (!validStatuses.includes(rsvpStatus)) {
      return jsonResponse({
        error: `Invalid rsvp status. Must be one of: ${validStatuses.join(', ')}`
      }, 400);
    }

    // Hash wallet address
    const walletHash = await hashWallet(walletAddress);

    // Check if event exists
    const event = await context.env.DB.prepare(
      'SELECT id FROM events WHERE id = ?'
    ).bind(eventId).first();

    if (!event) {
      return jsonResponse({ error: 'Event not found' }, 404);
    }

    // Check if RSVP already exists
    const existing = await context.env.DB.prepare(
      'SELECT id FROM rsvps WHERE event_id = ? AND user_wallet_hash = ?'
    ).bind(eventId, walletHash).first();

    let result;
    if (existing) {
      // Update existing RSVP
      result = await context.env.DB.prepare(
        'UPDATE rsvps SET rsvp_status = ?, updated_at = datetime("now") WHERE id = ?'
      ).bind(rsvpStatus, existing.id).run();
    } else {
      // Insert new RSVP
      result = await context.env.DB.prepare(
        'INSERT INTO rsvps (event_id, user_wallet_hash, rsvp_status) VALUES (?, ?, ?)'
      ).bind(eventId, walletHash, rsvpStatus).run();
    }

    // Send registration confirmation notification (only for new "going" RSVPs)
    if (!existing && rsvpStatus === 'going') {
      try {
        // Get event details
        const eventDetails = await context.env.DB.prepare(
          'SELECT title, date, time, location FROM events WHERE id = ?'
        ).bind(eventId).first();

        if (eventDetails) {
          const apiKey = context.env.ONESIGNAL_REST_API_KEY;

          if (apiKey) {
            const formatTime = (timeString) => {
              const [hours, minutes] = timeString.split(':');
              const hour = parseInt(hours);
              const ampm = hour >= 12 ? 'PM' : 'AM';
              const displayHour = hour % 12 || 12;
              return `${displayHour}:${minutes} ${ampm}`;
            };

            const formatDate = (dateString) => {
              const date = new Date(dateString + 'T00:00:00');
              return date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              });
            };

            const payload = {
              app_id: 'd583c0e5-bae4-452a-be0c-c7c9156b9261',
              headings: { en: `You're registered for ${eventDetails.title}!` },
              contents: { en: `See you ${formatDate(eventDetails.date)} at ${formatTime(eventDetails.time)} - ${eventDetails.location}` },
              url: `/event/${eventId}`,
              include_external_user_ids: [walletAddress]
            };

            await fetch('https://onesignal.com/api/v1/notifications', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${apiKey}`
              },
              body: JSON.stringify(payload)
            });

            console.log('[RSVP] Sent registration confirmation notification');
          }
        }
      } catch (notifError) {
        console.error('[RSVP] Failed to send notification:', notifError);
        // Don't fail the RSVP if notification fails
      }
    }

    return jsonResponse({
      success: true,
      eventId,
      rsvpStatus,
      updated: !!existing,
    }, existing ? 200 : 201);
  } catch (error) {
    console.error('RSVP error:', error);
    return jsonResponse({ error: 'Failed to save RSVP' }, 500);
  }
}

/**
 * GET /api/rsvps?eventId=123 - Get user's RSVP for an event
 * GET /api/rsvps?walletAddress=0x... - Get all RSVPs for a user
 */
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const eventId = url.searchParams.get('eventId');
    const walletAddress = url.searchParams.get('walletAddress');

    if (!eventId && !walletAddress) {
      return jsonResponse({
        error: 'Either eventId or walletAddress is required'
      }, 400);
    }

    if (eventId && walletAddress) {
      // Get specific RSVP
      const walletHash = await hashWallet(walletAddress);
      const rsvp = await context.env.DB.prepare(
        'SELECT event_id, rsvp_status, created_at, updated_at FROM rsvps WHERE event_id = ? AND user_wallet_hash = ?'
      ).bind(eventId, walletHash).first();

      if (!rsvp) {
        return jsonResponse({ rsvp: null });
      }

      return jsonResponse({ rsvp });
    }

    if (walletAddress) {
      // Get all RSVPs for user
      const walletHash = await hashWallet(walletAddress);
      const { results } = await context.env.DB.prepare(
        'SELECT event_id, rsvp_status, created_at, updated_at FROM rsvps WHERE user_wallet_hash = ?'
      ).bind(walletHash).all();

      return jsonResponse({ rsvps: results });
    }

    return jsonResponse({ error: 'Invalid request' }, 400);
  } catch (error) {
    console.error('Get RSVP error:', error);
    return jsonResponse({ error: 'Failed to fetch RSVP' }, 500);
  }
}

/**
 * DELETE /api/rsvps?eventId=123&walletAddress=0x... - Remove user's RSVP
 */
export async function onRequestDelete(context) {
  try {
    const url = new URL(context.request.url);
    const eventId = url.searchParams.get('eventId');
    const walletAddress = url.searchParams.get('walletAddress');

    // Validate required fields
    if (!eventId || !walletAddress) {
      return jsonResponse({
        error: 'Required parameters: eventId, walletAddress'
      }, 400);
    }

    // Hash wallet address
    const walletHash = await hashWallet(walletAddress);

    // Delete RSVP
    const result = await context.env.DB.prepare(
      'DELETE FROM rsvps WHERE event_id = ? AND user_wallet_hash = ?'
    ).bind(eventId, walletHash).run();

    if (result.meta.changes === 0) {
      return jsonResponse({
        success: false,
        message: 'No RSVP found to delete'
      }, 404);
    }

    return jsonResponse({
      success: true,
      message: 'RSVP removed successfully',
      eventId
    });
  } catch (error) {
    console.error('Delete RSVP error:', error);
    return jsonResponse({ error: 'Failed to delete RSVP' }, 500);
  }
}
