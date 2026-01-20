/**
 * Cloudflare Pages Function: /api/comments
 * Custom commenting system with Replyke notification integration
 */

import { requireAuth, errorResponse, jsonResponse } from '../utils/auth.js';

/**
 * Send notification via Replyke API
 * This triggers Replyke's notification system while using our own comment storage
 */
async function sendReplykeNotification(entityId, commentContent, userEmail, projectId) {
  try {
    // Replyke notification endpoint (if they have one)
    // For now, we'll just log it - you'll need to check Replyke docs for their notification API
    console.log(`📢 Would send Replyke notification for entity ${entityId}`);

    // TODO: Implement actual Replyke notification API call
    // const response = await fetch(`https://api.replyke.com/api/v6/${projectId}/notifications`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${apiKey}`
    //   },
    //   body: JSON.stringify({
    //     entityId,
    //     type: 'comment',
    //     message: `New comment: ${commentContent}`,
    //     userEmail
    //   })
    //   });

    return true;
  } catch (error) {
    console.error('Failed to send Replyke notification:', error);
    // Don't fail the comment creation if notification fails
    return false;
  }
}

/**
 * GET /api/comments?entity_id=X - Get comments for an entity
 */
export async function onRequestGet(context) {
  const { searchParams } = new URL(context.request.url);
  const entityId = searchParams.get('entity_id');

  if (!entityId) {
    return errorResponse('entity_id parameter required', 400);
  }

  try {
    // Get comments with user info and vote counts
    const result = await context.env.DB.prepare(`
      SELECT
        c.id,
        c.entity_id,
        c.parent_id,
        c.content,
        c.created_at,
        c.updated_at,
        c.user_id,
        c.user_email,
        c.user_display_name,
        COALESCE(s.upvotes, 0) as upvotes,
        COALESCE(s.downvotes, 0) as downvotes,
        COALESCE(s.reply_count, 0) as reply_count
      FROM comments c
      LEFT JOIN comment_stats s ON c.id = s.id
      WHERE c.entity_id = ? AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC
    `).bind(entityId).all();

    const comments = result.results || [];

    // Build threaded structure
    const commentMap = {};
    const rootComments = [];

    comments.forEach(comment => {
      commentMap[comment.id] = {
        ...comment,
        replies: []
      };
    });

    comments.forEach(comment => {
      if (comment.parent_id) {
        const parent = commentMap[comment.parent_id];
        if (parent) {
          parent.replies.push(commentMap[comment.id]);
        }
      } else {
        rootComments.push(commentMap[comment.id]);
      }
    });

    return jsonResponse({
      comments: rootComments,
      total: comments.length
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return errorResponse('Failed to fetch comments', 500);
  }
}

/**
 * POST /api/comments - Create a new comment
 */
export async function onRequestPost(context) {
  try {
    const userEmail = await requireAuth(context.request);
    const body = await context.request.json();

    const { entity_id, content, parent_id } = body;

    // Validation
    if (!entity_id || !content) {
      return errorResponse('entity_id and content are required', 400);
    }

    if (content.trim().length === 0) {
      return errorResponse('Comment content cannot be empty', 400);
    }

    if (content.length > 5000) {
      return errorResponse('Comment too long (max 5000 characters)', 400);
    }

    // Get user info
    const userResult = await context.env.DB.prepare(
      'SELECT id, email, display_name FROM users WHERE email = ?'
    ).bind(userEmail).first();

    if (!userResult) {
      return errorResponse('User not found', 404);
    }

    // Validate parent comment if provided
    if (parent_id) {
      const parentResult = await context.env.DB.prepare(
        'SELECT id FROM comments WHERE id = ? AND deleted_at IS NULL'
      ).bind(parent_id).first();

      if (!parentResult) {
        return errorResponse('Parent comment not found', 404);
      }
    }

    // Create comment
    const insertResult = await context.env.DB.prepare(`
      INSERT INTO comments (
        entity_id,
        user_id,
        parent_id,
        content,
        user_email,
        user_display_name
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      entity_id,
      userResult.id,
      parent_id || null,
      content.trim(),
      userResult.email,
      userResult.display_name || userResult.email.split('@')[0]
    ).run();

    const commentId = insertResult.meta.last_row_id;

    // Get the created comment
    const newComment = await context.env.DB.prepare(`
      SELECT
        c.id,
        c.entity_id,
        c.parent_id,
        c.content,
        c.created_at,
        c.user_id,
        c.user_email,
        c.user_display_name,
        0 as upvotes,
        0 as downvotes,
        0 as reply_count
      FROM comments c
      WHERE c.id = ?
    `).bind(commentId).first();

    // 🔔 Send Replyke notification
    const projectId = context.env.VITE_REPLYKE_PROJECT_ID || 'a9a22172-08ee-4e3b-a49d-2173c925a599';
    await sendReplykeNotification(entity_id, content, userEmail, projectId);

    console.log('✅ Comment created:', commentId, 'for entity:', entity_id);

    return jsonResponse(newComment, 201);
  } catch (error) {
    console.error('Error creating comment:', error);
    return errorResponse(`Failed to create comment: ${error.message}`, 500);
  }
}

/**
 * OPTIONS - Handle CORS preflight
 */
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
