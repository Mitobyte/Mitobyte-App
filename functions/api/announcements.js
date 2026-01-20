// Public endpoint for users to fetch their announcements
export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url)
    const walletAddress = url.searchParams.get('walletAddress')

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ success: false, error: 'Wallet address is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get recent announcements (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { results: announcements } = await env.DB.prepare(
      `SELECT
        a.*,
        CASE WHEN ar.id IS NOT NULL THEN 1 ELSE 0 END as is_read
       FROM announcements a
       LEFT JOIN announcement_reads ar
         ON a.id = ar.announcement_id
         AND ar.user_wallet_address = ?
       WHERE a.sent_at >= ?
       ORDER BY a.sent_at DESC
       LIMIT 50`
    ).bind(walletAddress, thirtyDaysAgo.toISOString()).all()

    // Count unread announcements
    const unreadCount = announcements.filter(a => !a.is_read).length

    return new Response(
      JSON.stringify({
        success: true,
        announcements,
        unreadCount
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching announcements:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
