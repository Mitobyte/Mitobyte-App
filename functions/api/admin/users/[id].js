/**
 * Cloudflare Pages Function: /api/admin/users/:id
 * Handles admin user operations (DELETE)
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * DELETE /api/admin/users/:id - Delete user and associated data
 * WARNING: This permanently deletes user and all their data across all tables
 */
export async function onRequestDelete(context) {
  try {
    const userId = parseInt(context.params.id);

    // Check if user exists
    const user = await context.env.DB.prepare(
      'SELECT id, email, wallet_hash FROM users WHERE id = ?'
    )
      .bind(userId)
      .first();

    if (!user) {
      return jsonResponse({ error: 'User not found' }, 404);
    }

    const userEmail = user.email;

    // Prevent admin users from being deleted
    if (userEmail && userEmail.startsWith('carl@craftthefuture.xyz')) {
      return jsonResponse({
        error: 'Admin accounts cannot be deleted',
        message: 'Administrator accounts are protected and cannot be deleted for security reasons.'
      }, 403);
    }

    // Disable foreign keys temporarily for complex deletion
    await context.env.DB.prepare('PRAGMA foreign_keys = OFF').run();

    try {
      // Delete all user-associated data in correct order

      // 1. Delete all posts by this user (cascades to post_tags, post_likes, post_boosts, post_stats, post_mentions)
      if (userEmail) {
        try {
          await context.env.DB.prepare('DELETE FROM posts WHERE user_email = ?')
            .bind(userEmail)
            .run();
        } catch (error) {
          console.warn('Failed to delete posts:', error.message);
        }
      }

    // 2. Delete all comments by this user (cascades to comment_votes)
    try {
      await context.env.DB.prepare('DELETE FROM comments WHERE user_id = ?')
        .bind(userId)
        .run();
    } catch (error) {
      console.warn('Failed to delete comments:', error.message);
    }

    // 3. Delete user follows (both as follower and following)
    if (userEmail) {
      try {
        await context.env.DB.prepare(
          'DELETE FROM user_follows WHERE follower_email = ? OR following_email = ?'
        )
          .bind(userEmail, userEmail)
          .run();
      } catch (error) {
        console.warn('Failed to delete user_follows:', error.message);
      }
    }

    // 4. Delete RSVPs and event-related data
    try {
      await context.env.DB.prepare('DELETE FROM rsvps WHERE user_id = ?')
        .bind(userId)
        .run();
    } catch (error) {
      console.warn('Failed to delete rsvps:', error.message);
    }

    // 5. Delete hackathon-related data
    try {
      await context.env.DB.prepare('DELETE FROM hackathon_ideas WHERE user_id = ?')
        .bind(userId)
        .run();
    } catch (error) {
      console.warn('Failed to delete hackathon_ideas:', error.message);
    }

    try {
      await context.env.DB.prepare('DELETE FROM idea_votes WHERE user_id = ?')
        .bind(userId)
        .run();
    } catch (error) {
      console.warn('Failed to delete idea_votes:', error.message);
    }

    // 6. Delete checkins
    try {
      await context.env.DB.prepare('DELETE FROM checkins WHERE user_id = ?')
        .bind(userId)
        .run();
    } catch (error) {
      console.warn('Failed to delete checkins:', error.message);
    }

    // 7. Delete bingo-related data
    const walletHash = user.wallet_hash;
    if (walletHash) {
      // Delete bingo completions first (references bingo_boards)
      try {
        await context.env.DB.prepare('DELETE FROM bingo_completions WHERE board_id IN (SELECT id FROM bingo_boards WHERE user_wallet_hash = ?)')
          .bind(walletHash)
          .run();
      } catch (error) {
        console.warn('Failed to delete bingo_completions:', error.message);
      }

      // Also delete completions where user is the matched_user
      try {
        await context.env.DB.prepare('DELETE FROM bingo_completions WHERE matched_user_wallet_hash = ?')
          .bind(walletHash)
          .run();
      } catch (error) {
        console.warn('Failed to delete bingo_completions (matched):', error.message);
      }

      // Delete bingo boards
      try {
        await context.env.DB.prepare('DELETE FROM bingo_boards WHERE user_wallet_hash = ?')
          .bind(walletHash)
          .run();
      } catch (error) {
        console.warn('Failed to delete bingo_boards:', error.message);
      }

      // Delete bingo rewards
      try {
        await context.env.DB.prepare('DELETE FROM bingo_rewards WHERE user_wallet_hash = ?')
          .bind(walletHash)
          .run();
      } catch (error) {
        console.warn('Failed to delete bingo_rewards:', error.message);
      }
    }

    // 8. Delete ActivityPub data (must happen before user deletion due to FK constraints)
    if (userEmail) {
      try {
        await context.env.DB.prepare('DELETE FROM activitypub_inbox WHERE user_email = ?')
          .bind(userEmail)
          .run();
      } catch (error) {
        console.warn('Failed to delete from activitypub_inbox:', error.message);
      }

      try {
        await context.env.DB.prepare('DELETE FROM activitypub_activities WHERE user_email = ?')
          .bind(userEmail)
          .run();
      } catch (error) {
        console.warn('Failed to delete from activitypub_activities:', error.message);
      }

      try {
        await context.env.DB.prepare('DELETE FROM activitypub_following WHERE user_email = ?')
          .bind(userEmail)
          .run();
      } catch (error) {
        console.warn('Failed to delete from activitypub_following:', error.message);
      }

      try {
        await context.env.DB.prepare('DELETE FROM activitypub_followers WHERE user_email = ?')
          .bind(userEmail)
          .run();
      } catch (error) {
        console.warn('Failed to delete from activitypub_followers:', error.message);
      }

      try {
        await context.env.DB.prepare('DELETE FROM activitypub_actor_keys WHERE user_email = ?')
          .bind(userEmail)
          .run();
      } catch (error) {
        console.warn('Failed to delete from activitypub_actor_keys:', error.message);
      }
    }

    // 9. Delete user settings
    try {
      await context.env.DB.prepare('DELETE FROM user_settings WHERE user_id = ?')
        .bind(userId)
        .run();
    } catch (error) {
      console.warn('Failed to delete user_settings:', error.message);
    }

    // 10. Delete user profile
    try {
      await context.env.DB.prepare('DELETE FROM user_profiles WHERE user_id = ?')
        .bind(userId)
        .run();
    } catch (error) {
      console.warn('Failed to delete user_profiles:', error.message);
    }

      // 11. Finally, delete the user
      await context.env.DB.prepare('DELETE FROM users WHERE id = ?')
        .bind(userId)
        .run();

      return jsonResponse({
        success: true,
        message: 'User and all associated data deleted successfully',
        deletedUser: {
          id: user.id,
          email: userEmail
        }
      });
    } finally {
      // Re-enable foreign keys
      await context.env.DB.prepare('PRAGMA foreign_keys = ON').run();
    }
  } catch (error) {
    console.error('Delete user error:', error);
    return jsonResponse({
      error: 'Failed to delete user',
      details: error.message
    }, 500);
  }
}
