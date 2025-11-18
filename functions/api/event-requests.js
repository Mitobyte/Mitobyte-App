/**
 * Event Requests API
 * Allow users to request events for admin approval
 */

import { requireAdmin } from '../utils/adminAuth.js'

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status') || 'pending'

    // Verify admin authorization using JWT
    if (!env.JWT_SECRET) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let adminUser
    try {
      adminUser = await requireAdmin(request, env.JWT_SECRET)
    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { results } = await env.DB.prepare(
      `SELECT * FROM event_requests
       WHERE status = ?
       ORDER BY created_at DESC`
    ).bind(status).all()

    return new Response(
      JSON.stringify({ success: true, requests: results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching event requests:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json()
    const { action } = body

    // Submit new event request (public endpoint)
    if (action === 'submit') {
      const { title, description, date, time, location, category, maxAttendees, walletAddress, requesterName } = body

      // Validation
      if (!title || !description || !date || !time || !walletAddress) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing required fields' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Insert event request
      const result = await env.DB.prepare(
        `INSERT INTO event_requests (title, description, date, time, location, category, max_attendees, requested_by, requester_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        title,
        description,
        date,
        time,
        location || null,
        category || 'Community',
        maxAttendees || null,
        walletAddress,
        requesterName || null
      ).run()

      console.log(`[Event Request] Submitted by ${walletAddress}: ${title}`)

      return new Response(
        JSON.stringify({ success: true, message: 'Event request submitted successfully', requestId: result.meta.last_row_id }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Admin actions require JWT authorization
    if (!env.JWT_SECRET) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let adminUser
    try {
      adminUser = await requireAdmin(request, env.JWT_SECRET)
    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Approve event request
    if (action === 'approve') {
      const { requestId } = body

      // Get the request details
      const requestData = await env.DB.prepare(
        'SELECT * FROM event_requests WHERE id = ?'
      ).bind(requestId).first()

      if (!requestData) {
        return new Response(
          JSON.stringify({ success: false, error: 'Request not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Create the event
      const eventResult = await env.DB.prepare(
        `INSERT INTO events (title, description, date, time, location, category, max_attendees, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        requestData.title,
        requestData.description,
        requestData.date,
        requestData.time,
        requestData.location,
        requestData.category,
        requestData.max_attendees,
        adminUser.email
      ).run()

      const eventId = eventResult.meta.last_row_id

      // Update request status
      await env.DB.prepare(
        `UPDATE event_requests
         SET status = 'approved', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, created_event_id = ?
         WHERE id = ?`
      ).bind(adminUser.email, eventId, requestId).run()

      console.log(`[Event Request] Approved by ${adminUser.email}: Request #${requestId} → Event #${eventId}`)

      return new Response(
        JSON.stringify({ success: true, message: 'Event request approved and event created', eventId }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Reject event request
    if (action === 'reject') {
      const { requestId, rejectionReason } = body

      await env.DB.prepare(
        `UPDATE event_requests
         SET status = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = ?
         WHERE id = ?`
      ).bind(adminUser.email, rejectionReason || null, requestId).run()

      console.log(`[Event Request] Rejected by ${adminUser.email}: Request #${requestId}`)

      return new Response(
        JSON.stringify({ success: true, message: 'Event request rejected' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error managing event requests:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
