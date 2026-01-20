import { Note, Create } from '@fedify/fedify';
import { createFederationInstance, type FederationEnv } from './config';

export interface PublishActivityOptions {
  userEmail: string;
  content: string;
  voteId?: number;
  voteTitle?: string;
  type?: 'vote' | 'comment' | 'announcement';
}

/**
 * Publish an activity to the fediverse
 */
export async function publishActivity(
  env: FederationEnv,
  options: PublishActivityOptions
): Promise<void> {
  const { userEmail, content, voteId, voteTitle, type = 'announcement' } = options;

  try {
    const federation = createFederationInstance(env);

    // Generate unique activity ID
    const activityId = `https://${new URL(env.FEDERATION_KV.toString()).hostname}/users/${userEmail}/activities/${Date.now()}`;

    // Store activity in database
    const result = await env.DB.prepare(`
      INSERT INTO activitypub_activities
      (user_email, activity_id, activity_type, object_type, content, vote_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      userEmail,
      activityId,
      'Create',
      'Note',
      content,
      voteId || null
    ).run();

    if (!result.success) {
      throw new Error('Failed to store activity in database');
    }

    // Get user's followers
    const followers = await env.DB.prepare(`
      SELECT follower_uri, follower_handle
      FROM activitypub_followers
      WHERE user_email = ? AND status = 'accepted'
    `).bind(userEmail).all();

    if (followers.results.length === 0) {
      console.log('No followers to send activity to');
      return;
    }

    // Create the Note object
    const note = new Note({
      id: new URL(activityId),
      content: formatActivityContent(content, voteTitle, type),
      published: new Date(),
      attributedTo: new URL(`https://${new URL(env.FEDERATION_KV.toString()).hostname}/users/${userEmail}`),
      tag: [
        { type: 'Hashtag', name: '#Mitobyte' },
        { type: 'Hashtag', name: '#Voting' }
      ]
    });

    // Create the Create activity
    const createActivity = new Create({
      id: new URL(`${activityId}/activity`),
      actor: new URL(`https://${new URL(env.FEDERATION_KV.toString()).hostname}/users/${userEmail}`),
      object: note,
      published: new Date(),
    });

    // Send activity to all followers
    for (const follower of followers.results) {
      try {
        await federation.sendActivity(
          { handle: userEmail },
          new URL(follower.follower_uri),
          createActivity
        );
        console.log(`Sent activity to ${follower.follower_handle}`);
      } catch (error) {
        console.error(`Failed to send activity to ${follower.follower_handle}:`, error);
      }
    }

    console.log(`Published activity ${activityId} to ${followers.results.length} followers`);
  } catch (error) {
    console.error('Error publishing activity:', error);
    throw error;
  }
}

/**
 * Format activity content based on type
 */
function formatActivityContent(content: string, voteTitle?: string, type?: string): string {
  switch (type) {
    case 'vote':
      return voteTitle
        ? `🗳️ Voted on: ${voteTitle}\n\n${content}`
        : `🗳️ ${content}`;
    case 'comment':
      return `💬 ${content}`;
    case 'announcement':
    default:
      return content;
  }
}

/**
 * Follow a remote ActivityPub actor
 */
export async function followRemoteActor(
  env: FederationEnv,
  userEmail: string,
  remoteActorUri: string
): Promise<boolean> {
  try {
    const federation = createFederationInstance(env);

    // Store pending follow in database
    await env.DB.prepare(`
      INSERT OR REPLACE INTO activitypub_following
      (user_email, following_uri, status)
      VALUES (?, ?, 'pending')
    `).bind(userEmail, remoteActorUri).run();

    // Send Follow activity
    const followActivity = new Follow({
      id: new URL(`https://${new URL(env.FEDERATION_KV.toString()).hostname}/users/${userEmail}/follows/${Date.now()}`),
      actor: new URL(`https://${new URL(env.FEDERATION_KV.toString()).hostname}/users/${userEmail}`),
      object: new URL(remoteActorUri),
    });

    await federation.sendActivity(
      { handle: userEmail },
      new URL(remoteActorUri),
      followActivity
    );

    console.log(`Sent follow request to ${remoteActorUri}`);
    return true;
  } catch (error) {
    console.error('Error following remote actor:', error);
    return false;
  }
}

/**
 * Unfollow a remote ActivityPub actor
 */
export async function unfollowRemoteActor(
  env: FederationEnv,
  userEmail: string,
  remoteActorUri: string
): Promise<boolean> {
  try {
    const federation = createFederationInstance(env);

    // Get the original follow activity
    const following = await env.DB.prepare(`
      SELECT * FROM activitypub_following
      WHERE user_email = ? AND following_uri = ?
    `).bind(userEmail, remoteActorUri).first();

    if (!following) {
      console.log('Not following this actor');
      return false;
    }

    // Send Undo Follow activity
    const undoActivity = new Undo({
      id: new URL(`https://${new URL(env.FEDERATION_KV.toString()).hostname}/users/${userEmail}/undo/${Date.now()}`),
      actor: new URL(`https://${new URL(env.FEDERATION_KV.toString()).hostname}/users/${userEmail}`),
      object: new Follow({
        id: new URL(`https://${new URL(env.FEDERATION_KV.toString()).hostname}/users/${userEmail}/follows/${following.id}`),
        actor: new URL(`https://${new URL(env.FEDERATION_KV.toString()).hostname}/users/${userEmail}`),
        object: new URL(remoteActorUri),
      })
    });

    await federation.sendActivity(
      { handle: userEmail },
      new URL(remoteActorUri),
      undoActivity
    );

    // Remove from database
    await env.DB.prepare(`
      DELETE FROM activitypub_following
      WHERE user_email = ? AND following_uri = ?
    `).bind(userEmail, remoteActorUri).run();

    console.log(`Unfollowed ${remoteActorUri}`);
    return true;
  } catch (error) {
    console.error('Error unfollowing remote actor:', error);
    return false;
  }
}

/**
 * Get follower count for a user
 */
export async function getFollowerCount(db: D1Database, userEmail: string): Promise<number> {
  const result = await db.prepare(`
    SELECT COUNT(*) as count
    FROM activitypub_followers
    WHERE user_email = ? AND status = 'accepted'
  `).bind(userEmail).first();

  return result?.count || 0;
}

/**
 * Get following count for a user
 */
export async function getFollowingCount(db: D1Database, userEmail: string): Promise<number> {
  const result = await db.prepare(`
    SELECT COUNT(*) as count
    FROM activitypub_following
    WHERE user_email = ? AND status = 'accepted'
  `).bind(userEmail).first();

  return result?.count || 0;
}

/**
 * Get recent activities for a user
 */
export async function getUserActivities(
  db: D1Database,
  userEmail: string,
  limit: number = 20
) {
  const activities = await db.prepare(`
    SELECT * FROM activitypub_activities
    WHERE user_email = ?
    ORDER BY published_at DESC
    LIMIT ?
  `).bind(userEmail, limit).all();

  return activities.results;
}

// Import missing Follow and Undo
import { Follow, Undo } from '@fedify/fedify';
