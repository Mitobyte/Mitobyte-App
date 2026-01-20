// Track sponsor click analytics
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}

// POST - Track sponsor click
export async function onRequestPost(context) {
  try {
    const sponsorId = context.params.id

    // Increment click counter
    await context.env.DB.prepare(
      'UPDATE sponsors SET clicks = clicks + 1 WHERE id = ?'
    ).bind(sponsorId).run()

    return jsonResponse({
      success: true,
      message: 'Click tracked'
    })
  } catch (error) {
    console.error('Error tracking click:', error)
    // Don't fail the request if tracking fails
    return jsonResponse({
      success: false,
      error: 'Failed to track click'
    }, 200) // Still return 200 so user isn't blocked
  }
}

// OPTIONS - CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
