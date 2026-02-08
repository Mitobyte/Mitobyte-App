/**
 * Cloudflare Pages Function: /api/events/[id]/feature
 * Toggle featured status for an event (admin only)
 */

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

/**
 * POST /api/events/[id]/feature
 * Toggle the featured status of an event
 */
export async function onRequestPost(context) {
    try {
        const eventId = context.params.id;

        if (!eventId) {
            return jsonResponse({ error: 'Event ID is required' }, 400);
        }

        // Get current featured status
        const event = await context.env.DB.prepare(
            'SELECT id, title, is_featured FROM events WHERE id = ?'
        ).bind(eventId).first();

        if (!event) {
            return jsonResponse({ error: 'Event not found' }, 404);
        }

        // Toggle the featured status
        const newFeaturedStatus = event.is_featured ? 0 : 1;

        await context.env.DB.prepare(
            'UPDATE events SET is_featured = ?, updated_at = datetime("now") WHERE id = ?'
        ).bind(newFeaturedStatus, eventId).run();

        return jsonResponse({
            success: true,
            eventId: Number(eventId),
            is_featured: newFeaturedStatus === 1,
            message: newFeaturedStatus ? 'Event is now featured' : 'Event removed from featured'
        });

    } catch (error) {
        console.error('Toggle featured error:', error);
        return jsonResponse({ error: 'Failed to toggle featured status' }, 500);
    }
}

/**
 * GET /api/events/[id]/feature
 * Get featured status of an event
 */
export async function onRequestGet(context) {
    try {
        const eventId = context.params.id;

        if (!eventId) {
            return jsonResponse({ error: 'Event ID is required' }, 400);
        }

        const event = await context.env.DB.prepare(
            'SELECT id, title, is_featured FROM events WHERE id = ?'
        ).bind(eventId).first();

        if (!event) {
            return jsonResponse({ error: 'Event not found' }, 404);
        }

        return jsonResponse({
            eventId: event.id,
            title: event.title,
            is_featured: Boolean(event.is_featured)
        });

    } catch (error) {
        console.error('Get featured status error:', error);
        return jsonResponse({ error: 'Failed to get featured status' }, 500);
    }
}
