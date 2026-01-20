# Cloudflare Pages Deployment Guide

## Overview
This application deploys to Cloudflare Pages with integrated Functions for the user API. The frontend and backend run on the same domain.

## Architecture
- **Frontend**: React SPA built with Vite → `dist/`
- **Backend API**: Pages Functions → `functions/` directory
- **Database**: Cloudflare D1 (SQLite)
- **Hosting**: Cloudflare Pages

## Prerequisites
1. Cloudflare account
2. Node.js installed
3. Wrangler CLI (`npm install`)

## Initial Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Login to Cloudflare
```bash
npx wrangler login
```

### 3. Create D1 Database
The database is already created with ID in `wrangler.toml`. If you need to create a new one:

```bash
npx wrangler d1 create mitobyte-users
```

Update `wrangler.toml` with the new `database_id`.

### 4. Run Database Migration
```bash
# Production database
npm run db:migrate

# Local database (for testing)
npm run db:migrate:local
```

### 5. Generate Encryption Key
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output (64-character hex string).

## Deployment

### Option 1: Deploy via CLI (Recommended)

#### First-time Deployment
```bash
# Build the app
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name=mitobyte-voting

# Set the encryption key secret
npx wrangler pages secret put WALLET_ENCRYPTION_KEY --project-name=mitobyte-voting
# Paste your 64-character hex key when prompted

# Bind D1 database to the project
npx wrangler pages deployment create --project-name=mitobyte-voting --d1 DB=mitobyte-users
```

#### Future Deployments
```bash
npm run pages:deploy
```

### Option 2: Deploy via GitHub (Automatic)

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

2. **Connect to Cloudflare Pages**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages
   - Click "Create a project" → "Connect to Git"
   - Select your repository
   - Configure build settings:
     - **Build command**: `npm run build`
     - **Build output directory**: `dist`
     - **Root directory**: `/`

3. **Add D1 Database Binding**
   - In Pages project settings → Functions
   - Add D1 database binding:
     - Variable name: `DB`
     - D1 database: `mitobyte-users`

4. **Set Environment Variables**
   - In Pages project settings → Environment variables
   - Add secret: `WALLET_ENCRYPTION_KEY`
   - Paste your 64-character hex key

5. **Deploy**
   - Every push to main will automatically deploy

## Local Development

### Development Workflow

1. **Start Vite dev server** (Terminal 1):
```bash
npm run dev
```
Frontend runs at `http://localhost:5173`

2. **Build and run Pages Functions** (Terminal 2):
```bash
# Build the app first
npm run build

# Run Pages Functions with D1
npm run pages:dev
```
Functions run at `http://localhost:8788/api/*`

**Note**: For local development, you'll need to update `VITE_API_URL` to point to the Pages dev server:

```env
# .env.local
VITE_API_URL=http://localhost:8788
```

Or use `wrangler pages dev` in proxy mode:
```bash
# Terminal 1: Build and watch
npm run build -- --watch

# Terminal 2: Run Pages dev server (proxies to Vite)
npx wrangler pages dev dist --live-reload --proxy=5173
```

## Testing the API

### Local Testing
```bash
# Health check
curl http://localhost:8788/api/health

# Create user
curl -X POST http://localhost:8788/api/users \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0xABC123","displayName":"Test User"}'

# Get user
curl http://localhost:8788/api/users/0xABC123

# Update user
curl -X PUT http://localhost:8788/api/users/0xABC123 \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Delete user
curl -X DELETE http://localhost:8788/api/users/0xABC123
```

### Production Testing
Replace `http://localhost:8788` with your Pages URL: `https://mitobyte-voting.pages.dev`

## Project Structure
```
├── dist/                          # Vite build output (Pages static files)
├── functions/                     # Pages Functions (API backend)
│   ├── _middleware.js            # CORS middleware
│   ├── api/
│   │   ├── health.js             # GET /api/health
│   │   ├── users.js              # POST /api/users
│   │   └── users/
│   │       └── [wallet].js       # GET/PUT/DELETE /api/users/:wallet
│   └── utils/
│       └── encryption.js         # Wallet encryption utilities
├── migrations/
│   └── 0001_create_users.sql    # D1 database schema
├── src/                          # React frontend source
│   └── services/
│       └── userApi.js            # API client
└── wrangler.toml                 # Cloudflare configuration
```

## API Endpoints

All endpoints are served from the same domain as the frontend:

- `GET /api/health` - Health check
- `POST /api/users` - Create user
- `GET /api/users/:wallet` - Get user by wallet
- `PUT /api/users/:wallet` - Update user
- `DELETE /api/users/:wallet` - Delete user

## Environment Variables

### Development (.env.local)
```env
VITE_API_URL=http://localhost:8788
```

### Production
Set via Cloudflare Pages dashboard or CLI:
```bash
npx wrangler pages secret put WALLET_ENCRYPTION_KEY --project-name=mitobyte-voting
```

## Database Management

### View Local Database
```bash
npx wrangler d1 execute mitobyte-users --local --command "SELECT * FROM users"
```

### View Production Database
```bash
npx wrangler d1 execute mitobyte-users --command "SELECT * FROM users"
```

### Backup Database
```bash
npx wrangler d1 export mitobyte-users --output backup.sql
```

## Troubleshooting

### Functions not working locally
- Ensure you've built the app: `npm run build`
- Check D1 binding: `npm run pages:dev` includes `--d1 DB=mitobyte-users`
- Verify encryption key is set for local testing (use `.dev.vars` file)

### Create .dev.vars for local secrets
```bash
# .dev.vars (not committed to git)
WALLET_ENCRYPTION_KEY=your-64-character-hex-key
```

### CORS issues
- Check `functions/_middleware.js` is present
- Verify CORS headers are set correctly

### Database not found
- Verify D1 binding in Cloudflare Pages settings
- Check `database_id` in `wrangler.toml` is correct
- Ensure migration has been run

## Next Steps

1. ✅ Deploy frontend and functions to Pages
2. ✅ Set encryption key secret
3. ✅ Bind D1 database
4. ✅ Run database migration
5. Test API endpoints
6. Integrate with Crossmint authentication
7. Set up custom domain (optional)

## Useful Commands

```bash
# Development
npm run dev                    # Start Vite dev server
npm run pages:dev             # Run Pages Functions locally

# Build & Deploy
npm run build                 # Build frontend
npm run pages:deploy          # Build and deploy to Pages

# Database
npm run db:migrate            # Run migration (production)
npm run db:migrate:local      # Run migration (local)

# Testing
curl http://localhost:8788/api/health
```

## Custom Domain Setup

1. Go to Cloudflare Pages → Your project → Custom domains
2. Add your domain
3. Cloudflare will automatically configure DNS
4. SSL certificate is provisioned automatically

Your API will be available at `https://yourdomain.com/api/*`
