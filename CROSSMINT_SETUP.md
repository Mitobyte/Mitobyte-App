# Crossmint Integration Setup Guide

This guide explains how to set up Crossmint authentication and embedded wallets for the Mitobyte community platform.

## What is Crossmint?

Crossmint provides **embedded wallets** and **seamless Web3 authentication** that allows users to:
- Sign in with email, Google, Twitter, or Farcaster
- Get a crypto wallet automatically created (no prior crypto knowledge needed)
- Participate in blockchain-based features without installing MetaMask or other wallet software

## Setup Instructions

### 1. Get Your Crossmint API Key

1. Visit [console.crossmint.com](https://console.crossmint.com/)
2. Sign up or log in to your account
3. Create a new project
4. Copy your **Client API Key**

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
VITE_CROSSMINT_API_KEY=your_api_key_here
```

### 3. Install Dependencies

```bash
npm install
```

The Crossmint SDK is already included in package.json.

### 4. Run the App

```bash
npm run dev
```

## How It Works

### Authentication Flow

1. User clicks **"Join the Community"** button
2. Crossmint modal appears with login options:
   - Email (with OTP verification)
   - Google OAuth
   - Twitter OAuth
3. User completes authentication
4. Crossmint automatically creates an embedded wallet for the user
5. User is logged in and can see their wallet address

### Features Enabled

- **Email/Social Login**: No password required, uses OTP or OAuth
- **Embedded Wallet**: Polygon blockchain wallet created automatically
- **Persistent Sessions**: User stays logged in across page refreshes
- **Wallet Management**: Users can view their wallet address and balance

## Customization

### Supported Login Methods

Edit `src/providers/CrossmintProviders.jsx`:

```jsx
<CrossmintAuthProvider
  loginMethods={['email', 'google', 'twitter', 'farcaster', 'web3']}
  // ...
>
```

### Change Blockchain

Update the wallet provider:

```jsx
<CrossmintWalletProvider
  createOnLogin={{
    chain: 'solana', // Options: 'polygon', 'ethereum', 'base', 'solana'
    signer: { type: 'email' }
  }}
>
```

### Customize Appearance

Modify the auth modal styling:

```jsx
<CrossmintAuthProvider
  appearance={{
    borderRadius: '16px',
    colors: {
      background: '#ffffff',
      textPrimary: '#000000',
      accent: '#0ea5e9'
    }
  }}
>
```

## Testing

1. Click "Join the Community"
2. Try logging in with email (check your email for OTP code)
3. Once logged in, you'll see:
   - Your email address
   - Your wallet address
   - A logout button

## Security Notes

- API keys are stored in `.env.local` (not committed to git)
- Client-side API keys are safe to use in frontend apps
- Crossmint handles all authentication securely
- Wallets are non-custodial and controlled by the user

## Troubleshooting

### "API key not found" warning

Make sure your `.env.local` file exists and contains:
```
VITE_CROSSMINT_API_KEY=your_actual_key
```

Then restart the dev server.

### Login modal doesn't appear

Check the browser console for errors. Ensure:
1. API key is valid
2. Dependencies are installed
3. Dev server was restarted after adding .env.local

## Resources

- [Crossmint Documentation](https://docs.crossmint.com/)
- [Crossmint Console](https://console.crossmint.com/)
- [React SDK Reference](https://docs.crossmint.com/react/quickstart)
