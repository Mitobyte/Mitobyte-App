# Fedify Implementation - File Changes Overview

## Files You'll Create/Modify

This document shows exactly which files you need to create or modify, organized by priority.

---

## 🆕 New Files to Create

### Migration
```
migrations/
└── 0024_fedify_schema_enhancements.sql ⭐ PRIORITY 1
    Purpose: Add tables and columns for federation
    Lines: ~60
    Time: 5 minutes to create, 2 minutes to run
```

### Utility Files
```
functions/federation/
├── uris.ts ⭐ PRIORITY 2
│   Purpose: URI generation and parsing
│   Lines: ~150
│   Time: 10 minutes
│
└── keys.ts ⭐ PRIORITY 3
    Purpose: Actor key management for HTTP signatures
    Lines: ~80
    Time: 10 minutes
```

### Queue Consumer
```
functions/
└── queue-consumer.ts ⭐ PRIORITY 6
    Purpose: Process federated activities from queue
    Lines: ~25
    Time: 5 minutes
    Note: Must configure in Cloudflare Dashboard
```

---

## ✏️ Files to Modify

### Federation Configuration
```
functions/federation/
└── config.ts ⭐ PRIORITY 4
    Current: ~292 lines (basic setup)
    Changes:
      1. Add imports (uris, keys, Note, Image, Document)
      2. Enhance actor dispatcher (add keys)
      3. Add key pairs dispatcher
      4. Add WebFinger mapping
      5. Add object dispatcher for posts
      6. Add NodeInfo dispatcher
      7. Enhance inbox listeners
    New lines: ~350
    Time: 45 minutes
```

### Post API Endpoints
```
functions/api/posts/
├── create.ts ⭐ PRIORITY 5
│   Current: ~116 lines
│   Changes:
│     1. Import uris utilities
│     2. Generate ActivityPub URIs
│     3. Store URIs in database
│     4. Create post mapping
│     5. Call federation publish
│   New lines: ~150
│   Time: 20 minutes
│
├── like.ts ⭐ PRIORITY 7
│   Current: ~75 lines
│   Changes:
│     1. Import federation utilities
│     2. Send Like/Undo activities
│     3. Handle federation errors
│   New lines: ~120
│   Time: 15 minutes
│
└── boost.ts ⭐ PRIORITY 8
    Current: ~75 lines
    Changes:
      1. Import federation utilities
      2. Send Announce/Undo activities
      3. Handle federation errors
    New lines: ~130
    Time: 15 minutes
```

---

## 📊 Change Summary by File

| File | Status | Lines Before | Lines After | Complexity |
|------|--------|--------------|-------------|------------|
| `0024_fedify_schema_enhancements.sql` | NEW | 0 | 60 | Low |
| `functions/federation/uris.ts` | NEW | 0 | 150 | Low |
| `functions/federation/keys.ts` | NEW | 0 | 80 | Medium |
| `functions/federation/config.ts` | MODIFY | 292 | 350 | Medium |
| `functions/api/posts/create.ts` | MODIFY | 116 | 150 | Low |
| `functions/api/posts/like.ts` | MODIFY | 75 | 120 | Low |
| `functions/api/posts/boost.ts` | MODIFY | 75 | 130 | Low |
| `functions/queue-consumer.ts` | NEW | 0 | 25 | Low |

**Total New Code**: ~800 lines
**Total Modified Code**: ~350 lines (58 lines added to config.ts)

---

## 🔄 Dependency Chain

```
Phase 1: Database
└── 0024_fedify_schema_enhancements.sql
    ↓ (enables)
    Phase 2: Utilities
    ├── functions/federation/uris.ts
    └── functions/federation/keys.ts
        ↓ (enables)
        Phase 3: Federation Config
        └── functions/federation/config.ts (enhanced)
            ↓ (enables)
            Phase 4: API Endpoints
            ├── functions/api/posts/create.ts
            ├── functions/api/posts/like.ts
            └── functions/api/posts/boost.ts
                ↓ (enables)
                Phase 5: Queue Processing
                └── functions/queue-consumer.ts
```

**Key Insight**: You must complete files in order. Each phase depends on the previous one.

---

## 📝 Detailed File Modifications

### 1. functions/federation/config.ts

#### Section 1: Imports (Lines 1-15)
**ADD** these imports:
```typescript
import { Note, Image, Document, Create } from "@fedify/fedify";
import { getOrCreateActorKeys } from './keys';
import { FedifyUriGenerator } from './uris';
```

#### Section 2: Actor Dispatcher (Lines ~28-54)
**REPLACE** existing `setActorDispatcher` with enhanced version
- Add key generation
- Add publicKey property
- Add endpoints

#### Section 3: Key Pairs Dispatcher (NEW - After actor dispatcher)
**ADD** new dispatcher:
```typescript
federation.setActorKeyPairsDispatcher(async (ctx, handle) => {
  // ... key pairs logic
});
```

