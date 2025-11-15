# Fedify Implementation - Quick Start Guide

## Overview

This guide provides the **exact steps** to implement full ActivityPub federation using Fedify. Follow these steps sequentially.

---

## Phase 1: Database Updates (30 minutes)

### Step 1.1: Create Migration File

Create `C:\Users\aaron\Documents\MitobyteAppVoting\migrations\0024_fedify_schema_enhancements.sql`:

```sql
-- Add ActivityPub URIs and federation metadata to posts
ALTER TABLE posts ADD COLUMN activitypub_uri TEXT UNIQUE;
ALTER TABLE posts ADD COLUMN activitypub_id TEXT UNIQUE;
ALTER TABLE posts ADD COLUMN federated BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN remote_actor_uri TEXT;
ALTER TABLE posts ADD COLUMN conversation_uri TEXT;

CREATE INDEX IF NOT EXISTS idx_posts_activitypub_uri ON posts(activitypub_uri);
CREATE INDEX IF NOT EXISTS idx_posts_activitypub_id ON posts(activitypub_id);
CREATE INDEX IF NOT EXISTS idx_posts_federated ON posts(federated);

-- Actor keys for HTTP signatures
CREATE TABLE IF NOT EXISTS activitypub_actor_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  private_key TEXT NOT NULL,
  key_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
);

-- Post to activity mapping
CREATE TABLE IF NOT EXISTS activitypub_post_mapping (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL UNIQUE,
  activity_id TEXT NOT NULL UNIQUE,
  object_uri TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Remote posts storage
CREATE TABLE IF NOT EXISTS activitypub_remote_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_uri TEXT NOT NULL UNIQUE,
  object_uri TEXT NOT NULL UNIQUE,
  actor_uri TEXT NOT NULL,
  content TEXT,
  published_at TEXT NOT NULL,
  raw_object TEXT NOT NULL,
  local_post_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (local_post_id) REFERENCES posts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_activitypub_remote_posts_actor ON activitypub_remote_posts(actor_uri);
CREATE INDEX IF NOT EXISTS idx_activitypub_remote_posts_published ON activitypub_remote_posts(published_at DESC);
```

### Step 1.2: Run Migration

```bash
# Local development
wrangler d1 execute mitobyte-users --local --file=./migrations/0024_fedify_schema_enhancements.sql

# Production
wrangler d1 execute mitobyte-users --file=./migrations/0024_fedify_schema_enhancements.sql
```

---

## Phase 2: Create Utility Files (45 minutes)

### Step 2.1: URI Generator

Create `C:\Users\aaron\Documents\MitobyteAppVoting\functions\federation\uris.ts`:

[See full file in FEDIFY_REFACTOR_PLAN.md - Section 1.2]

### Step 2.2: Key Management

Create `C:\Users\aaron\Documents\MitobyteAppVoting\functions\federation\keys.ts`:

[See full file in FEDIFY_REFACTOR_PLAN.md - Section 2.1]

---

## Phase 3: Update Federation Config (60 minutes)

### Step 3.1: Update Imports

In `C:\Users\aaron\Documents\MitobyteAppVoting\functions\federation\config.ts`, add:

```typescript
import { Note, Image, Document, Create } from "@fedify/fedify";
import { getOrCreateActorKeys } from './keys';
import { FedifyUriGenerator } from './uris';
```

### Step 3.2: Enhanced Actor Dispatcher

Replace the existing actor dispatcher in `config.ts`:

```typescript
// Replace existing setActorDispatcher with:
federation.setActorDispatcher("/users/{handle}", async (ctx, handle) => {
  try {
    const user = await ctx.data.DB.prepare(
      "SELECT * FROM users WHERE email = ?"
    ).bind(handle).first();

    if (!user) return null;

    const domain = new URL(ctx.url).hostname;
    const keys = await getOrCreateActorKeys(ctx.data, handle, domain);

    return new Person({
      id: ctx.getActorUri(handle),
      name: user.display_name || user.email.split('@')[0],
      preferredUsername: handle.split('@')[0],
      summary: user.bio || `Mitobyte user - ${user.email}`,
      inbox: ctx.getInboxUri(handle),
      outbox: ctx.getOutboxUri(handle),
      followers: ctx.getFollowersUri(handle),
      following: ctx.getFollowingUri(handle),
      url: ctx.url,
      published: new Date(user.created_at),
      publicKey: {
        id: new URL(keys.keyId),
        owner: ctx.getActorUri(handle),
        publicKey: keys.publicKey
      },
      endpoints: {
        sharedInbox: ctx.getInboxUri()
      }
    });
  } catch (error) {
    console.error('Error fetching actor:', error);
    return null;
  }
});
```

### Step 3.3: Add Key Pairs Dispatcher

Add after actor dispatcher:

```typescript
// Add actor key pairs for signing activities
federation.setActorKeyPairsDispatcher(async (ctx, handle) => {
  const domain = new URL(ctx.url).hostname;
  const keys = await getOrCreateActorKeys(ctx.data, handle, domain);

  return [{
    privateKey: keys.privateKey,
    keyId: new URL(keys.keyId)
  }];
});
```

### Step 3.4: Add WebFinger Mapping

Add after key pairs dispatcher:

```typescript
// WebFinger username to email mapping
federation.mapHandle(async (ctx, username) => {
  // Try exact email match
  const userByEmail = await ctx.data.DB.prepare(
    "SELECT email FROM users WHERE email = ?"
  ).bind(username).first();

  if (userByEmail) return userByEmail.email;

  // Try username part match
  const userByUsername = await ctx.data.DB.prepare(
    "SELECT email FROM users WHERE email LIKE ?"
  ).bind(`${username}@%`).first();

  if (userByUsername) return userByUsername.email;

  return null;
});
```

### Step 3.5: Add Post Object Dispatcher

Add after WebFinger mapping:

