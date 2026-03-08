# Mitobyte Setup & Deployment Guide

## Architecture Overview

Mitobyte is a full-stack application built entirely on Cloudflare's edge computing platform:

```
┌─────────────────────────────────────────────────────┐
│                  Cloudflare Pages                    │
│                                                     │
│   ┌──────────────┐      ┌───────────────────────┐   │
│   │  React SPA   │      │   Pages Functions     │   │
│   │  (Vite PWA)  │ ───▶ │   (API + Federation)  │   │
│   └──────────────┘      └───────────┬───────────┘   │
└────────────────────────────────────-│───────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
        ┌─────▼──────┐        ┌───────▼──────┐      ┌────────▼───────┐
        │  D1 (SQLite)│        │  Workers AI  │      │  KV + Queues   │
        │  mitobyte-  │        │  Llama 3.1   │      │  (Federation)  │
        │    users    │        │  BGE Embed   │      │                │
        └─────────────┘        └──────────────┘      └────────────────┘
```

**Platform:** Cloudflare Pages + Functions
**Frontend:** React 18 SPA, built with Vite, deployed as a PWA
**Backend:** Cloudflare Pages Functions (file-based routing in `functions/`)
**Database:** Cloudflare D1 (SQLite at the edge)
**AI:** Cloudflare Workers AI
**Federation:** ActivityPub via Fedify, backed by KV + Queues
**Email:** Cloudflare Email Worker binding
**Scheduled Jobs:** Cloudflare Cron Triggers

---

## Cloudflare Services & Bindings

### D1 Database — `DB`

Single D1 SQLite database (`mitobyte-users`) stores all application data:

- **Users & profiles** — auth, display info, skills, social links, visibility settings
- **Events** — RSVP, check-ins, analytics, form templates
- **Posts & social** — feed, likes, boosts, comments
- **ActivityPub tables** — actors, followers, activities, keys, remote posts
- **Platform features** — announcements, badges, hackathon teams/submissions, sponsorships

Schema is managed via numbered SQL migration files in `migrations/`. Over 55 migrations exist. Always run new migrations before deploying code that depends on them.

```toml
# wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "mitobyte-users"
database_id = "28813de3-b100-45a8-a993-53a67739e25d"
```

### Workers AI — `AI`

Used for natural language features:
- **Member search** (`/api/community/ai-search.ts`) — `@cf/meta/llama-3.1-8b-instruct`
- **Form parsing** (`/api/forms/parse-natural-language.js`) — `@cf/meta/llama-3.1-8b-instruct`
- **Post refinement** (`/api/posts/refine.ts`) — `@cf/meta/llama-3.1-8b-instruct`
- **Embeddings** (`functions/utils/ai.js`) — `@cf/baai/bge-base-en-v1.5` (infrastructure present, not actively used)

### KV Namespace — `FEDERATION_KV`

Stores ActivityPub federation state and caches remote actor data for the Fedify integration.

```toml
# wrangler.toml
[[kv_namespaces]]
binding = "FEDERATION_KV"
id = "b38ff4e99f374151b2632e3febe32786"           # production
preview_id = "f5b4cdb8d2dc4d13b0441becc099ca3b"  # development
```

### Queues — `FEDERATION_QUEUE`

Async delivery of ActivityPub activities (outbound federation). Uses a producer/consumer pattern:

- **Producer:** bound in `wrangler.toml` as `FEDERATION_QUEUE`
- **Consumer:** must be configured in Cloudflare Dashboard (Pages does not support consumer config in `wrangler.toml`)
- Dead letter queues: `mitobyte-federation-dlq` (dev) / `mitobyte-federation-dlq-prod` (prod)

**Dashboard config required** (Pages > Settings > Functions > Queue Consumers):
- Max batch size: 10
- Max batch timeout: 30s
- Max retries: 3

### Email Binding — `EMAIL_SENDER`

Cloudflare Email Workers binding for transactional email. Must be added via Dashboard — not configurable in `wrangler.toml` for Pages projects.

**Dashboard config** (Pages > Settings > Functions > Bindings):
- Binding name: `EMAIL_SENDER`
- Variables: `SENDER_EMAIL=noreply@mitobyte.com`, `SENDER_NAME=Mitobyte`

