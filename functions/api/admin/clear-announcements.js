import { isAdmin } from '../../utils/adminAuth'

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json()
    const { adminEmail } = body

    // Check admin authorization
    if (!adminEmail || !isAdmin(adminEmail)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Delete all announcements
    const result = await env.DB.prepare(
      'DELETE FROM announcements'
    ).run()

    // Also delete all announcement_reads
    await env.DB.prepare(
      'DELETE FROM announcement_reads'
    ).run()

    console.log('[Admin] All announcements cleared by:', adminEmail)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'All announcements cleared successfully',
        deletedCount: result.meta.changes || 0
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error clearing announcements:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
