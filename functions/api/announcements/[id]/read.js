// Mark an announcement as read
export async function onRequestPost({ request, params, env }) {
  try {
    const { id } = params
    const body = await request.json()
    const { walletAddress } = body

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ success: false, error: 'Wallet address is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Insert or ignore if already read
    await env.DB.prepare(
      `INSERT OR IGNORE INTO announcement_reads (announcement_id, user_wallet_address)
       VALUES (?, ?)`
    ).bind(id, walletAddress).run()

    return new Response(
      JSON.stringify({ success: true, message: 'Announcement marked as read' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error marking announcement as read:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