```typescript
// Post object dispatcher
federation.setObjectDispatcher(
  Note,
  "/posts/{id}",
  async (ctx, values) => {
    const postId = parseInt(values.id);
    if (isNaN(postId)) return null;

    const post = await ctx.data.DB.prepare(`
      SELECT p.*, u.email, u.display_name
      FROM posts p
      JOIN users u ON p.user_email = u.email
      WHERE p.id = ?
    `).bind(postId).first();

    if (!post) return null;

    const tags = await ctx.data.DB.prepare(`
      SELECT tag FROM post_tags WHERE post_id = ?
    `).bind(postId).all();

    const domain = new URL(ctx.url).hostname;
    const uriGen = new FedifyUriGenerator(domain);

    const noteProps: any = {
      id: new URL(uriGen.getPostUri(postId)),
      content: post.content,
      published: new Date(post.created_at),
      attributedTo: ctx.getActorUri(post.user_email),
      to: new URL("https://www.w3.org/ns/activitystreams#Public"),
      cc: [ctx.getFollowersUri(post.user_email)],
    };

    if (post.reply_to_id) {
      noteProps.inReplyTo = new URL(uriGen.getPostUri(post.reply_to_id));

      const parent = await ctx.data.DB.prepare(
        "SELECT conversation_uri FROM posts WHERE id = ?"
      ).bind(post.reply_to_id).first();

      noteProps.context = parent?.conversation_uri
        ? new URL(parent.conversation_uri)
        : new URL(uriGen.getConversationUri(post.reply_to_id));
    } else {
      noteProps.context = new URL(uriGen.getConversationUri(postId));
    }

    if (tags.results.length > 0) {
      noteProps.tag = tags.results.map(t => ({
        type: "Hashtag",
        name: `#${t.tag}`,
        href: new URL(`https://${domain}/tags/${t.tag}`)
      }));
    }

    return new Note(noteProps);
  }
);
```

### Step 3.6: Add NodeInfo Dispatcher

Add after post object dispatcher:

```typescript
// NodeInfo dispatcher
federation.setNodeInfoDispatcher("/nodeinfo/2.1", async (ctx) => {
  const userCount = await ctx.data.DB.prepare(
    "SELECT COUNT(*) as count FROM users"
  ).first();

  const postCount = await ctx.data.DB.prepare(
    "SELECT COUNT(*) as count FROM posts WHERE federated = 1"
  ).first();

  return {
    software: {
      name: "Mitobyte Social",
      version: "1.0.0",
      repository: "https://github.com/yourusername/mitobyte"
    },
    protocols: ["activitypub"],
    services: { inbound: [], outbound: [] },
    openRegistrations: false,
    usage: {
      users: {
        total: userCount?.count || 0,
        activeMonth: userCount?.count || 0,
        activeHalfyear: userCount?.count || 0
      },
      localPosts: postCount?.count || 0,
      localComments: 0
    },
    metadata: {
      nodeName: "Mitobyte Social",
      nodeDescription: "A federated social platform"
    }
  };
});
```

### Step 3.7: Enhance Inbox Listeners

Replace existing inbox listeners:

```typescript
// Enhanced inbox listeners
federation
  .setInboxListeners("/users/{handle}/inbox", "/inbox")
  .on(Create, async (ctx, create) => {
    try {
      const object = await create.getObject();

      if (object instanceof Note) {
        const actorUri = create.actorId?.href;
        const objectUri = object.id?.href;

        if (!actorUri || !objectUri) return;

        // Check if already exists
        const existing = await ctx.data.DB.prepare(`
          SELECT id FROM activitypub_remote_posts WHERE object_uri = ?
        `).bind(objectUri).first();

        if (existing) return;

        // Store remote post
        await ctx.data.DB.prepare(`
          INSERT INTO activitypub_remote_posts
          (activity_uri, object_uri, actor_uri, content, published_at, raw_object)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          create.id?.href || '',
          objectUri,
          actorUri,
          object.content || '',
          object.published?.toISOString() || new Date().toISOString(),
          JSON.stringify(object)
        ).run();

        console.log(`Stored remote post: ${objectUri}`);
      }
    } catch (error) {
      console.error('Error handling Create activity:', error);
    }
  })
  .on(Follow, async (ctx, follow) => {
    // Keep existing Follow handler
  })
  .on(Undo, async (ctx, undo) => {
    // Keep existing Undo handler
  })
  .on(Like, async (ctx, like) => {
    // Keep existing Like handler
  })
  .on(Announce, async (ctx, announce) => {
    // Keep existing Announce handler
  });
```

---

## Phase 4: Update Post Creation (30 minutes)

Update `C:\Users\aaron\Documents\MitobyteAppVoting\functions\api\posts\create.ts`:

[See full updated file in FEDIFY_REFACTOR_PLAN.md - Section 4.2]

**Key Changes**:
1. Import `FedifyUriGenerator`, `getDomainFromRequest`
2. Generate ActivityPub URIs for posts
3. Store URIs in database
4. Create `activitypub_post_mapping` entries
5. Call `publishPostToFollowers` for public posts

---

## Phase 5: Update Interactions (45 minutes)

### Step 5.1: Update Like Handler

Update `C:\Users\aaron\Documents\MitobyteAppVoting\functions\api\posts\like.ts`:

[See full updated file in FEDIFY_REFACTOR_PLAN.md - Section 5.1]

### Step 5.2: Update Boost Handler

Update `C:\Users\aaron\Documents\MitobyteAppVoting\functions\api\posts\boost.ts`:

[See full updated file in FEDIFY_REFACTOR_PLAN.md - Section 5.2]

---

## Phase 6: Queue Processing (20 minutes)

### Step 6.1: Create Queue Consumer

Create `C:\Users\aaron\Documents\MitobyteAppVoting\functions\queue-consumer.ts`:

```typescript
import type { Message } from '@fedify/fedify';
import { createFederationInstance, type FederationEnv } from './federation/config';

export const queue = async (
  batch: MessageBatch<Message>,
  env: FederationEnv
): Promise<void> => {
  const federation = createFederationInstance(env);

  for (const message of batch.messages) {
    try {
      await federation.processQueuedTask(message.body as Message, env);
      message.ack();
    } catch (error) {
      console.error('Error processing queue message:', error);
      message.retry();
    }
  }
};
```

### Step 6.2: Configure Queue in Dashboard

1. Go to Cloudflare Dashboard
2. Navigate to Pages > Your Project > Settings > Functions
3. Click "Add binding"
4. Type: Queue Consumer
5. Queue name: `mitobyte-federation-queue`
6. Save

---

## Phase 7: Testing (60 minutes)

### Step 7.1: Local Testing

```bash
# Start dev server
npm run pages:dev

# Test WebFinger
curl "http://localhost:8788/.well-known/webfinger?resource=acct:test@localhost:8788"

# Test Actor
curl -H "Accept: application/activity+json" "http://localhost:8788/users/test@example.com"

# Test NodeInfo
curl "http://localhost:8788/.well-known/nodeinfo"
```

### Step 7.2: Deploy to Production

```bash
# Build
npm run build

# Deploy
npm run pages:deploy
```

### Step 7.3: Test with Mastodon

1. Open Mastodon instance
2. Search: `@youremail@yourdomain.com`
3. Click Follow
4. Create a post on your platform
5. Verify it appears in Mastodon timeline
6. Like/boost from Mastodon
7. Verify interactions appear in your database

---

## Verification Checklist

After implementation, verify:

- [ ] WebFinger responds with actor information
- [ ] Actor profile loads in Mastodon
- [ ] Can follow users from Mastodon
- [ ] Follows are recorded in `activitypub_followers`
- [ ] Creating post generates ActivityPub URI
- [ ] Posts federate to Mastodon followers
- [ ] Likes from platform federate to Mastodon
- [ ] Likes from Mastodon appear in database
- [ ] Boosts from platform federate to Mastodon
- [ ] Boosts from Mastodon appear in database
- [ ] Replies maintain conversation threading
- [ ] Remote posts are stored correctly

---

## Troubleshooting

### WebFinger Returns 404
**Fix**: Verify federation path handler in `functions/federation/[[path]].ts` includes `/.well-known/webfinger`

### Posts Don't Federate
**Fix**:
1. Check queue is processing: Dashboard > Queues
2. Verify actor has keys: `SELECT * FROM activitypub_actor_keys WHERE user_email = ?`
3. Check followers exist: `SELECT * FROM activitypub_followers WHERE user_email = ?`

### Signature Verification Fails
**Fix**:
1. Verify keys are generated: Check `activitypub_actor_keys` table
2. Ensure `setActorKeyPairsDispatcher` is configured
3. Check keyId format matches actor URI + `#main-key`

### Queue Messages Not Processing
**Fix**:
1. Verify queue consumer is configured in Dashboard
2. Check bindings in `wrangler.toml`
3. Review queue consumer logs in Dashboard

---

## Next Actions After Implementation

1. **Test thoroughly** with at least 3 different Mastodon instances
2. **Monitor** queue processing and error rates
3. **Implement** rate limiting for production
4. **Add** user-facing federation settings UI
5. **Create** admin dashboard for federation metrics
6. **Document** for end users how to use federation features

---

## Time Estimate

- Phase 1 (Database): 30 minutes
- Phase 2 (Utilities): 45 minutes
- Phase 3 (Config): 60 minutes
- Phase 4 (Posts): 30 minutes
- Phase 5 (Interactions): 45 minutes
- Phase 6 (Queue): 20 minutes
- Phase 7 (Testing): 60 minutes

**Total**: ~4.5 hours for full implementation

---

## Key Files Modified

1. `migrations/0024_fedify_schema_enhancements.sql` - New
2. `functions/federation/uris.ts` - New
3. `functions/federation/keys.ts` - New
4. `functions/federation/config.ts` - Enhanced
5. `functions/api/posts/create.ts` - Enhanced
6. `functions/api/posts/like.ts` - Enhanced
7. `functions/api/posts/boost.ts` - Enhanced
8. `functions/queue-consumer.ts` - New

---

**Ready to implement? Start with Phase 1 and proceed sequentially.**
