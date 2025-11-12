/**
 * Cloudflare Pages Function: /api/events
 * Handles event creation and retrieval with QR code check-in support
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Generate a unique check-in code for an event
 * Format: EVT-{eventId}-{randomString}
 */
function generateCheckInCode(eventId) {
  const randomPart = Math.random().toString(36).substring(2, 15) +
                     Math.random().toString(36).substring(2, 15);
  return `EVT-${eventId}-${randomPart}`;
}

/**
 * Calculate next occurrence date based on pattern
 */
function getNextOccurrence(dateStr, pattern) {
  const date = new Date(dateStr);
  switch (pattern) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
  }
  return date.toISOString().split('T')[0];
}

/**
 * POST /api/events - Create new event
 */
export async function onRequestPost(context) {
  try {
    const {
      title,
      description,
      eventType,
      date,
      time,
      location,
      capacity,
      createdBy,
      isRecurring,
      recurringPattern,
      recurringEndDate,
      thumbnailUrl,
      checkInFormId,
      feedbackFormId
    } = await context.request.json();

    // Validate required fields
    if (!title || !description || !eventType || !date || !time || !location) {
      return jsonResponse({
        error: 'Required fields: title, description, eventType, date, time, location'
      }, 400);
    }

    // Validate event type
    const validEventTypes = ['code_and_coffee', 'code_and_brews', 'hackathon', 'workshop', 'meetup'];
    if (!validEventTypes.includes(eventType)) {
      return jsonResponse({
        error: `Invalid event type. Must be one of: ${validEventTypes.join(', ')}`
      }, 400);
    }

    // Validate recurring fields
    if (isRecurring) {
      const validPatterns = ['weekly', 'biweekly', 'monthly'];
      if (!recurringPattern || !validPatterns.includes(recurringPattern)) {
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

    // Insert main event (without check_in_code initially)
    const result = await context.env.DB.prepare(
      `INSERT INTO events (
        title, description, event_type, date, time, location, capacity, created_by,
        is_recurring, recurring_pattern, recurring_end_date, thumbnail_url,
        check_in_form_id, feedback_form_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        title,
        description,
        eventType,
        date,
        time,
        location,
        capacity || null,
        createdBy || null,
        isRecurring ? 1 : 0,
        isRecurring ? recurringPattern : null,
        isRecurring ? recurringEndDate : null,
        thumbnailUrl || null,
        checkInFormId || null,
        feedbackFormId || null
      )
      .run();

    const parentEventId = result.meta.last_row_id;

    // Generate and update check-in code for the event
    const checkInCode = generateCheckInCode(parentEventId);
    await context.env.DB.prepare(
      `UPDATE events SET check_in_code = ? WHERE id = ?`
    )
      .bind(checkInCode, parentEventId)
      .run();

    // Create recurring instances if needed
    if (isRecurring) {
      let currentDate = date;
      const endDate = new Date(recurringEndDate);
      const instances = [];

      while (true) {
        currentDate = getNextOccurrence(currentDate, recurringPattern);
        const nextDate = new Date(currentDate);

        if (nextDate > endDate) break;

        const instanceResult = await context.env.DB.prepare(
          `INSERT INTO events (
            title, description, event_type, date, time, location, capacity, created_by,
            is_recurring, recurring_pattern, recurring_end_date, parent_event_id, thumbnail_url,
            check_in_form_id, feedback_form_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            title,
            description,
            eventType,
            currentDate,
            time,
            location,
            capacity || null,
            createdBy || null,
            0, // Instance is not itself recurring
            null,
            null,
            parentEventId,
            thumbnailUrl || null,
            checkInFormId || null,
            feedbackFormId || null
          )
          .run();

        // Generate check-in code for recurring instance
        const instanceId = instanceResult.meta.last_row_id;
        const instanceCheckInCode = generateCheckInCode(instanceId);
        await context.env.DB.prepare(
          `UPDATE events SET check_in_code = ? WHERE id = ?`
        )
          .bind(instanceCheckInCode, instanceId)
          .run();

        instances.push(currentDate);
      }
    }

    return jsonResponse(
      {
        id: parentEventId,
        title,
        description,
        eventType,
        date,
        time,
        location,
        capacity,
        createdBy,
        isRecurring,
        recurringPattern,
        recurringEndDate,
        thumbnailUrl,
        checkInCode,
        createdAt: new Date().toISOString(),
      },
      201
    );
  } catch (error) {
    console.error('Create event error:', error);
    return jsonResponse({ error: 'Failed to create event' }, 500);
  }
}

/**
 * GET /api/events - Get all events
 */
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const eventType = url.searchParams.get('type');
    const upcoming = url.searchParams.get('upcoming');
    const parentsOnly = url.searchParams.get('parents_only'); // Optional: filter to show only parent events

    let query = 'SELECT * FROM events';
    const conditions = [];
    const bindings = [];

    // Optionally filter to show only parent events (not recurring instances)
    // This allows management views to group events, while calendar shows all instances
    if (parentsOnly === 'true') {
      conditions.push('parent_event_id IS NULL');
    }

    // Filter by event type if provided
    if (eventType) {
      conditions.push('event_type = ?');
      bindings.push(eventType);
    }

    // Filter upcoming events (today and future)
    if (upcoming === 'true') {
      conditions.push('date >= date("now")');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY date ASC, time ASC';

    const stmt = context.env.DB.prepare(query);
    const { results } = await (bindings.length > 0
      ? stmt.bind(...bindings).all()
      : stmt.all());

    return jsonResponse({
      events: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Get events error:', error);
    return jsonResponse({ error: 'Failed to fetch events' }, 500);
  }
}
