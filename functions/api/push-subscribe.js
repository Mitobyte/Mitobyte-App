export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json()
    const { walletAddress, subscription } = body

    if (!walletAddress || !subscription) {
      return new Response(
        JSON.stringify({ success: false, error: 'Wallet address and subscription are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { endpoint, keys } = subscription

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid subscription format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if subscription already exists
    const { results: existing } = await env.DB.prepare(
      'SELECT id FROM push_subscriptions WHERE endpoint = ?'
    ).bind(endpoint).all()

    if (existing.length > 0) {
      // Update existing subscription
      await env.DB.prepare(
        `UPDATE push_subscriptions
         SET user_wallet_address = ?,
             keys_p256dh = ?,
             keys_auth = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE endpoint = ?`
      ).bind(walletAddress, keys.p256dh, keys.auth, endpoint).run()
    } else {
      // Insert new subscription
      await env.DB.prepare(
        `INSERT INTO push_subscriptions (user_wallet_address, endpoint, keys_p256dh, keys_auth)
         VALUES (?, ?, ?, ?)`
      ).bind(walletAddress, endpoint, keys.p256dh, keys.auth).run()
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Subscription saved successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error saving push subscription:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function onRequestDelete({ request, env }) {
  try {
    const url = new URL(request.url)
    const endpoint = url.searchParams.get('endpoint')

    if (!endpoint) {
      return new Response(
        JSON.stringify({ success: false, error: 'Endpoint is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    await env.DB.prepare(
      'DELETE FROM push_subscriptions WHERE endpoint = ?'
    ).bind(endpoint).run()

    return new Response(
      JSON.stringify({ success: true, message: 'Subscription removed successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error removing push subscription:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
