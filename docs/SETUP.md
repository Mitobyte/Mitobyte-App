# User Database Setup Guide

## Overview
This project now includes a Cloudflare D1 database for user management with encrypted wallet addresses.

## Database Structure
```sql
users (
  id INTEGER PRIMARY KEY,
  wallet_hash TEXT UNIQUE,      -- SHA-256 hash for lookups
  wallet_encrypted TEXT,         -- AES-256-GCM encrypted wallet
  email TEXT,
  display_name TEXT,
  created_at TEXT
)
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Login to Cloudflare
```bash
npx wrangler login
```

### 3. Create D1 Database
```bash
npx wrangler d1 create mitobyte-users
```

Copy the `database_id` from the output and update `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "mitobyte-users"
database_id = "your-database-id-here"
```

### 4. Generate Encryption Key
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Set Encryption Key Secret
```bash
npx wrangler secret put WALLET_ENCRYPTION_KEY
# Paste the key from step 4
```

### 6. Run Database Migration
```bash
# For production
npm run db:migrate

# For local development
npm run db:migrate:local
```

## Running the API

### Development
```bash
npm run worker:dev
```
API will be available at `http://localhost:8787`

### Deploy to Production
```bash
npm run worker:deploy
```

## API Endpoints

### Create User
```bash
POST /api/users
Content-Type: application/json

{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "email": "user@example.com",
  "displayName": "John Doe"
}
```

### Get User
```bash
GET /api/users/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

### Update User
```bash
PUT /api/users/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
Content-Type: application/json

{
  "email": "newemail@example.com",
  "displayName": "Jane Doe"
}
```

### Delete User
```bash
DELETE /api/users/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

## Security Features

- **Wallet Encryption**: Wallet addresses encrypted with AES-256-GCM
- **Hash Lookups**: SHA-256 hashes for efficient, private lookups
- **Decentralized Storage**: Only encrypted data stored in database
- **Secret Management**: Encryption key stored securely via Wrangler secrets

## Testing Locally

```bash
# Terminal 1: Run worker
npm run worker:dev

# Terminal 2: Test endpoints
curl -X POST http://localhost:8787/api/users \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0xABC123","displayName":"Test User"}'
```

## Project Structure
```
├── migrations/
│   └── 0001_create_users.sql    # Database schema
├── worker/
│   ├── index.js                  # API endpoints
│   └── utils/
│       └── encryption.js         # Wallet encryption utilities
└── wrangler.toml                 # Cloudflare Worker config
```

## Next Steps
1. Install wrangler: `npm install`
2. Set up D1 database (steps 2-6 above)
3. Test locally with `npm run worker:dev`
4. Deploy with `npm run worker:deploy`
