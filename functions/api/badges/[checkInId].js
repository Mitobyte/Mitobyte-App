/**
 * Get Badge for Check-In
 * GET /api/badges/:checkInId
 */

export async function onRequestGet(context) {
  try {
    const { checkInId } = context.params;

    if (!checkInId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing checkInId parameter'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get badge data from checkins table
    const checkIn = await context.env.DB.prepare(
      `SELECT badge_image, badge_prompt FROM checkins WHERE id = ?`
    ).bind(checkInId).first();

    if (!checkIn) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Check-in not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If badge hasn't been generated yet
    if (!checkIn.badge_image) {
      return new Response(JSON.stringify({
        success: true,
        badge: null,
        generating: true
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      badge: {
        image: checkIn.badge_image,
        prompt: checkIn.badge_prompt
      },
      generating: false
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching badge:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
