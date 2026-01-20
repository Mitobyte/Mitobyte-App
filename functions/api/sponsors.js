// Sponsor management API
import { isAdmin } from '../utils/adminAuth.js'

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}

// GET - List active sponsors
export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url)
    const includeInactive = url.searchParams.get('includeInactive') === 'true'

    let query = `
      SELECT * FROM sponsors
      WHERE 1=1
    `

    const params = []

    // Filter active sponsors unless explicitly requesting all
    if (!includeInactive) {
      query += ` AND is_active = 1`

      // Check date ranges
      query += ` AND (start_date IS NULL OR start_date <= datetime('now'))`
      query += ` AND (end_date IS NULL OR end_date >= datetime('now'))`
    }

    query += ` ORDER BY priority DESC, created_at ASC`

    const { results } = await context.env.DB.prepare(query).all()

    return jsonResponse({
      success: true,
      sponsors: results
    })
  } catch (error) {
    console.error('Error fetching sponsors:', error)
    return jsonResponse({
      error: 'Failed to fetch sponsors',
      details: error.message
    }, 500)
  }
}

// POST - Create new sponsor (admin only)
export async function onRequestPost(context) {
  try {
    const { adminEmail, name, logoUrl, websiteUrl, priority, startDate, endDate } = await context.request.json()

    // Verify admin access
    const isAdminUser = await isAdmin(adminEmail, context.env.DB)
    if (!isAdminUser) {
      return jsonResponse({ error: 'Unauthorized. Admin access required.' }, 403)
    }

    // Validate required fields
    if (!name || !logoUrl) {
      return jsonResponse({ error: 'Name and logo URL are required' }, 400)
    }

    // Insert new sponsor
    const result = await context.env.DB.prepare(
      `INSERT INTO sponsors (name, logo_url, website_url, priority, start_date, end_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      name,
      logoUrl,
      websiteUrl || null,
      priority || 0,
      startDate || null,
      endDate || null,
      adminEmail
    ).run()

    // Fetch the created sponsor
    const { results } = await context.env.DB.prepare(
      'SELECT * FROM sponsors WHERE id = ?'
    ).bind(result.meta.last_row_id).all()

    return jsonResponse({
      success: true,
      sponsor: results[0]
    }, 201)
  } catch (error) {
    console.error('Error creating sponsor:', error)
    return jsonResponse({
      error: 'Failed to create sponsor',
      details: error.message,
      hint: 'Make sure the database migration has been run to create the sponsors table'
    }, 500)
  }
}

// OPTIONS - CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