#### Section 4: WebFinger Mapping (NEW - After key pairs)
**ADD** new mapping:
```typescript
federation.mapHandle(async (ctx, username) => {
  // ... handle mapping logic
});
```

#### Section 5: Object Dispatcher (NEW - After WebFinger)
**ADD** post object dispatcher:
```typescript
federation.setObjectDispatcher(Note, "/posts/{id}", async (ctx, values) => {
  // ... post object logic
});
```

#### Section 6: NodeInfo Dispatcher (NEW - After object dispatcher)
**ADD** NodeInfo:
```typescript
federation.setNodeInfoDispatcher("/nodeinfo/2.1", async (ctx) => {
  // ... nodeinfo logic
});
```

#### Section 7: Inbox Listeners (Lines ~58-174)
**ENHANCE** existing inbox listeners:
- Add `Create` handler for incoming posts
- Keep existing handlers (Follow, Undo, Like, Announce)

---

### 2. functions/api/posts/create.ts

#### Section 1: Imports (Lines 1-3)
**MODIFY** imports:
```typescript
import { publishActivity } from '../../federation/utils';
import type { FederationEnv } from '../../federation/config';
import { FedifyUriGenerator, getDomainFromRequest } from '../../federation/uris';
```

#### Section 2: Request Parsing (Lines 8)
**ADD** mediaUrl and mediaType:
```typescript
const { userEmail, content, tags, visibility = 'public', replyToId, mediaUrl, mediaType } = await request.json();
```

#### Section 3: URI Generation (NEW - After user verification)
**ADD** before post creation:
```typescript
const domain = getDomainFromRequest(request);
const uriGen = new FedifyUriGenerator(domain);

let conversationUri = null;
if (replyToId) {
  const parent = await env.DB.prepare(
    'SELECT conversation_uri, id FROM posts WHERE id = ?'
  ).bind(replyToId).first();
  conversationUri = parent?.conversation_uri || uriGen.getConversationUri(parent?.id || replyToId);
}
```

#### Section 4: Post Creation (Lines 34-37)
**MODIFY** INSERT statement:
```typescript
INSERT INTO posts (
  user_email, content, visibility, reply_to_id,
  media_url, media_type, conversation_uri, federated
)
VALUES (?, ?, ?, ?, ?, ?, ?, 1)
```

#### Section 5: URI Update (NEW - After post creation)
**ADD** after getting postId:
```typescript
const postUri = uriGen.getPostUri(postId);
const activityId = uriGen.getActivityUri('create', postId);

await env.DB.prepare(`
  UPDATE posts
  SET activitypub_uri = ?, activitypub_id = ?,
      conversation_uri = COALESCE(conversation_uri, ?)
  WHERE id = ?
`).bind(postUri, activityId, uriGen.getConversationUri(postId), postId).run();
```

#### Section 6: Post Mapping (NEW - After stats initialization)
**ADD**:
```typescript
await env.DB.prepare(`
  INSERT INTO activitypub_post_mapping (post_id, activity_id, object_uri)
  VALUES (?, ?, ?)
`).bind(postId, activityId, postUri).run();
```

#### Section 7: Federation (REPLACE - Lines 79-95)
**REPLACE** existing federation code with:
```typescript
if (visibility === 'public') {
  try {
    await publishPostToFollowers(env, postId, userEmail, domain);
  } catch (error) {
    console.error('Failed to federate post:', error);
  }
}
```

#### Section 8: Helper Function (NEW - After main function)
**ADD**:
```typescript
async function publishPostToFollowers(
  env: FederationEnv,
  postId: number,
  userEmail: string,
  domain: string
): Promise<void> {
  // ... implementation
}
```

---

### 3. functions/api/posts/like.ts

#### Section 1: Imports (Lines 1-2)
**ADD** imports:
```typescript
import { createFederationInstance } from '../../federation/config';
import { Like, Undo } from '@fedify/fedify';
import { FedifyUriGenerator, getDomainFromRequest } from '../../federation/uris';
```

#### Section 2: Initial Setup (NEW - After request parsing)
**ADD**:
```typescript
const domain = getDomainFromRequest(request);
const uriGen = new FedifyUriGenerator(domain);

const post = await env.DB.prepare(`
  SELECT p.*, u.email as author_email
  FROM posts p
  JOIN users u ON p.user_email = u.email
  WHERE p.id = ?
`).bind(postId).first();

if (!post) {
  return new Response(JSON.stringify({ error: 'Post not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

const federation = createFederationInstance(env);
```

#### Section 3: Unlike Path (Lines 24-42)
**ADD** federation logic after database update:
```typescript
if (post.federated && post.activitypub_uri) {
  try {
    // Create and send Undo Like activity
  } catch (error) {
    console.error('Failed to federate unlike:', error);
  }
}
```

