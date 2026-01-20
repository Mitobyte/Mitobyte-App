/**
 * Custom Comments Hooks
 * Drop-in replacement for Replyke comment hooks with notification integration
 */

import { useState, useEffect, useCallback } from 'react';
import { getComments, createComment as apiCreateComment } from '../services/commentsApi';

/**
 * Hook to fetch and manage comments for an entity
 * Compatible with Replyke's useEntityComments interface
 */
export function useEntityComments(entityId, userEmail) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchComments = useCallback(async () => {
    if (!entityId || !userEmail) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('📝 Fetching comments for entity:', entityId);

      const data = await getComments(entityId, userEmail);
      setComments(data.comments || []);

      console.log('✅ Comments fetched:', data.comments?.length);
    } catch (err) {
      console.error('❌ Failed to fetch comments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [entityId, userEmail]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return {
    comments,
    loading,
    error,
    refresh: fetchComments,
  };
}

/**
 * Hook to create comments
 * Compatible with Replyke's useCreateComment interface
 */
export function useCreateComment(userEmail) {
  const [creating, setCreating] = useState(false);

  const createComment = useCallback(
    async (entityId, content, parentId = null) => {
      if (!entityId || !content || !userEmail) {
        throw new Error('Missing required parameters');
      }

      try {
        setCreating(true);
        console.log('📝 Creating comment:', { entityId, content, parentId });

        const result = await apiCreateComment(entityId, content, userEmail, parentId);

        console.log('✅ Comment created successfully:', result);
        return result;
      } catch (error) {
        console.error('❌ Failed to create comment:', error);
        throw error;
      } finally {
        setCreating(false);
      }
    },
    [userEmail]
  );

  return { createComment, creating };
}

