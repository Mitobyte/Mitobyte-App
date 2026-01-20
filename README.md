# Arcade SPA PWA

A modern Single Page Application (SPA) Progressive Web App (PWA) featuring an arcade-themed design with **shadcn/ui** components and **Framer Motion** animations.

## Theme

- **Primary Color**: Arcade Blue (`oklch(0.65 0.19 240)`)
- **Secondary Color**: Arcade Orange (`oklch(0.72 0.18 45)`)
- **Dark Mode**: Full support with enhanced neon arcade aesthetics

## Features

- 📱 **Mobile-First Design** - Optimized for mobile, scales beautifully to desktop
- 🔐 **Crossmint Auth** - Email & social login with embedded Web3 wallets
- 🗄️ **User Database** - Cloudflare D1 with encrypted wallet storage
- 🌐 **API Backend** - Pages Functions for serverless endpoints
- 🔔 **Push Notifications** - OneSignal integration with iOS, Android, and Desktop support
- 📧 **Email Reminders** - Cloudflare Email Workers for event notifications
- ⚡ **Vite** - Fast build tool and dev server
- ⚛️ **React 18** - Latest React features
- 🎨 **shadcn/ui** - Beautiful, accessible component library
- 🎬 **Framer Motion** - Smooth, performant animations
- 💼 **Mitobyte Brand** - Blue and orange theme with OKLCH color space
- 📱 **PWA Ready** - Installable, offline-capable, works on all devices
- 🌓 **Dark Mode** - Toggle between light and dark themes
- 🎯 **Tailwind CSS** - Utility-first CSS framework
- 👆 **Touch-Optimized** - 44px+ touch targets, smooth gestures
- 📐 **Responsive Carousel** - Single-slide minimalist benefit showcase

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Crossmint (Required for Login)

Create a `.env.local` file in the project root:

```bash
VITE_CROSSMINT_API_KEY=your_crossmint_api_key_here
```

Get your API key from [console.crossmint.com](https://console.crossmint.com/)

📖 **See [CROSSMINT_SETUP.md](./CROSSMINT_SETUP.md) for detailed setup instructions**

### 3. Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to see the app in action.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Responsive Breakpoints

The app uses Tailwind's default breakpoints with mobile-first approach:

- **Base (Mobile)**: < 640px - Single column, stacked layout
- **sm (Small tablets)**: ≥ 640px - Two columns, refined spacing
- **md (Tablets)**: ≥ 768px - Enhanced text sizes, improved layout
- **lg (Desktop)**: ≥ 1024px - Three columns, maximum spacing
- **xl (Large screens)**: ≥ 1280px - Full desktop experience

## Project Structure

```
src/
├── components/
│   └── ui/          # shadcn/ui components (mobile-optimized)
│       ├── button.jsx
│       ├── card.jsx
│       ├── input.jsx
│       └── badge.jsx
├── lib/
│   └── utils.js     # Utility functions (cn)
├── App.jsx          # Main app component (responsive)
├── main.jsx         # Entry point
└── index.css        # Global styles + Arcade theme + Mobile optimizations

public/
└── manifest.json    # PWA manifest
```

## Customization

### Modifying Theme Colors

Edit `src/index.css` to adjust the arcade blue and orange colors:

```css
:root {
  --primary: oklch(0.65 0.19 240);    /* Arcade Blue */
  --secondary: oklch(0.72 0.18 45);   /* Arcade Orange */
}
```

### Adding Components

All shadcn/ui components follow the same pattern. Create new components in `src/components/ui/` using the shadcn/ui documentation.

### Adding Animations

Use Framer Motion's powerful animation primitives with mobile-friendly gestures:

```jsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  whileTap={{ scale: 0.95 }}
  transition={{ duration: 0.5 }}
>
  Content
</motion.div>
```

## Mobile Optimization Features

- **Touch Targets**: Minimum 44x44px tap areas (Apple HIG compliant)
- **Viewport Optimized**: Proper scaling on all mobile devices
- **Performance**: Hardware-accelerated animations via Framer Motion
- **Gestures**: `whileTap` and `whileHover` for intuitive interactions
- **Text Sizing**: Responsive typography that scales appropriately
- **Safe Areas**: Proper padding respects device notches and rounded corners

## Technologies

- **React 18.3** - UI library
- **Vite 6** - Build tool
- **Crossmint SDK** - Web3 authentication & embedded wallets
- **Framer Motion 11** - Animation library
- **Tailwind CSS 3.4** - Styling
- **shadcn/ui** - Component system
- **vite-plugin-pwa** - PWA capabilities
- **Cloudflare Pages** - Hosting & deployment
- **Cloudflare D1** - SQLite database
- **Pages Functions** - Serverless API

## User Database & API

This app includes a complete user management system with encrypted wallet storage:

### API Endpoints
- `POST /api/users` - Create user with wallet
- `GET /api/users/:wallet` - Get user by wallet address
- `PUT /api/users/:wallet` - Update user profile
- `DELETE /api/users/:wallet` - Delete user

### Security Features
- **AES-256-GCM Encryption** - Wallet addresses encrypted at rest
- **SHA-256 Hashing** - Fast lookups without exposing wallets
- **Decentralized Identity** - Wallet-based authentication

### Documentation
- **[DEPLOY.md](./DEPLOY.md)** - Complete Cloudflare Pages deployment guide
- **[SETUP.md](./SETUP.md)** - Database setup and configuration
- **[ONESIGNAL_SETUP.md](./ONESIGNAL_SETUP.md)** - Push notifications setup (iOS, Android, Desktop)
- **[ONESIGNAL_DEBUG.md](./ONESIGNAL_DEBUG.md)** - Push notification debugging guide

### Quick Deploy
```bash
# Build and deploy to Cloudflare Pages
npm run pages:deploy

# Set encryption key
npx wrangler pages secret put WALLET_ENCRYPTION_KEY --project-name=mitobyte-app
```

## License

MIT
