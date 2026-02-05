/**
 * Cloudflare Pages Function: /api/public-checkin
 * Handles public check-in for events (no authentication required)
 * Stores guest info (name, email) instead of wallet address
 */

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

/**
 * POST /api/public-checkin - Check in to an event as a guest (no auth required)
 * Body: {
 *   eventId: number,
 *   guestName: string,
 *   guestEmail: string,
 *   deviceInfo?: string,
 *   formResponses?: string (JSON),
 *   formId?: number
 * }
 */
export async function onRequestPost(context) {
    try {
        const {
            eventId,
            guestName,
            guestEmail,
            deviceInfo,
            formResponses,
            formId
        } = await context.request.json();

        // Validate required fields
        if (!eventId || !guestName || !guestEmail) {
            return jsonResponse({
                error: 'Required fields: eventId, guestName, guestEmail'
            }, 400);
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(guestEmail)) {
            return jsonResponse({
                error: 'Invalid email format'
            }, 400);
        }

        // Verify event exists
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

        // Create a unique identifier for the guest based on email
        // This helps prevent duplicate check-ins from the same email
        const guestIdentifier = `guest:${guestEmail.toLowerCase()}`;

        // Check if this guest already checked in
        const existingCheckIn = await context.env.DB.prepare(
            `SELECT id FROM checkins WHERE event_id = ? AND user_wallet_hash = ?`
        )
            .bind(event.id, guestIdentifier)
            .first();

        if (existingCheckIn) {
            return jsonResponse({
                error: 'You have already checked in to this event with this email',
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

        // Create check-in record for guest
        const result = await context.env.DB.prepare(
            `INSERT INTO checkins (
        event_id, user_wallet_hash, check_in_method, device_info,
        guest_name, guest_email
      )
       VALUES (?, ?, 'manual', ?, ?, ?)`
        )
            .bind(
                event.id,
                guestIdentifier,
                deviceInfo || null,
                guestName.trim(),
                guestEmail.trim().toLowerCase()
            )
            .run();

        const checkInId = result.meta.last_row_id;

        // Save custom form responses if present
        if (formResponses && formId) {
            try {
                await context.env.DB.prepare(
                    `INSERT INTO form_responses (check_in_id, form_id, responses, created_at)
           VALUES (?, ?, ?, datetime('now'))`
                )
                    .bind(checkInId, formId, formResponses)
                    .run();
            } catch (formError) {
                console.error('Error saving form responses:', formError);
                // Don't fail the entire check-in if form response saving fails
            }
        }

        // Log successful check-in
        console.log(`✅ Public check-in successful: ${guestName} (${guestEmail}) -> Event: ${event.title}`);

        return jsonResponse({
            success: true,
            checkInId: checkInId,
            event: {
                id: event.id,
                title: event.title,
                date: event.date,
                time: event.time,
                location: event.location
            },
            message: `Successfully checked in to ${event.title}`
        }, 201);

    } catch (error) {
        console.error('Public check-in error:', error);
        return jsonResponse({
            error: 'Failed to process check-in',
            details: error.message,
            stack: error.stack
        }, 500);
    }
}

/**
 * GET /api/public-checkin?eventId={id} - Get public check-in stats for an event
 */
export async function onRequestGet(context) {
    try {
        const url = new URL(context.request.url);
        const eventId = url.searchParams.get('eventId');

        if (!eventId) {
            return jsonResponse({
                error: 'Missing eventId parameter'
            }, 400);
        }

        // Get event details
        const event = await context.env.DB.prepare(
            `SELECT id, title, description, event_type, date, time, location, capacity
       FROM events WHERE id = ?`
        )
            .bind(eventId)
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

        // Get public check-in count specifically
        const publicResult = await context.env.DB.prepare(
            `SELECT COUNT(*) as count FROM checkins WHERE event_id = ? AND guest_email IS NOT NULL`
        )
            .bind(event.id)
            .first();

        return jsonResponse({
            event: {
                ...event,
                checkInCount: count,
                publicCheckInCount: publicResult.count,
                spotsRemaining: event.capacity ? event.capacity - count : null
            }
        });

    } catch (error) {
        console.error('Get public check-in stats error:', error);
        return jsonResponse({ error: 'Failed to fetch event details' }, 500);
    }
}
