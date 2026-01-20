import { hashWallet } from '../utils/encryption.js'

// Helper function to create JSON response
const jsonResponse = (data, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url)
    const walletAddress = url.searchParams.get('walletAddress')

    if (!walletAddress) {
      return jsonResponse({ error: 'Wallet address is required' }, 400)
    }

    const walletHash = await hashWallet(walletAddress)

    // Get all events user has RSVP'd to with status "going"
    const result = await context.env.DB.prepare(
      `SELECT
        e.id,
        e.title,
        e.description,
        e.event_type,
        e.date as event_date,
        e.time,
        e.location,
        e.capacity,
        r.rsvp_status,
        r.created_at as rsvp_date,
        (SELECT COUNT(*) FROM rsvps WHERE event_id = e.id AND rsvp_status = 'going') as total_rsvps
       FROM events e
       INNER JOIN rsvps r ON e.id = r.event_id
       WHERE r.user_wallet_hash = ?
         AND r.rsvp_status = 'going'
         AND datetime(e.date || ' ' || e.time) >= datetime('now')
       ORDER BY e.date ASC`
    ).bind(walletHash).all()

    return jsonResponse({
      success: true,
      events: result.results || []
    })

  } catch (error) {
    console.error('Error fetching user events:', error)
    return jsonResponse({
      error: 'Failed to fetch user events',
      details: error.message
    }, 500)
  }
}
