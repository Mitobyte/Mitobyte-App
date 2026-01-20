/**
 * Invite Codes API
 * Manage invite codes for platform access
 */

import { isAdmin } from '../utils/adminAuth.js'

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed confusing characters
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url)
    const adminEmail = url.searchParams.get('adminEmail')
    const code = url.searchParams.get('code')

    // Public endpoint: Validate invite code
    if (code && !adminEmail) {
      const inviteCode = await env.DB.prepare(
        `SELECT id, uses_remaining, max_uses, expires_at, is_active
         FROM invite_codes
         WHERE code = ? AND is_active = 1`
      ).bind(code).first()

      if (!inviteCode) {
        return new Response(
          JSON.stringify({ success: false, valid: false, error: 'Invalid invite code' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Check if expired
      if (inviteCode.expires_at) {
        const now = new Date()
        const expiresAt = new Date(inviteCode.expires_at)
        if (now > expiresAt) {
          return new Response(
            JSON.stringify({ success: false, valid: false, error: 'Invite code has expired' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        }
      }

      // Check if uses remaining (NULL means unlimited)
      if (inviteCode.uses_remaining !== null && inviteCode.uses_remaining <= 0) {
        return new Response(
          JSON.stringify({ success: false, valid: false, error: 'Invite code has been fully used' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, valid: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Admin endpoint: List all invite codes
    if (!adminEmail || !isAdmin(adminEmail)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { results } = await env.DB.prepare(
      `SELECT id, code, created_by, created_at, uses_remaining, total_uses, max_uses,
              expires_at, is_active, notes
       FROM invite_codes
       ORDER BY created_at DESC`
    ).all()

    return new Response(
      JSON.stringify({ success: true, inviteCodes: results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching invite codes:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json()
    const { adminEmail, action, code, walletAddress, maxUses, expiresInDays, notes } = body

    // Validate invite code usage (public)
    if (action === 'use' && code && walletAddress) {
      // Check if code is valid
      const inviteCode = await env.DB.prepare(
        `SELECT id, uses_remaining, max_uses, expires_at, is_active
         FROM invite_codes
         WHERE code = ? AND is_active = 1`
      ).bind(code).first()

      if (!inviteCode) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid invite code' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Check expiration
      if (inviteCode.expires_at) {
        const now = new Date()
        const expiresAt = new Date(inviteCode.expires_at)
        if (now > expiresAt) {
          return new Response(
            JSON.stringify({ success: false, error: 'Invite code has expired' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        }
      }

      // Check uses remaining (NULL means unlimited)
      if (inviteCode.uses_remaining !== null && inviteCode.uses_remaining <= 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invite code has been fully used' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
      }

      // Check if already used by this wallet (normalize identifier)
      let normalizedWallet = walletAddress;
      if (normalizedWallet && normalizedWallet.startsWith('email:')) {
        normalizedWallet = normalizedWallet.substring(6);
      }

      const existingUse = await env.DB.prepare(
        `SELECT id FROM invite_code_uses WHERE invite_code_id = ? AND (wallet_address = ? OR wallet_address = ?)`
      ).bind(inviteCode.id, normalizedWallet, `email:${normalizedWallet}`).first()

      if (existingUse) {
        return new Response(
          JSON.stringify({ success: false, error: 'You have already used this invite code' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // VALIDATION ONLY - Don't redeem here, that happens at onboarding completion
      console.log(`[Invite Code] Validated (not redeemed) for ${normalizedWallet}: ${code}`)

      return new Response(
        JSON.stringify({ success: true, message: 'Invite code is valid' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Admin actions require authorization
    if (!adminEmail || !isAdmin(adminEmail)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Generate new invite code
    if (action === 'generate') {
      const newCode = generateInviteCode()
      // NULL means unlimited uses, otherwise use the specified maxUses (default to 1 if not specified)
      const uses = maxUses === 0 ? null : (maxUses || 1)
      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null

      await env.DB.prepare(
        `INSERT INTO invite_codes (code, created_by, uses_remaining, max_uses, expires_at, notes)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(newCode, adminEmail, uses, uses, expiresAt, notes || null).run()

      console.log(`[Invite Code] Generated by ${adminEmail}: ${newCode}`)

      return new Response(
        JSON.stringify({ success: true, code: newCode }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Deactivate invite code
    if (action === 'deactivate' && code) {
      await env.DB.prepare(
        `UPDATE invite_codes SET is_active = 0 WHERE code = ?`
      ).bind(code).run()

      console.log(`[Invite Code] Deactivated by ${adminEmail}: ${code}`)

      return new Response(
        JSON.stringify({ success: true, message: 'Invite code deactivated' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error managing invite codes:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