### Cron Triggers

Handled by `functions/_scheduled.js`. Must be configured via Dashboard for Pages projects.

| Trigger | Schedule | Purpose |
|---|---|---|
| Daily digest | `0 9 * * *` | Send daily activity emails |
| Weekly digest | `0 9 * * 1` | Send weekly summary emails |
| Vote reminders | `0 */6 * * *` | Deadline reminder checks |

---

## Functions Structure

```
functions/
├── _middleware.js          # CORS (allow all origins)
├── _scheduled.js           # Cron handler (email digests)
├── [[path]].ts             # Catch-all ActivityPub federation router
├── federation/
│   ├── config.ts           # Fedify setup, actor/activity handlers
│   ├── keys.ts             # RSA key pair management for HTTP signatures
│   ├── queue-worker.ts     # Queue consumer for inbound federation activities
│   ├── uris.ts             # URI generation for actors/posts/collections
│   └── utils.ts            # Federation helpers
├── api/
│   ├── auth/               # Login, register, verify, token refresh
│   ├── admin/              # User management, announcements, API keys
│   ├── community/          # Members, polls, AI search, challenges, stats
│   ├── events/             # Event CRUD, analytics, attendees, AI search
│   ├── posts/              # Feed, create, like, boost, refine
│   ├── federation/         # Follow/unfollow, publishing settings
│   ├── email/              # Digest triggers, event notifications
│   └── ...                 # Bingo, badges, hackathon, forms, sponsorships
└── utils/
    ├── auth.js / jwt.js    # JWT helpers
    ├── email.js            # Email template rendering
    ├── encryption.js       # AES-256-GCM wallet encryption
    ├── webPush.js          # Web push notifications
    ├── adminAuth.js        # Admin role verification
    ├── apiKeyAuth.js       # API key authentication
    ├── ai.js               # Embedding utilities (inactive)
    └── replyke.js          # Replyke social integration
```

---

## ActivityPub / Federation

