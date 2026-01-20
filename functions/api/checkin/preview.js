/**
 * Cloudflare Pages Function: /api/checkin/preview
 * Preview AI-processed standup responses before check-in
 */

import { processStandupResponses } from '../../utils/standup-processor.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * POST /api/checkin/preview - Preview AI-processed standup responses
 */
export async function onRequestPost(context) {
  try {
    const { workingOn, canHelpWith, needHelpWith } = await context.request.json();

    // Validate required fields
    if (!workingOn || !canHelpWith) {
      return jsonResponse({
        error: 'Required fields: workingOn, canHelpWith'
      }, 400);
    }

    // Process responses with AI (content safety + cleanup)
    if (!context.env.AI) {
      return jsonResponse({
        error: 'AI processing is not available'
      }, 503);
    }

    const processingResult = await processStandupResponses(context.env.AI, {
      workingOn,
      canHelpWith,
      needHelpWith: needHelpWith || null
    });

    if (!processingResult.success) {
      return jsonResponse({
        error: processingResult.error,
        warnings: processingResult.warnings
      }, 400);
    }

    const { cleaned, confidence, contentWarnings } = processingResult.data;

    return jsonResponse({
      success: true,
      preview: {
        workingOn: cleaned.workingOn,
        canHelpWith: cleaned.canHelpWith,
        needHelpWith: cleaned.needHelpWith
      },
      confidence: confidence,
      contentWarnings: contentWarnings,
      message: 'Standup responses processed successfully. You can edit before submitting.'
    });
  } catch (error) {
    console.error('Preview standup error:', error);
    return jsonResponse({
      error: 'Failed to preview standup responses',
      details: error.message
    }, 500);
  }
}
