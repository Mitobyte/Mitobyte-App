// Mark all announcements as read for a user
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json()
    const { walletAddress } = body

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ success: false, error: 'Wallet address is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get all announcement IDs from the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { results: announcements } = await env.DB.prepare(
      'SELECT id FROM announcements WHERE sent_at >= ?'
    ).bind(thirtyDaysAgo.toISOString()).all()

    // Mark each as read (insert or ignore if already exists)
    for (const announcement of announcements) {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO announcement_reads (announcement_id, user_wallet_address)
         VALUES (?, ?)`
      ).bind(announcement.id, walletAddress).run()
    }

    return new Response(
      JSON.stringify({ success: true, message: 'All announcements marked as read' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error marking all announcements as read:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
