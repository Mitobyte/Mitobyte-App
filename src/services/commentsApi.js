/**
 * Comments API Service
 * Custom commenting system with Replyke notification integration
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Get comments for an entity
 * @param {string} entityId - Replyke entity ID
 * @param {string} userEmail - User email for auth
 * @returns {Promise<Object>} Comments data with threading
 */
export async function getComments(entityId, userEmail) {
  const response = await fetch(
    `${API_BASE_URL}/api/comments?entity_id=${encodeURIComponent(entityId)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userEmail}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch comments');
  }

  return response.json();
}

/**
 * Create a new comment
 * @param {string} entityId - Replyke entity ID
 * @param {string} content - Comment content
 * @param {string} userEmail - User email for auth
 * @param {number|null} parentId - Parent comment ID for replies
 * @returns {Promise<Object>} Created comment
 */
export async function createComment(entityId, content, userEmail, parentId = null) {
  const response = await fetch(`${API_BASE_URL}/api/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userEmail}`,
    },
    body: JSON.stringify({
      entity_id: entityId,
      content,
      parent_id: parentId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create comment');
  }

  return response.json();
}

