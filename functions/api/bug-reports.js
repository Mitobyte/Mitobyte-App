/**
 * Bug Reports API Endpoint
 * Handles bug report submissions and retrieval for admin panel
 */

import { createHash } from 'crypto'

/**
 * Hash wallet address for security
 */
function hashWallet(walletAddress) {
  if (!walletAddress) return null
  return createHash('sha256').update(walletAddress).digest('hex')
}

/**
 * Get user ID from wallet hash
 */
async function getUserId(env, walletHash) {
  if (!walletHash) return null

  const result = await env.DB.prepare(
    `SELECT id FROM users WHERE wallet_hash = ?`
  ).bind(walletHash).first()

  return result?.id || null
}

/**
 * Submit a new bug report
 */
async function createBugReport(env, data) {
  const { walletAddress, title, description, pageUrl, browserInfo, screenshot } = data

  // Validate required fields
  if (!title || !description) {
    return {
      success: false,
      error: 'Title and description are required'
    }
  }

  const walletHash = walletAddress ? hashWallet(walletAddress) : null
  const userId = await getUserId(env, walletHash)

  // Insert bug report (screenshot is stored as base64 string)
  const result = await env.DB.prepare(`
    INSERT INTO bug_reports (
      user_id, user_wallet_hash, title, description,
      page_url, browser_info, screenshot_url, status, priority
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', 'medium')
  `).bind(
    userId,
    walletHash,
    title,
    description,
    pageUrl || null,
    browserInfo || null,
    screenshot || null  // Base64 image string
  ).run()

  if (!result.success) {
    throw new Error('Failed to create bug report')
  }

  return {
    success: true,
    bugReportId: result.meta.last_row_id,
    message: 'Bug report submitted successfully'
  }
}

/**
 * Get all bug reports (admin only)
 */
async function getAllBugReports(env, adminEmail) {
  // Check if user is admin
  if (!adminEmail?.startsWith('carl@craftthefuture.xyz')) {
    return {
      success: false,
      error: 'Unauthorized: Admin access required'
    }
  }

  const bugReports = await env.DB.prepare(`
    SELECT
      br.*,
      u.email as user_email,
      u.display_name as user_name
    FROM bug_reports br
    LEFT JOIN users u ON br.user_id = u.id
    ORDER BY
      CASE br.status
        WHEN 'open' THEN 1
        WHEN 'in_progress' THEN 2
        WHEN 'resolved' THEN 3
        WHEN 'closed' THEN 4
        WHEN 'wont_fix' THEN 5
      END,
      CASE br.priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
      END,
      br.created_at DESC
  `).all()

  return {
    success: true,
    bugReports: bugReports.results || [],
    stats: {
      total: bugReports.results?.length || 0,
      open: bugReports.results?.filter(r => r.status === 'open').length || 0,
      inProgress: bugReports.results?.filter(r => r.status === 'in_progress').length || 0,
      resolved: bugReports.results?.filter(r => r.status === 'resolved').length || 0
    }
  }
}

/**
 * Update bug report status (admin only)
 */
async function updateBugReportStatus(env, bugReportId, data, adminEmail) {
  // Check if user is admin
  if (!adminEmail?.startsWith('carl@craftthefuture.xyz')) {
    return {
      success: false,
      error: 'Unauthorized: Admin access required'
    }
  }

  const { status, priority, adminNotes } = data

  let updateFields = []
  let updateValues = []

  if (status) {
    updateFields.push('status = ?')
    updateValues.push(status)
  }

  if (priority) {
    updateFields.push('priority = ?')
    updateValues.push(priority)
  }

  if (adminNotes !== undefined) {
    updateFields.push('admin_notes = ?')
    updateValues.push(adminNotes)
  }

  if (status === 'resolved' || status === 'closed') {
    updateFields.push('resolved_at = datetime("now")')
    updateFields.push('resolved_by = ?')
    updateValues.push(adminEmail)
  }

  updateFields.push('updated_at = datetime("now")')
  updateValues.push(bugReportId)

  const query = `
    UPDATE bug_reports
    SET ${updateFields.join(', ')}
    WHERE id = ?
  `

  const result = await env.DB.prepare(query).bind(...updateValues).run()

  if (!result.success) {
    throw new Error('Failed to update bug report')
  }

  return {
    success: true,
    message: 'Bug report updated successfully'
  }
}

/**
 * Main handler
 */
export async function onRequest(context) {
  const { request, env } = context

  // Enable CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(request.url)

    // GET - Retrieve all bug reports (admin only)
    if (request.method === 'GET') {
      const adminEmail = url.searchParams.get('adminEmail')
      const result = await getAllBugReports(env, adminEmail)

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 403
      })
    }

    // POST - Create new bug report
    if (request.method === 'POST') {
      const data = await request.json()
      const result = await createBugReport(env, data)

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 201 : 400
      })
    }

    // PUT - Update bug report status (admin only)
    if (request.method === 'PUT') {
      const data = await request.json()
      const { bugReportId, adminEmail, ...updateData } = data

      if (!bugReportId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Bug report ID is required'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        })
      }

      const result = await updateBugReportStatus(env, bugReportId, updateData, adminEmail)

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 403
      })
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    })

  } catch (error) {
    console.error('Bug reports API error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
}
