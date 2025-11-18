/**
 * Cloudflare Pages Function: /api/admin/event-forms
 * Manage custom forms for event check-ins
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Verify admin access
 */
async function verifyAdmin(email, DB) {
  if (!email) {
    return false;
  }

  // Check if email starts with authorized admin domain
  if (email.startsWith('carl@craftthefuture.xyz')) {
    return true;
  }

  // Check if user has admin role in database
  const user = await DB.prepare(
    `SELECT is_admin FROM users WHERE email = ?`
  )
    .bind(email)
    .first();

  return user?.is_admin === 1;
}

/**
 * GET /api/admin/event-forms?eventId={id}&adminEmail={email} - Get form for an event
 */
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const adminEmail = url.searchParams.get('adminEmail');
    const eventId = url.searchParams.get('eventId');

    if (!adminEmail) {
      return jsonResponse({ error: 'Admin email required' }, 401);
    }

    // Verify admin
    const isAdmin = await verifyAdmin(adminEmail, context.env.DB);
    if (!isAdmin) {
      return jsonResponse({ error: 'Unauthorized: Admin access required' }, 403);
    }

    if (!eventId) {
      return jsonResponse({ error: 'eventId parameter required' }, 400);
    }

    // Get form for this event
    const form = await context.env.DB.prepare(
      `SELECT id, event_id, title, description, questions, created_at, updated_at
       FROM event_forms
       WHERE event_id = ?`
    )
      .bind(eventId)
      .first();

    if (!form) {
      return jsonResponse({
        success: true,
        form: null,
        message: 'No form exists for this event'
      });
    }

    return jsonResponse({
      success: true,
      form: {
        id: form.id,
        eventId: form.event_id,
        title: form.title,
        description: form.description,
        questions: JSON.parse(form.questions),
        createdAt: form.created_at,
        updatedAt: form.updated_at
      }
    });
  } catch (error) {
    console.error('Get event form error:', error);
    return jsonResponse({ error: 'Failed to fetch form' }, 500);
  }
}

/**
 * POST /api/admin/event-forms - Create or update form for an event
 */
export async function onRequestPost(context) {
  try {
    const {
      adminEmail,
      eventId,
      formTitle,
      formDescription,
      questions
    } = await context.request.json();

    if (!adminEmail) {
      return jsonResponse({ error: 'Admin email required' }, 401);
    }

    // Verify admin
    const isAdmin = await verifyAdmin(adminEmail, context.env.DB);
    if (!isAdmin) {
      return jsonResponse({ error: 'Unauthorized: Admin access required' }, 403);
    }

    if (!eventId || !formTitle) {
      return jsonResponse({ error: 'eventId and formTitle are required' }, 400);
    }

    // Verify event exists
    const event = await context.env.DB.prepare(
      `SELECT id FROM events WHERE id = ?`
    )
      .bind(eventId)
      .first();

    if (!event) {
      return jsonResponse({ error: 'Event not found' }, 404);
    }

    // Check if form already exists
    const existingForm = await context.env.DB.prepare(
      `SELECT id FROM event_forms WHERE event_id = ?`
    )
      .bind(eventId)
      .first();

    if (existingForm) {
      // Update existing form
      await context.env.DB.prepare(
        `UPDATE event_forms
         SET title = ?, description = ?, questions = ?, updated_at = datetime('now')
         WHERE event_id = ?`
      )
        .bind(
          formTitle,
          formDescription || null,
          JSON.stringify(questions || []),
          eventId
        )
        .run();

      return jsonResponse({
        success: true,
        message: 'Form updated successfully',
        formId: existingForm.id
      });
    } else {
      // Create new form
      const result = await context.env.DB.prepare(
        `INSERT INTO event_forms (event_id, title, description, questions)
         VALUES (?, ?, ?, ?)`
      )
        .bind(
          eventId,
          formTitle,
          formDescription || null,
          JSON.stringify(questions || [])
        )
        .run();

      return jsonResponse({
        success: true,
        message: 'Form created successfully',
        formId: result.meta.last_row_id
      }, 201);
    }
  } catch (error) {
    console.error('Save event form error:', error);
    return jsonResponse({ error: 'Failed to save form' }, 500);
  }
}

/**
 * DELETE /api/admin/event-forms?eventId={id}&adminEmail={email} - Delete form for an event
 */
export async function onRequestDelete(context) {
  try {
    const url = new URL(context.request.url);
    const adminEmail = url.searchParams.get('adminEmail');
    const eventId = url.searchParams.get('eventId');

    if (!adminEmail) {
      return jsonResponse({ error: 'Admin email required' }, 401);
    }

    // Verify admin
    const isAdmin = await verifyAdmin(adminEmail, context.env.DB);
    if (!isAdmin) {
      return jsonResponse({ error: 'Unauthorized: Admin access required' }, 403);
    }

    if (!eventId) {
      return jsonResponse({ error: 'eventId parameter required' }, 400);
    }

    // Delete the form
    await context.env.DB.prepare(
      `DELETE FROM event_forms WHERE event_id = ?`
    )
      .bind(eventId)
      .run();

    return jsonResponse({
      success: true,
      message: 'Form deleted successfully'
    });
  } catch (error) {
    console.error('Delete event form error:', error);
    return jsonResponse({ error: 'Failed to delete form' }, 500);
  }
}
