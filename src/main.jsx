import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { CrossmintProviders } from './providers/CrossmintProviders.jsx'
import {
  getOneSignalDebugInfo,
  logFullDebugInfo,
  diagnoseIssues,
  downloadDebugInfo,
  testOneSignalInit
} from './utils/oneSignalDebug.js'
import { initWalletConflictHandler } from './utils/walletDebug.js'
import './index.css'

// Initialize wallet conflict handler FIRST (before any wallet operations)
// This suppresses harmless XDEFI/Phantom property redefinition errors
initWalletConflictHandler()

// OneSignal is initialized via CDN script in index.html
// No need to initialize here to avoid conflicts

// Expose debug utilities to window for easy access in console
// Note: These should only be called AFTER OneSignal has loaded
if (typeof window !== 'undefined') {
  window.OneSignalDebug = {
    // Get comprehensive debug info
    getInfo: getOneSignalDebugInfo,

    // Log full debug info to console
    logInfo: logFullDebugInfo,

    // Diagnose common issues
    diagnose: diagnoseIssues,

    // Download debug info as JSON
    download: downloadDebugInfo,

    // Test OneSignal initialization (call after OneSignal loads)
    testInit: testOneSignalInit,

    // Quick help
    help: () => {
      console.log(`
OneSignal Debug Utilities
========================

Available commands:
- OneSignalDebug.getInfo()     - Get debug info object
- OneSignalDebug.logInfo()     - Log full debug info to console
- OneSignalDebug.diagnose()    - Check for common issues
- OneSignalDebug.download()    - Download debug info as JSON
- OneSignalDebug.testInit()    - Test OneSignal initialization

Example:
  await OneSignalDebug.diagnose()
  await OneSignalDebug.logInfo()
      `)
    }
  }

  console.log('✨ OneSignal Debug utilities available: window.OneSignalDebug')
  console.log('   Run OneSignalDebug.help() for commands')
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CrossmintProviders>
      <App />
    </CrossmintProviders>
  </React.StrictMode>,
)
