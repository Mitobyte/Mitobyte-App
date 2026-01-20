/**
 * Cloudflare Pages Function: /api/form-templates-manager/:id
 * Update/Delete specific form template (admin only)
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function verifyAdmin(context, adminEmail) {
  if (!adminEmail) {
    return false;
  }

  try {
    const { results } = await context.env.DB.prepare(
      'SELECT role FROM users WHERE email = ?'
    )
      .bind(adminEmail)
      .all();

    return results.length > 0 && (results[0].role === 'admin' || results[0].role === 'host');
  } catch (error) {
    console.error('Admin verification error:', error);
    return false;
  }
}

/**
 * PUT /api/form-templates-manager/:id - Update custom template
 */
export async function onRequestPut(context) {
  try {
    const templateId = context.params.id;
    const {
      adminEmail,
      name,
      formType,
      title,
      description,
      questions
    } = await context.request.json();

    // Verify admin
    const isAdmin = await verifyAdmin(context, adminEmail);
    if (!isAdmin) {
      return jsonResponse({ error: 'Unauthorized. Admin access required.' }, 403);
    }

    // Check if template exists and is not a system template
    const { results } = await context.env.DB.prepare(
      'SELECT * FROM form_templates WHERE id = ?'
    )
      .bind(templateId)
      .all();

    if (results.length === 0) {
      return jsonResponse({ error: 'Template not found' }, 404);
    }

    if (results[0].is_system === 1) {
      return jsonResponse({ error: 'System templates cannot be modified' }, 403);
    }

    // Validate required fields
    if (!name || !formType || !title || !questions || questions.length === 0) {
      return jsonResponse({
        error: 'Missing required fields: name, formType, title, and questions are required'
      }, 400);
    }

    // Validate form type
    if (!['check-in', 'feedback'].includes(formType)) {
      return jsonResponse({
        error: 'Invalid form type. Must be "check-in" or "feedback"'
      }, 400);
    }

    // Update template
    const result = await context.env.DB.prepare(
      `UPDATE form_templates
       SET name = ?, form_type = ?, title = ?, description = ?, questions = ?
       WHERE id = ?`
    )
      .bind(
        name,
        formType,
        title,
        description || null,
        JSON.stringify(questions),
        templateId
      )
      .run();

    if (!result.success) {
      throw new Error('Failed to update template');
    }

    return jsonResponse({
      success: true,
      message: 'Template updated successfully'
    });
  } catch (error) {
    console.error('Update template error:', error);
    return jsonResponse({ error: error.message || 'Failed to update template' }, 500);
  }
}

/**
 * DELETE /api/form-templates-manager/:id - Delete custom template
 */
export async function onRequestDelete(context) {
  try {
    const templateId = context.params.id;
    const { adminEmail } = await context.request.json();

    // Verify admin
    const isAdmin = await verifyAdmin(context, adminEmail);
    if (!isAdmin) {
      return jsonResponse({ error: 'Unauthorized. Admin access required.' }, 403);
    }

    // Check if template exists and is not a system template
    const { results } = await context.env.DB.prepare(
      'SELECT * FROM form_templates WHERE id = ?'
    )
      .bind(templateId)
      .all();

    if (results.length === 0) {
      return jsonResponse({ error: 'Template not found' }, 404);
    }

    if (results[0].is_system === 1) {
      return jsonResponse({ error: 'System templates cannot be deleted' }, 403);
    }

    // Check if template is being used by any events
    const { results: eventsUsingTemplate } = await context.env.DB.prepare(
      'SELECT COUNT(*) as count FROM events WHERE check_in_form_id = ? OR feedback_form_id = ?'
    )
      .bind(templateId, templateId)
      .all();

    if (eventsUsingTemplate[0].count > 0) {
      return jsonResponse({
        error: `This template is being used by ${eventsUsingTemplate[0].count} event(s) and cannot be deleted. Please remove it from those events first.`
      }, 400);
    }

    // Delete template
    const result = await context.env.DB.prepare(
      'DELETE FROM form_templates WHERE id = ?'
    )
      .bind(templateId)
      .run();

    if (!result.success) {
      throw new Error('Failed to delete template');
    }

    return jsonResponse({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Delete template error:', error);
    return jsonResponse({ error: error.message || 'Failed to delete template' }, 500);
  }
}
