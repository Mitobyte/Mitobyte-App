/**
 * Community Active Poll API
 * Returns the currently active community poll
 */

export async function onRequestGet(context) {
  try {
    // Return no active poll for now
    // TODO: Create polls table and implement actual query
    return new Response(JSON.stringify({
      success: true,
      poll: null,
      message: 'No active poll at this time'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Failed to fetch active poll:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to fetch active poll',
      poll: null
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
