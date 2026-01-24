/**
 * Cloudflare Pages Function: /api/events/:id
 * Handles individual event operations (GET, DELETE)
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/events/:id - Get single event
 */
export async function onRequestGet(context) {
  try {
    const eventId = context.params.id;

    const { results } = await context.env.DB.prepare(
      'SELECT * FROM events WHERE id = ?'
    )
      .bind(eventId)
      .all();

    if (results.length === 0) {
      return jsonResponse({ error: 'Event not found' }, 404);
    }

    return jsonResponse({ event: results[0] });
  } catch (error) {
    console.error('Get event error:', error);
    return jsonResponse({ error: 'Failed to fetch event' }, 500);
  }
}

/**
 * PUT /api/events/:id - Update event
 * Supports updating single event or entire recurring series
 */
export async function onRequestPut(context) {
  try {
    const eventId = context.params.id;
    const {
      title,
      description,
      eventType,
      date,
      time,
      location,
      capacity,
      thumbnailUrl,
      isRecurring,
      recurringPattern,
      recurringEndDate,
      checkInFormId,
      feedbackFormId,
      externalUrl,
      updateSeries // New parameter: true = update all events in series
    } = await context.request.json();

    // Check if event exists
    const { results } = await context.env.DB.prepare(
      'SELECT * FROM events WHERE id = ?'
    )
      .bind(eventId)
      .all();

    if (results.length === 0) {
      return jsonResponse({ error: 'Event not found' }, 404);
    }

    const currentEvent = results[0];

    // Validate event type if provided
    if (eventType) {
      const validEventTypes = ['code_and_coffee', 'code_and_brews', 'hackathon', 'workshop', 'meetup'];
      if (!validEventTypes.includes(eventType)) {
        return jsonResponse({
          error: `Invalid event type. Must be one of: ${validEventTypes.join(', ')}`
        }, 400);
      }
    }

    // Validate recurring fields if provided
    if (isRecurring !== undefined) {
      if (isRecurring) {
        const validPatterns = ['weekly', 'biweekly', 'monthly'];
        if (recurringPattern && !validPatterns.includes(recurringPattern)) {
          return jsonResponse({
            error: `Recurring events must have a valid pattern: ${validPatterns.join(', ')}`
          }, 400);
        }
        if (!recurringEndDate) {
          return jsonResponse({
            error: 'Recurring events must have an end date'
          }, 400);
        }
      }
    }

    // Build dynamic update query
    const updates = [];
    const bindings = [];

    // Note: Date updates are excluded when updating series (each instance has its own date)
    const excludeDateForSeries = updateSeries && (currentEvent.parent_event_id || currentEvent.is_recurring);

    if (title !== undefined) { updates.push('title = ?'); bindings.push(title); }
    if (description !== undefined) { updates.push('description = ?'); bindings.push(description); }
    if (eventType !== undefined) { updates.push('event_type = ?'); bindings.push(eventType); }
    if (date !== undefined && !excludeDateForSeries) { updates.push('date = ?'); bindings.push(date); }
    if (time !== undefined) { updates.push('time = ?'); bindings.push(time); }
    if (location !== undefined) { updates.push('location = ?'); bindings.push(location); }
    if (capacity !== undefined) { updates.push('capacity = ?'); bindings.push(capacity); }
    if (thumbnailUrl !== undefined) { updates.push('thumbnail_url = ?'); bindings.push(thumbnailUrl); }
    if (isRecurring !== undefined) { updates.push('is_recurring = ?'); bindings.push(isRecurring ? 1 : 0); }
    if (recurringPattern !== undefined) { updates.push('recurring_pattern = ?'); bindings.push(isRecurring ? recurringPattern : null); }
    if (recurringEndDate !== undefined) { updates.push('recurring_end_date = ?'); bindings.push(isRecurring ? recurringEndDate : null); }
    if (checkInFormId !== undefined) { updates.push('check_in_form_id = ?'); bindings.push(checkInFormId || null); }
    if (feedbackFormId !== undefined) { updates.push('feedback_form_id = ?'); bindings.push(feedbackFormId || null); }

    updates.push('updated_at = datetime("now")');

    // Determine which events to update
    let eventIds = [eventId];

    if (updateSeries) {
      // Find the parent event ID (either this event if it's the parent, or the parent_event_id)
      const parentId = currentEvent.parent_event_id || currentEvent.id;

      // Get all events in the series (parent + all children)
      const { results: seriesEvents } = await context.env.DB.prepare(
        'SELECT id FROM events WHERE id = ? OR parent_event_id = ?'
      )
        .bind(parentId, parentId)
        .all();

      eventIds = seriesEvents.map(e => e.id);
    }

    // Update all targeted events
    for (const targetId of eventIds) {
      const eventBindings = [...bindings, targetId];
      await context.env.DB.prepare(
        `UPDATE events SET ${updates.join(', ')} WHERE id = ?`
      )
        .bind(...eventBindings)
        .run();
    }

    // Get updated event(s)
    const { results: updatedResults } = await context.env.DB.prepare(
      'SELECT * FROM events WHERE id = ?'
    )
      .bind(eventId)
      .all();

    return jsonResponse({
      success: true,
      event: updatedResults[0],
      updatedCount: eventIds.length,
      message: updateSeries ? `Updated ${eventIds.length} events in series` : 'Event updated'
    });
  } catch (error) {
    console.error('Update event error:', error);
    return jsonResponse({ error: 'Failed to update event' }, 500);
  }
}

