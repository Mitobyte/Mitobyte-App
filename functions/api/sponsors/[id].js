// Individual sponsor management API
import { isAdmin } from '../../utils/adminAuth.js'

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}

// GET - Get single sponsor
export async function onRequestGet(context) {
  try {
    const sponsorId = context.params.id

    const { results } = await context.env.DB.prepare(
      'SELECT * FROM sponsors WHERE id = ?'
    ).bind(sponsorId).all()

    if (results.length === 0) {
      return jsonResponse({ error: 'Sponsor not found' }, 404)
    }

    return jsonResponse({
      success: true,
      sponsor: results[0]
    })
  } catch (error) {
    console.error('Error fetching sponsor:', error)
    return jsonResponse({
      error: 'Failed to fetch sponsor',
      details: error.message
    }, 500)
  }
}

// PATCH - Update sponsor (admin only)
export async function onRequestPatch(context) {
  try {
    const sponsorId = context.params.id
    const { adminEmail, name, logoUrl, websiteUrl, priority, isActive, startDate, endDate } = await context.request.json()

    // Verify admin access
    const isAdminUser = await isAdmin(adminEmail, context.env.DB)
    if (!isAdminUser) {
      return jsonResponse({ error: 'Unauthorized. Admin access required.' }, 403)
    }

    // Check if sponsor exists
    const { results: existing } = await context.env.DB.prepare(
      'SELECT * FROM sponsors WHERE id = ?'
    ).bind(sponsorId).all()

    if (existing.length === 0) {
      return jsonResponse({ error: 'Sponsor not found' }, 404)
    }

    // Build update query dynamically based on provided fields
    const updates = []
    const params = []

    if (name !== undefined) {
      updates.push('name = ?')
      params.push(name)
    }
    if (logoUrl !== undefined) {
      updates.push('logo_url = ?')
      params.push(logoUrl)
    }
    if (websiteUrl !== undefined) {
      updates.push('website_url = ?')
      params.push(websiteUrl)
    }
    if (priority !== undefined) {
      updates.push('priority = ?')
      params.push(priority)
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?')
      params.push(isActive ? 1 : 0)
    }
    if (startDate !== undefined) {
      updates.push('start_date = ?')
      params.push(startDate)
    }
    if (endDate !== undefined) {
      updates.push('end_date = ?')
      params.push(endDate)
    }

    if (updates.length === 0) {
      return jsonResponse({ error: 'No fields to update' }, 400)
    }

    params.push(sponsorId)

    await context.env.DB.prepare(
      `UPDATE sponsors SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...params).run()

    // Fetch updated sponsor
    const { results } = await context.env.DB.prepare(
      'SELECT * FROM sponsors WHERE id = ?'
    ).bind(sponsorId).all()

    return jsonResponse({
      success: true,
      sponsor: results[0]
    })
  } catch (error) {
    console.error('Error updating sponsor:', error)
    return jsonResponse({
      error: 'Failed to update sponsor',
      details: error.message
    }, 500)
  }
}

// DELETE - Delete sponsor (admin only)
export async function onRequestDelete(context) {
  try {
    const sponsorId = context.params.id
    const { adminEmail } = await context.request.json()

    // Verify admin access
    const isAdminUser = await isAdmin(adminEmail, context.env.DB)
    if (!isAdminUser) {
      return jsonResponse({ error: 'Unauthorized. Admin access required.' }, 403)
    }

    // Check if sponsor exists
    const { results: existing } = await context.env.DB.prepare(
      'SELECT * FROM sponsors WHERE id = ?'
    ).bind(sponsorId).all()

    if (existing.length === 0) {
      return jsonResponse({ error: 'Sponsor not found' }, 404)
    }

    await context.env.DB.prepare(
      'DELETE FROM sponsors WHERE id = ?'
    ).bind(sponsorId).run()

    return jsonResponse({
      success: true,
      message: 'Sponsor deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting sponsor:', error)
    return jsonResponse({
      error: 'Failed to delete sponsor',
      details: error.message
    }, 500)
  }
}

// OPTIONS - CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
