/**
 * Cloudflare Pages Function: /api/admin/checkins
 * Admin endpoint to view check-ins for events
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Verify admin role
 */
async function verifyAdmin(context, userWalletHash) {
  if (!userWalletHash) {
    return false;
  }

  const user = await context.env.DB.prepare(
    `SELECT role FROM users WHERE wallet_hash = ?`
  )
    .bind(userWalletHash)
    .first();

  return user && user.role === 'admin';
}

/**
 * GET /api/admin/checkins?eventId={id} - Get all check-ins for an event
 */
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const eventId = url.searchParams.get('eventId');
    const userWalletHash = url.searchParams.get('userWalletHash');

    // Verify admin access
    const isAdmin = await verifyAdmin(context, userWalletHash);
    if (!isAdmin) {
      return jsonResponse({
        error: 'Unauthorized: Admin access required'
      }, 403);
    }

    if (!eventId) {
      return jsonResponse({
        error: 'Missing eventId parameter'
      }, 400);
    }

    // Get event details
    const event = await context.env.DB.prepare(
      `SELECT id, title, date, time, location, capacity, event_type
       FROM events WHERE id = ?`
    )
      .bind(eventId)
      .first();

    if (!event) {
      return jsonResponse({
        error: 'Event not found'
      }, 404);
    }

    // Get all check-ins for the event
    const { results: checkins } = await context.env.DB.prepare(
      `SELECT
        c.id,
        c.user_wallet_hash,
        c.checked_in_at,
        c.check_in_method,
        c.device_info,
        u.display_name,
        u.email
       FROM checkins c
       LEFT JOIN users u ON (
         c.user_wallet_hash = u.wallet_hash
         OR c.user_wallet_hash = 'email:' || u.email
       )
       WHERE c.event_id = ?
       ORDER BY c.checked_in_at DESC`
    )
      .bind(eventId)
      .all();

    return jsonResponse({
      event: {
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        location: event.location,
        capacity: event.capacity,
        eventType: event.event_type
      },
      checkins: checkins.map(c => ({
        id: c.id,
        userWalletHash: c.user_wallet_hash,
        username: c.display_name || 'Anonymous',
        email: c.email || null,
        checkedInAt: c.checked_in_at,
        checkInMethod: c.check_in_method,
        deviceInfo: c.device_info
      })),
      stats: {
        totalCheckIns: checkins.length,
        capacity: event.capacity,
        spotsRemaining: event.capacity ? event.capacity - checkins.length : null,
        percentageFilled: event.capacity ? Math.round((checkins.length / event.capacity) * 100) : null
      }
    });
  } catch (error) {
    console.error('Get check-ins error:', error);
    return jsonResponse({ error: 'Failed to fetch check-ins' }, 500);
  }
}

/**
 * DELETE /api/admin/checkins/{checkInId} - Remove a check-in (admin only)
 */
export async function onRequestDelete(context) {
  try {
    const url = new URL(context.request.url);
    const pathParts = url.pathname.split('/');
    const checkInId = pathParts[pathParts.length - 1];

    const { userWalletHash } = await context.request.json();

    // Verify admin access
    const isAdmin = await verifyAdmin(context, userWalletHash);
    if (!isAdmin) {
      return jsonResponse({
        error: 'Unauthorized: Admin access required'
      }, 403);
    }

    if (!checkInId) {
      return jsonResponse({
        error: 'Missing check-in ID'
      }, 400);
    }

    // Delete check-in
    const result = await context.env.DB.prepare(
      `DELETE FROM checkins WHERE id = ?`
    )
      .bind(checkInId)
      .run();

    if (result.meta.changes === 0) {
      return jsonResponse({
        error: 'Check-in not found'
      }, 404);
    }

    return jsonResponse({
      success: true,
      message: 'Check-in removed successfully'
    });
  } catch (error) {
    console.error('Delete check-in error:', error);
    return jsonResponse({ error: 'Failed to remove check-in' }, 500);
  }
}

/**
 * POST /api/admin/checkins/manual - Manually check in a user (admin only)
 */
export async function onRequestPost(context) {
  try {
    const { eventId, userWalletHash, adminWalletHash } = await context.request.json();

    // Verify admin access
    const isAdmin = await verifyAdmin(context, adminWalletHash);
    if (!isAdmin) {
      return jsonResponse({
        error: 'Unauthorized: Admin access required'
      }, 403);
    }

    if (!eventId || !userWalletHash) {
      return jsonResponse({
        error: 'Required fields: eventId, userWalletHash'
      }, 400);
    }

    // Verify event exists
    const event = await context.env.DB.prepare(
      `SELECT id, title FROM events WHERE id = ?`
    )
      .bind(eventId)
      .first();

    if (!event) {
      return jsonResponse({
        error: 'Event not found'
      }, 404);
    }

    // Check if user already checked in
    const existingCheckIn = await context.env.DB.prepare(
      `SELECT id FROM checkins WHERE event_id = ? AND user_wallet_hash = ?`
    )
      .bind(eventId, userWalletHash)
      .first();

    if (existingCheckIn) {
      return jsonResponse({
        error: 'User already checked in'
      }, 409);
    }

    // Create manual check-in
    const result = await context.env.DB.prepare(
      `INSERT INTO checkins (event_id, user_wallet_hash, check_in_method)
       VALUES (?, ?, 'manual')`
    )
      .bind(eventId, userWalletHash)
      .run();

    return jsonResponse({
      success: true,
      checkInId: result.meta.last_row_id,
      message: 'User checked in manually'
    }, 201);
  } catch (error) {
    console.error('Manual check-in error:', error);
    return jsonResponse({ error: 'Failed to check in user' }, 500);
  }
}