/**
 * DELETE /api/events/:id - Delete event and associated RSVPs
 * Supports deleting single event or entire recurring series
 * Query param: ?delete_series=true to delete all events in series
 */
export async function onRequestDelete(context) {
  try {
    const eventId = context.params.id;
    const url = new URL(context.request.url);
    const deleteSeries = url.searchParams.get('delete_series') === 'true';

    // Check if event exists
    const { results } = await context.env.DB.prepare(
      'SELECT * FROM events WHERE id = ?'
    )
      .bind(eventId)
      .all();

    if (results.length === 0) {
      return jsonResponse({ error: 'Event not found' }, 404);
    }

    const currentEvent = results[0];

    // START: Blacklist external URL if present
    if (currentEvent.external_url) {
      try {
        await context.env.DB.prepare(
          'INSERT OR IGNORE INTO deleted_external_events (external_url) VALUES (?)'
        )
          .bind(currentEvent.external_url)
          .run();
        console.log(`Added ${currentEvent.external_url} to deleted events blacklist`);
      } catch (e) {
        console.error("Failed to blacklist external URL", e);
      }
    }
    // END: Blacklist external URL

    let deletedCount = 0;

    if (deleteSeries) {
      // Find the parent event ID (either this event if it's the parent, or the parent_event_id)
      const parentId = currentEvent.parent_event_id || currentEvent.id;

      // Get all events in the series (parent + all children)
      const { results: seriesEvents } = await context.env.DB.prepare(
        'SELECT id, external_url FROM events WHERE id = ? OR parent_event_id = ?'
      )
        .bind(parentId, parentId)
        .all();

      // Delete all events in the series
      // CASCADE DELETE will handle all related records for each event
      for (const event of seriesEvents) {
        // Also blacklist any series instances if they have different external URLs (unlikely but safe)
        if (event.external_url) {
          await context.env.DB.prepare('INSERT OR IGNORE INTO deleted_external_events (external_url) VALUES (?)')
            .bind(event.external_url).run().catch(() => { });
        }

        await context.env.DB.prepare(
          'DELETE FROM events WHERE id = ?'
        )
          .bind(event.id)
          .run();
        deletedCount++;
      }

      return jsonResponse({
        success: true,
        message: `Deleted ${deletedCount} events in series`,
        deletedCount
      });
    } else {
      // Delete single event
      const result = await context.env.DB.prepare(
        'DELETE FROM events WHERE id = ?'
      )
        .bind(eventId)
        .run();

      if (result.meta.changes === 0) {
        return jsonResponse({
          success: false,
          error: 'Event not found or already deleted'
        }, 404);
      }

      return jsonResponse({
        success: true,
        message: 'Event and associated data deleted successfully',
        deletedCount: 1
      });
    }
  } catch (error) {
    console.error('Delete event error:', error);
    return jsonResponse({ error: 'Failed to delete event' }, 500);
  }
}
