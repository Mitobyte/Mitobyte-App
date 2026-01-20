/**
 * Platform Settings API
 * Get and update platform-wide settings
 */

import { isAdmin } from '../utils/adminAuth.js'

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url)
    const settingKey = url.searchParams.get('key')

    if (settingKey) {
      // Get specific setting
      const setting = await env.DB.prepare(
        'SELECT setting_key, setting_value, updated_at FROM platform_settings WHERE setting_key = ?'
      ).bind(settingKey).first()

      return new Response(
        JSON.stringify({ success: true, setting }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    } else {
      // Get all settings
      const { results } = await env.DB.prepare(
        'SELECT setting_key, setting_value, updated_at FROM platform_settings'
      ).all()

      const settings = {}
      results.forEach(s => {
        settings[s.setting_key] = s.setting_value
      })

      return new Response(
        JSON.stringify({ success: true, settings }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Error fetching platform settings:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const { adminEmail, settingKey, settingValue } = await request.json()

    // Check admin authorization
    if (!adminEmail || !isAdmin(adminEmail)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate input
    if (!settingKey || settingValue === undefined) {
      return new Response(
        JSON.stringify({ success: false, error: 'Setting key and value are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Update or insert setting
    await env.DB.prepare(
      `INSERT INTO platform_settings (setting_key, setting_value, updated_by)
       VALUES (?, ?, ?)
       ON CONFLICT(setting_key) DO UPDATE SET
         setting_value = excluded.setting_value,
         updated_by = excluded.updated_by,
         updated_at = CURRENT_TIMESTAMP`
    ).bind(settingKey, settingValue, adminEmail).run()

    console.log(`[Platform Settings] Updated ${settingKey} = ${settingValue} by ${adminEmail}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Setting updated successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error updating platform settings:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
