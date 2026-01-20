/**
 * Cloudflare Pages Function: /api/form-templates
 * Get all form templates for event creation
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * GET /api/form-templates - Get all form templates
 * Query params: ?type=check-in or ?type=feedback (optional)
 */
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const formType = url.searchParams.get('type'); // 'check-in' or 'feedback'

    let query = 'SELECT * FROM form_templates WHERE is_system = 1';
    const params = [];

    if (formType) {
      query += ' AND form_type = ?';
      params.push(formType);
    }

    query += ' ORDER BY id ASC';

    const stmt = params.length > 0
      ? context.env.DB.prepare(query).bind(...params)
      : context.env.DB.prepare(query);

    const { results } = await stmt.all();

    // Parse questions JSON for each template
    const templates = results.map(template => ({
      ...template,
      questions: JSON.parse(template.questions)
    }));

    return jsonResponse({ success: true, templates });
  } catch (error) {
    console.error('Get form templates error:', error);
    return jsonResponse({ error: 'Failed to fetch form templates' }, 500);
  }
}
