/**
 * Cloudflare Pages Function: /api/form-templates/:id
 * Get a single form template by ID
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/form-templates/:id - Get single form template
 */
export async function onRequestGet(context) {
  try {
    const templateId = context.params.id;

    const { results } = await context.env.DB.prepare(
      'SELECT * FROM form_templates WHERE id = ?'
    )
      .bind(templateId)
      .all();

    if (results.length === 0) {
      return jsonResponse({ error: 'Form template not found' }, 404);
    }

    const template = {
      ...results[0],
      questions: JSON.parse(results[0].questions)
    };

    return jsonResponse({ success: true, template });
  } catch (error) {
    console.error('Get form template error:', error);
    return jsonResponse({ error: 'Failed to fetch form template' }, 500);
  }
}
