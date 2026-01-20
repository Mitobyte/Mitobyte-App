/**
 * Wallet Conflict Debug Utility
 * Helps diagnose and handle multiple wallet extension conflicts
 */

/**
 * Check which wallet extensions are loaded and detect conflicts
 */
export function diagnoseWalletConflicts() {
  const wallets = {
    solana: {
      exists: typeof window.solana !== 'undefined',
      isPhantom: window.solana?.isPhantom,
      isCoinbase: window.solana?.isCoinbaseWallet,
      isXDEFI: window.solana?.isXDEFI,
      writable: isPropertyWritable('solana')
    },
    phantom: {
      exists: typeof window.phantom !== 'undefined',
      writable: isPropertyWritable('phantom')
    },
    ethereum: {
      exists: typeof window.ethereum !== 'undefined',
      isMetaMask: window.ethereum?.isMetaMask,
      isCoinbase: window.ethereum?.isCoinbaseWallet,
      isXDEFI: window.ethereum?.isXDEFI,
      writable: isPropertyWritable('ethereum')
    },
    xfi: {
      exists: typeof window.xfi !== 'undefined',
      writable: isPropertyWritable('xfi')
    }
  }

  const conflicts = Object.entries(wallets)
    .filter(([_, info]) => info.exists && !info.writable)
    .map(([name]) => name)

  return {
    wallets,
    conflicts,
    hasConflicts: conflicts.length > 0,
    summary: generateSummary(wallets, conflicts)
  }
}

/**
 * Check if a window property is writable/configurable
 */
function isPropertyWritable(propName) {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(window, propName)
    return descriptor ? descriptor.writable !== false && descriptor.configurable !== false : true
  } catch (error) {
    return false
  }
}

/**
 * Generate human-readable summary
 */
function generateSummary(wallets, conflicts) {
  const loaded = Object.entries(wallets)
    .filter(([_, info]) => info.exists)
    .map(([name, info]) => {
      const details = []
      if (info.isPhantom) details.push('Phantom')
      if (info.isCoinbase) details.push('Coinbase')
      if (info.isXDEFI) details.push('XDEFI')
      if (info.isMetaMask) details.push('MetaMask')
      return `${name}${details.length ? ` (${details.join(', ')})` : ''}`
    })

  return {
    loaded,
    loadedCount: loaded.length,
    conflicts,
    conflictCount: conflicts.length,
    message: conflicts.length > 0
      ? `⚠️ ${conflicts.length} wallet property conflict(s) detected. Multiple extensions trying to override the same properties.`
      : '✅ No wallet conflicts detected'
  }
}

/**
 * Safely access wallet without triggering redefinition errors
 */
export function getSafeWalletProvider(preferredWallet = 'auto') {
  try {
    // Auto-detect best available wallet
    if (preferredWallet === 'auto') {
      // Priority order: Phantom > Solana > Ethereum
      if (window.phantom?.solana) {
        return { provider: window.phantom.solana, name: 'Phantom' }
      }
      if (window.solana?.isPhantom) {
        return { provider: window.solana, name: 'Phantom' }
      }
      if (window.solana) {
        return { provider: window.solana, name: 'Solana' }
      }
      if (window.ethereum) {
        return { provider: window.ethereum, name: 'Ethereum' }
      }
    }

    // Specific wallet requested
    switch (preferredWallet) {
      case 'phantom':
        return { provider: window.phantom?.solana || window.solana, name: 'Phantom' }
      case 'solana':
        return { provider: window.solana, name: 'Solana' }
      case 'ethereum':
        return { provider: window.ethereum, name: 'Ethereum' }
      default:
        return { provider: null, name: null }
    }
  } catch (error) {
    console.warn('[Wallet Debug] Error accessing wallet provider:', error)
    return { provider: null, name: null, error: error.message }
  }
}

/**
 * Initialize wallet conflict monitoring and suppress non-critical errors
 */
export function initWalletConflictHandler() {
  // Suppress XDEFI property redefinition errors (they're harmless)
  const originalError = console.error
  console.error = (...args) => {
    const message = args[0]?.toString() || ''

    // Filter out known harmless wallet conflicts
    if (
      message.includes('Failed to define property solana') ||
      message.includes('Failed to define property phantom') ||
      message.includes('Cannot redefine property')
    ) {
      // Log as warning instead
      console.warn('[Wallet Conflict Suppressed]', ...args)
      return
    }

    // Pass through all other errors
    originalError.apply(console, args)
  }

  // Run initial diagnosis
  const diagnosis = diagnoseWalletConflicts()

  if (diagnosis.hasConflicts) {
    console.warn('[Wallet Debug]', diagnosis.summary.message)
    console.info('[Wallet Debug] Detected wallets:', diagnosis.summary.loaded)
    console.info('[Wallet Debug] Conflicting properties:', diagnosis.conflicts)
  } else {
    console.log('[Wallet Debug] ✅', diagnosis.summary.message)
  }

  return diagnosis
}

/**
 * Get detailed wallet environment report
 */
export function getWalletEnvironmentReport() {
  const diagnosis = diagnoseWalletConflicts()
  const safeProvider = getSafeWalletProvider()

  return {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    diagnosis,
    recommendedProvider: safeProvider,
    extensions: {
      xdefi: typeof window.xfi !== 'undefined',
      phantom: typeof window.phantom !== 'undefined',
      coinbase: window.ethereum?.isCoinbaseWallet || window.solana?.isCoinbaseWallet,
      metamask: window.ethereum?.isMetaMask,
      brave: window.ethereum?.isBraveWallet
    }
  }
}

// Make debug functions available globally for console debugging
if (typeof window !== 'undefined') {
  window.WalletDebug = {
    diagnose: diagnoseWalletConflicts,
    getProvider: getSafeWalletProvider,
    getReport: getWalletEnvironmentReport,
    init: initWalletConflictHandler,
    help: () => {
      console.log(`
🔍 Wallet Debug Utility Commands:

  WalletDebug.diagnose()        - Check for wallet conflicts
  WalletDebug.getProvider()     - Get safe wallet provider
  WalletDebug.getReport()       - Full environment report
  WalletDebug.init()            - Initialize conflict handler
  WalletDebug.help()            - Show this help

Example:
  const report = WalletDebug.getReport()
  console.log(report)
      `)
    }
  }

  console.log('🔍 Wallet Debug utilities loaded. Type WalletDebug.help() for commands.')
}
