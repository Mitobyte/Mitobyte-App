/**
 * Community Challenges API
 * Returns active community challenges
 */

export async function onRequestGet(context) {
  try {
    // Return empty challenges for now
    // TODO: Create challenges table and implement actual query
    return new Response(JSON.stringify({
      success: true,
      challenges: [],
      message: 'No active challenges at this time'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Failed to fetch challenges:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to fetch challenges',
      challenges: []
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
