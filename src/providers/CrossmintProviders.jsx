import { CrossmintProvider, CrossmintAuthProvider, CrossmintWalletProvider } from '@crossmint/client-sdk-react-ui'

export function CrossmintProviders({ children }) {
  const apiKey = import.meta.env.VITE_CROSSMINT_API_KEY || ''

  if (!apiKey) {
    console.warn('Crossmint API key not found. Please add VITE_CROSSMINT_API_KEY to your .env.local file')
    return children
  }

  return (
    <CrossmintProvider apiKey={apiKey}>
      <CrossmintAuthProvider
        loginMethods={['email', 'google', 'twitter']}
        authModalTitle="Join Mitobyte Community"
        appearance={{
          borderRadius: '16px',
          colors: {
            background: '#ffffff',
            textPrimary: '#000000',
            accent: '#0ea5e9'
          }
        }}
      >
        <CrossmintWalletProvider
          createOnLogin={{
            chain: 'polygon',
            signer: { type: 'email' }
          }}
        >
          {children}
        </CrossmintWalletProvider>
      </CrossmintAuthProvider>
    </CrossmintProvider>
  )
}
