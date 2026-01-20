/**
 * Cloudflare Pages Function: /api/health
 * Health check endpoint
 */

export async function onRequestGet() {
  return new Response(
    JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
