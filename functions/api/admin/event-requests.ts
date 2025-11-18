/**
 * Admin API endpoint for managing event requests
 * GET - Get all event requests with optional status filter
 */

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    // Get admin email from Authorization header
    const authHeader = context.request.headers.get('Authorization');
    const adminEmail = authHeader?.replace('Bearer ', '');

    // Validate admin access
    if (!adminEmail || !adminEmail.startsWith('carl@craftthefuture.xyz')) {
      return new Response(JSON.stringify({
        error: 'Admin access required'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get status filter from query params
    const url = new URL(context.request.url);
    const statusFilter = url.searchParams.get('status');

    let query = `
      SELECT *
      FROM event_requests
    `;

    const params: any[] = [];

    // Add status filter if provided
    if (statusFilter && statusFilter !== 'all') {
      query += ` WHERE status = ?`;
      params.push(statusFilter);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await context.env.DB.prepare(query).bind(...params).all();

    return new Response(JSON.stringify({
      requests: result.results || [],
      count: result.results?.length || 0
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching event requests:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch event requests'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