The app federates with the Fediverse using [Fedify](https://fedify.dev/) backed by D1 + KV + Queues.

**Federation endpoints** (served by `[[path]].ts` catch-all):
- `/.well-known/webfinger` — User discovery
- `/.well-known/nodeinfo` / `/nodeinfo/2.1` — Server metadata
- `/users/{handle}` — Actor profiles
- `/users/{handle}/inbox` — Inbound activities
- `/users/{handle}/outbox` — Published activities
- `/users/{handle}/followers` / `/following` — Collections
- `/posts/{id}` — Note objects

**Supported activity types:** Create, Follow, Undo (Unfollow), Like, Announce, Accept

**HTTP Signatures:** RSA key pairs per user stored in `activitypub_actor_keys` (D1). Key generation happens on first federation action.

**Async delivery:** Outbound activities enqueue to `FEDERATION_QUEUE` → processed by `queue-worker.ts` consumer.

---

## Environment Variables

| Variable | Where set | Purpose |
|---|---|---|
| `VITE_API_URL` | `.env` | API base URL for frontend |
| `JWT_SECRET` | Wrangler secret | JWT signing (64-char hex) |
| `WALLET_ENCRYPTION_KEY` | Wrangler secret | AES-256-GCM key for wallet encryption |
| `VITE_REPLYKE_PROJECT_ID` | `.env` | Replyke social integration |
| `SENDER_EMAIL` | Dashboard binding | From address for email |
| `SENDER_NAME` | Dashboard binding | Display name for email |
| `ENVIRONMENT` | Dashboard variable | `production` flag |

Set secrets with:
```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put WALLET_ENCRYPTION_KEY
```

---

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

> **Note:** `vite-plugin-pwa` requires `^0.21.x` for Vite 6 compatibility. The minimum supported version for Vite 6 is `0.21.0`.

### 2. Login to Cloudflare

```bash
npx wrangler login
```

### 3. Create D1 Database

```bash
npx wrangler d1 create mitobyte-users
```

Copy the `database_id` and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "mitobyte-users"
database_id = "<your-database-id>"
```

### 4. Create KV Namespace

```bash
npx wrangler kv:namespace create FEDERATION_KV
npx wrangler kv:namespace create FEDERATION_KV --preview
```

Update `wrangler.toml` with the returned IDs.

### 5. Create Queues

```bash
npx wrangler queues create mitobyte-federation-queue
npx wrangler queues create mitobyte-federation-dlq
# For production
npx wrangler queues create mitobyte-federation-queue-prod
npx wrangler queues create mitobyte-federation-dlq-prod
```

### 6. Set Secrets

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npx wrangler secret put JWT_SECRET

# Generate wallet encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npx wrangler secret put WALLET_ENCRYPTION_KEY
```

### 7. Run Database Migrations

```bash
# Production
npm run db:migrate

# Local
npm run db:migrate:local
```

For subsequent migrations, run each new SQL file directly:
```bash
npx wrangler d1 execute mitobyte-users --file=./migrations/<file>.sql
npx wrangler d1 execute mitobyte-users --local --file=./migrations/<file>.sql
```

---

## Development

```bash
# Frontend only (proxies API to production Pages)
npm run dev

# Full local stack (builds first, then runs Pages dev with D1)
npm run dev:full

# Local Pages Functions with D1 (no rebuild)
npm run pages:dev
```

The Vite dev server proxies API and federation requests to `https://mitobyte-voting.pages.dev` by default. For local Pages dev, D1 is bound via `--d1 DB=mitobyte-users`.

---

## Deployment

### Build & Deploy

```bash
npm run pages:deploy
# equivalent to: npm run build && wrangler pages deploy dist --project-name=mitobyte-voting
```

### Post-Deploy Dashboard Configuration

These bindings cannot be set in `wrangler.toml` for Pages projects and must be configured in the Cloudflare Dashboard under **Pages > mitobyte-voting > Settings > Functions**:

1. **D1 Database binding** — `DB` → `mitobyte-users`
2. **KV Namespace binding** — `FEDERATION_KV` → production namespace ID
3. **Queue Producer binding** — `FEDERATION_QUEUE` → `mitobyte-federation-queue-prod`
4. **Queue Consumer** — configure consumer on `mitobyte-federation-queue-prod` (batch size 10, timeout 30s, retries 3)
5. **Email binding** — `EMAIL_SENDER` with sender address
6. **Cron Triggers** — add schedules for digest and reminder jobs
7. **Environment variables** — `SENDER_EMAIL`, `SENDER_NAME`, `ENVIRONMENT=production`

### Secrets

Secrets set via `wrangler secret put` apply to the Workers/Pages project and are available at runtime. Verify they are set:

```bash
npx wrangler secret list
```

---

## Database Schema

The schema evolves via sequential migrations (`migrations/0001_*.sql` through `migrations/005X_*.sql`). Key table groups:

| Group | Tables |
|---|---|
| Auth & users | `users`, `user_profiles`, `refresh_tokens` |
| Events | `events`, `rsvps`, `checkins`, `event_analytics` |
| Social | `posts`, `comments`, `likes`, `follows`, `boosts` |
| ActivityPub | `activitypub_actors`, `activitypub_followers`, `activitypub_following`, `activitypub_activities`, `activitypub_actor_keys`, `activitypub_likes`, `activitypub_shares`, `activitypub_remote_posts` |
| Platform | `announcements`, `badges`, `form_templates`, `form_responses`, `hackathon_teams`, `hackathon_submissions`, `sponsorships` |

---

## Security

- **Wallet storage:** Addresses are hashed (SHA-256) for lookups; raw addresses are AES-256-GCM encrypted at rest
- **Auth:** Short-lived JWTs + refresh token rotation
- **Federation:** HTTP signatures (RSA) on all outbound activities, verified on inbound
- **Admin routes:** Verified via `adminAuth.js` middleware checking `is_admin` claim in JWT
- **API keys:** Separate key-based auth for external integrations via `apiKeyAuth.js`
- **CORS:** Currently open (`*`) — restrict in `_middleware.js` if needed for production hardening

---

## PWA Configuration

The service worker uses Workbox's `injectManifest` strategy, configured in `vite.config.js`:
- Cache size limit: 10 MB
- Chunk size warning: 1000 KB
- Separate chunks for React, Framer Motion, and Crossmint SDK

Updated `vite-plugin-pwa` to `^0.21.2` for Vite 6 compatibility (previous `^0.14.x` only supported Vite 3/4).
