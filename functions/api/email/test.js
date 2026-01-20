/**
 * Test endpoint for email functionality
 * POST /api/email/test
 */

import { sendEmail } from '../../utils/email.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // Parse request body
    const body = await request.json();
    const { to, subject, message } = body;

    // Validate required fields
    if (!to || !subject || !message) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: to, subject, message'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if email binding is configured
    if (!env.EMAIL_SENDER) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email binding not configured. Please add EMAIL_SENDER binding in wrangler.toml'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get sender configuration from environment
    const senderEmail = env.SENDER_EMAIL || 'noreply@mitobyte.com';
    const senderName = env.SENDER_NAME || 'Mitobyte';

    // Send test email
    const result = await sendEmail(
      env.EMAIL_SENDER,
      senderEmail,
      senderName,
      to,
      subject,
      message,
      `<p>${message}</p>`
    );

    if (result.success) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Test email sent successfully',
        details: result
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to send email',
        details: result
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Test email error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