#### Section 4: Like Path (Lines 44-63)
**ADD** federation logic after database update:
```typescript
if (post.federated && post.activitypub_uri) {
  try {
    // Create and send Like activity
  } catch (error) {
    console.error('Failed to federate like:', error);
  }
}
```

---

### 4. functions/api/posts/boost.ts

Similar changes to like.ts but with `Announce` instead of `Like`.

---

## 🚫 Files You DON'T Need to Modify

These files remain unchanged:

```
✅ functions/federation/utils.ts (keep as is)
✅ functions/federation/[[path]].ts (keep as is)
✅ functions/api/posts/feed.ts (keep as is)
✅ functions/api/posts/follow.ts (keep as is)
✅ src/components/social/*.jsx (keep as is)
✅ wrangler.toml (already configured)
✅ package.json (already has dependencies)
```

---

## 📦 Where to Get the Code

All complete code for new/modified files is in:
- **FEDIFY_REFACTOR_PLAN.md** (detailed implementations)
- **FEDIFY_IMPLEMENTATION_STEPS.md** (phase-by-phase code blocks)

### Quick Copy Strategy

1. **For NEW files**: Copy entire file from plan
2. **For MODIFIED files**:
   - Open existing file
   - Follow section-by-section modifications
   - Or copy entire replacement from plan

---

## ⏱️ Time Estimate per File

| File | Time to Create/Modify | Testing Time |
|------|----------------------|--------------|
| Migration SQL | 5 min | 2 min |
| uris.ts | 10 min | 5 min |
| keys.ts | 10 min | 5 min |
| config.ts | 45 min | 10 min |
| create.ts | 20 min | 10 min |
| like.ts | 15 min | 5 min |
| boost.ts | 15 min | 5 min |
| queue-consumer.ts | 5 min | 10 min |
| **TOTAL** | **2h 5min** | **52 min** |

**Grand Total**: ~3 hours of hands-on coding + 1.5 hours testing = **4.5 hours**

---

## 🎯 Implementation Order

### Session 1: Foundation (1 hour)
1. Create migration SQL (5 min)
2. Run migration (2 min)
3. Create uris.ts (10 min)
4. Create keys.ts (10 min)
5. Test utilities (10 min)
6. **Break** (23 min buffer)

### Session 2: Federation Config (1 hour)
1. Backup config.ts (1 min)
2. Modify config.ts (45 min)
3. Test endpoints (10 min)
4. **Break** (4 min buffer)

### Session 3: API Endpoints (1.5 hours)
1. Modify create.ts (20 min)
2. Test post creation (10 min)
3. Modify like.ts (15 min)
4. Test likes (5 min)
5. Modify boost.ts (15 min)
6. Test boosts (5 min)
7. **Break** (20 min buffer)

### Session 4: Queue & Testing (1 hour)
1. Create queue-consumer.ts (5 min)
2. Configure in Dashboard (10 min)
3. Deploy to production (5 min)
4. Test with Mastodon (30 min)
5. Verify all features (10 min)

**Total**: 4.5 hours split into 4 focused sessions

---

## ✅ Verification Checklist

After each file:

### After Migration
- [ ] Tables exist: `SELECT name FROM sqlite_master WHERE type='table'`
- [ ] Columns added: `PRAGMA table_info(posts)`

### After Utilities
- [ ] uris.ts exports all functions
- [ ] keys.ts can generate keys
- [ ] No TypeScript errors

### After Config
- [ ] No import errors
- [ ] Federation builds successfully
- [ ] WebFinger responds

### After API Endpoints
- [ ] Posts create with URIs
- [ ] Likes toggle correctly
- [ ] Boosts toggle correctly
- [ ] No database errors

### After Queue
- [ ] Queue consumer deployed
- [ ] Queue messages processed
- [ ] DLQ empty

---

## 🆘 If You Get Stuck

### TypeScript Errors
- Check all imports are correct
- Verify types match (FederationEnv, etc.)
- Run `npm run build` to see all errors

### Database Errors
- Verify migration ran successfully
- Check table/column names match
- Use `wrangler d1 execute` to query directly

### Federation Not Working
- Check Cloudflare logs
- Verify domain is public and HTTPS
- Test with curl first
- Check queue is processing

---

## 📋 Final Checklist Before Deploy

- [ ] All new files created
- [ ] All existing files modified
- [ ] Migration run locally
- [ ] Migration run production
- [ ] No TypeScript errors
- [ ] Local tests pass
- [ ] Git commit made
- [ ] Ready to deploy

---

**Start with**: `migrations/0024_fedify_schema_enhancements.sql`
**Work through**: Phase by phase from FEDIFY_IMPLEMENTATION_STEPS.md
**Reference**: This file for what needs to change
**Get code from**: FEDIFY_REFACTOR_PLAN.md

You're ready! 🚀
