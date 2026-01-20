import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'

/**
 * PWA Install Button Component
 * Displays an install button when the app can be installed as a PWA
 * Handles the beforeinstallprompt event and triggers installation
 */
function PWAInstallButton({ className = '', size = 'default', variant = 'default', showDebug = false }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [debugInfo, setDebugInfo] = useState('')

  useEffect(() => {
    // Check if app is already installed (running in standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

    if (isStandalone) {
      setIsInstalled(true)
      setDebugInfo('App is already installed')
      console.log('PWA: App is already installed (running in standalone mode)')
      return
    }

    // For iOS, we can't detect PWA installability via beforeinstallprompt
    // Show button anyway with iOS-specific instructions
    if (isIOS && !isStandalone) {
      setIsInstallable(true)
      setDebugInfo('iOS detected - use Share button to install')
      console.log('PWA: iOS detected, showing install button')
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Stash the event so it can be triggered later
      setDeferredPrompt(e)
      // Show the install button
      setIsInstallable(true)
      setDebugInfo('App is installable')
      console.log('PWA: beforeinstallprompt event fired - App is installable')
    }

    // Listen for successful installation
    const handleAppInstalled = () => {
      console.log('PWA: App was installed')
      setIsInstallable(false)
      setIsInstalled(true)
      setDeferredPrompt(null)
      setDebugInfo('App was just installed')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Debug logging
    console.log('PWA Install Button: Component mounted', {
      isStandalone,
      isIOS,
      userAgent: navigator.userAgent
    })

    // Set timeout to show if event never fires
    const timer = setTimeout(() => {
      if (!deferredPrompt && !isInstallable && !isInstalled) {
        setDebugInfo('Event not fired - may not meet PWA criteria or already dismissed')
        console.log('PWA: beforeinstallprompt event did not fire within 3 seconds')
      }
    }, 3000)

    // Cleanup listeners
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      clearTimeout(timer)
    }
  }, [])

  const handleInstallClick = async () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

    // For iOS, show instructions since we can't trigger install programmatically
    if (isIOS) {
      alert('To install this app on iOS:\n\n1. Tap the Share button (square with arrow)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to confirm')
      return
    }

    if (!deferredPrompt) {
      console.log('PWA: No deferred prompt available')
      alert('Installation is not currently available. Try:\n\n• Refreshing the page\n• Using Chrome or Edge browser\n• Visiting via HTTPS')
      return
    }

    try {
      // Show the install prompt
      deferredPrompt.prompt()

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice
      console.log(`PWA: User ${outcome} the install prompt`)

      if (outcome === 'accepted') {
        setIsInstallable(false)
        setDebugInfo('Install accepted')
      } else {
        setDebugInfo('Install declined')
      }

      // Clear the deferredPrompt for next time
      setDeferredPrompt(null)
    } catch (error) {
      console.error('PWA: Error during installation:', error)
      setDebugInfo(`Install error: ${error.message}`)
    }
  }

  // Don't show button if not installable or already installed
  if (!isInstallable || isInstalled) {
    // Show debug info in development
    if (showDebug && debugInfo) {
      return (
        <div className="text-xs text-muted-foreground" title={debugInfo}>
          {isInstalled ? '✓' : '⊘'}
        </div>
      )
    }
    return null
  }

  return (
    <Button
      onClick={handleInstallClick}
      variant={variant}
      size={size}
      className={`flex items-center gap-2 ${className}`}
      aria-label="Install app"
      title={showDebug ? debugInfo : 'Install app'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <span className="hidden sm:inline">Install App</span>
    </Button>
  )
}

export default PWAInstallButton
