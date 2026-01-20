# Cloudflare Pages Deployment Checklist

## ✅ Pre-Deployment (Ready)

- [x] Build configuration optimized (vite.config.js)
- [x] Code splitting enabled (React, Framer Motion, Crossmint in separate chunks)
- [x] PWA configured with 10 MB cache limit
- [x] Pages Functions created in `functions/` directory
- [x] API routes configured:
  - `GET /api/health`
  - `POST /api/users`
  - `GET /api/users/:wallet`
  - `PUT /api/users/:wallet`
  - `DELETE /api/users/:wallet`
- [x] D1 database schema ready (`migrations/0001_create_users.sql`)
- [x] Encryption utilities implemented
- [x] Documentation complete (DEPLOY.md, README.md)

## 🚀 Deployment Steps

### 1. Generate Encryption Key
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
**Save this key securely!** You'll need it in step 4.

### 2. Run Database Migration
```bash
npm run db:migrate
```

### 3. Deploy to Cloudflare Pages
```bash
npx wrangler pages deploy dist --project-name=mitobyte-voting
```

### 4. Set Encryption Key Secret
```bash
npx wrangler pages secret put WALLET_ENCRYPTION_KEY --project-name=mitobyte-voting
```
Paste the key from step 1 when prompted.

### 5. Bind D1 Database (via Dashboard)
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages
2. Select your project: `mitobyte-voting`
3. Go to **Settings** → **Functions**
4. Scroll to **D1 database bindings**
5. Click **Add binding**:
   - **Variable name**: `DB`
   - **D1 database**: `mitobyte-users`
6. Click **Save**

### 6. Redeploy (to apply D1 binding)
```bash
npm run pages:deploy
```

## 🧪 Testing After Deployment

### Test Health Endpoint
```bash
curl https://mitobyte-voting.pages.dev/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"2025-..."}
```

### Test User Creation
```bash
curl -X POST https://mitobyte-voting.pages.dev/api/users \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0xTEST123","displayName":"Test User"}'
```

### Test User Retrieval
```bash
curl https://mitobyte-voting.pages.dev/api/users/0xTEST123
```

## 📊 Build Stats (Current)

- **Total Build Size**: ~5.7 MB precached
- **Largest Chunk**: Crossmint SDK (5 MB)
- **Code Split**: 3 main chunks (react, framer-motion, crossmint)
- **Build Time**: ~27 seconds

## 🔧 Optimization Notes

The Crossmint SDK is the largest dependency (5 MB). Consider:
- **Lazy loading**: Only load when authentication is needed
- **Dynamic imports**: `const Crossmint = await import('@crossmint/client-sdk-react-ui')`
- **Alternative**: Use lighter auth libraries if Crossmint features aren't fully needed

## 🌐 Production URLs

After deployment:
- **App**: `https://mitobyte-voting.pages.dev`
- **API**: `https://mitobyte-voting.pages.dev/api/*`
- **Custom domain** (optional): Configure in Cloudflare Pages dashboard

## 🔑 Environment Variables

**Production (set via Wrangler or Dashboard):**
- `WALLET_ENCRYPTION_KEY` - 64-character hex key (secret)

**Development (.dev.vars file):**
```
WALLET_ENCRYPTION_KEY=your-local-dev-key-here
```

## 📝 Next Steps After Deployment

1. Test all API endpoints
2. Integrate with Crossmint authentication in frontend
3. Set up custom domain (optional)
4. Configure analytics (optional)
5. Set up staging environment (optional)

## 🆘 Troubleshooting

### Build fails with PWA errors
- Already fixed: `maximumFileSizeToCacheInBytes` set to 10 MB

### Functions return 404
- Check D1 binding is configured in Cloudflare dashboard
- Verify redeploy after adding binding

### Encryption errors
- Ensure `WALLET_ENCRYPTION_KEY` is set as secret
- Verify key is 64-character hex string

### Database not found
- Run migration: `npm run db:migrate`
- Check `database_id` in wrangler.toml matches your D1 database

---

**Ready to deploy!** Follow steps 1-6 above.
