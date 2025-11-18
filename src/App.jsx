import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth, useWallet } from '@crossmint/client-sdk-react-ui'
import { Button } from './components/ui/button'
import CommunityHub from './components/CommunityHub'
import QRScannerHub from './components/QRScannerHub'
import UnifiedQRScanner from './components/UnifiedQRScanner'
import AdminDrawer from './components/AdminDrawer'
import HostDrawer from './components/HostDrawer'
import SponsorDrawer from './components/SponsorDrawer'
import { ProfileDrawer } from './components/ProfileDrawer'
import EventsList from './components/EventsList'
import CheckInConfirmation from './components/CheckInConfirmation'
import { CheckInFormDrawer } from './components/CheckInFormDrawer'
import InviteRedemption from './components/InviteRedemption'
import ProfileEditPage from './components/ProfileEditPage'
import PublicProfileView from './components/PublicProfileView'
import SettingsPage from './components/SettingsPage'
import { EventCheckInDrawer } from './components/EventCheckInDrawer'
import { EventFeedbackDrawer } from './components/EventFeedbackDrawer'
import { EventDetailDrawer } from './components/events/EventDetailDrawer'
import PWAInstallButton from './components/PWAInstallButton'
import { OnboardingFlow } from './components/OnboardingFlow'
import SponsorBanner from './components/SponsorBanner'
import { getOrCreateUser } from './services/userApi'
import { isProfileComplete } from './services/profileApi'
import { login as jwtLogin, logout as jwtLogout } from './services/authService'
import mitobyteLogoLarge from './mitobyte-c-large.png'

function App() {
  const [darkMode, setDarkMode] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showScanner, setShowScanner] = useState(false)
  const [showCheckInDrawer, setShowCheckInDrawer] = useState(false)
  const [scannedCheckInCode, setScannedCheckInCode] = useState(null)
  const [showEventCheckInDrawer, setShowEventCheckInDrawer] = useState(false)
  const [showEventFeedbackDrawer, setShowEventFeedbackDrawer] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [selectedEventDetail, setSelectedEventDetail] = useState(null)
  const [showEventDetailDrawer, setShowEventDetailDrawer] = useState(false)
  const [eventRsvpStatus, setEventRsvpStatus] = useState({})
  const [showAdmin, setShowAdmin] = useState(false)
  const [showHost, setShowHost] = useState(false)
  const [showSponsor, setShowSponsor] = useState(false)
  const [showPublicEvents, setShowPublicEvents] = useState(false)
  const [showProfileDrawer, setShowProfileDrawer] = useState(false)
  const [viewedWalletAddress, setViewedWalletAddress] = useState(null)
  const [dbUser, setDbUser] = useState(null)
  const [debugInfo, setDebugInfo] = useState([])
  const [profileComplete, setProfileComplete] = useState(null) // null = checking, true/false = checked
  const [showOnboarding, setShowOnboarding] = useState(false)
  const { login, logout, user, status } = useAuth()
  const { wallet, status: walletStatus } = useWallet()

  // Check if current path is /checkin
  const [currentPath, setCurrentPath] = useState(window.location.pathname)
  const [searchParams, setSearchParams] = useState(new URLSearchParams(window.location.search))

  // Listen for URL changes (for navigation)
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname)
      setSearchParams(new URLSearchParams(window.location.search))
    }

    window.addEventListener('popstate', handleLocationChange)
    return () => window.removeEventListener('popstate', handleLocationChange)
  }, [])

  // Add debug log helper
  const addDebugLog = (message, data = {}) => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = `[${timestamp}] ${message}`
    console.log(`🔍 DEBUG: ${logEntry}`, data)
    setDebugInfo(prev => [...prev, { timestamp, message, data }].slice(-10)) // Keep last 10 logs
  }

  // Log initial render
  React.useEffect(() => {
    addDebugLog('App component mounted')
  }, [])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('dark')
  }

  const handleScanSuccess = (parsedData, detectedType) => {
    console.log('📱 QR Code scanned:', parsedData, 'Type:', detectedType)

    try {
      // Handle different QR code types
      if (detectedType === 'profile') {
        console.log('✅ Profile QR code detected:', parsedData.walletAddress)
        // Close scanner and open profile drawer
        setShowScanner(false)
        setViewedWalletAddress(parsedData.walletAddress)
        setShowProfileDrawer(true)
        return
      }

      if (detectedType === 'check-in') {
        console.log('✅ Check-in QR code detected for event:', parsedData.eventId)
        // Close scanner and open check-in drawer
        setShowScanner(false)
        setSelectedEventId(parsedData.eventId)
        setShowEventCheckInDrawer(true)
        window.history.pushState({}, '', parsedData.url)
        setCurrentPath(parsedData.url)
        return
      }

      if (detectedType === 'feedback') {
        console.log('✅ Feedback QR code detected for event:', parsedData.eventId)
        // Close scanner and open feedback drawer
        setShowScanner(false)
        setSelectedEventId(parsedData.eventId)
        setShowEventFeedbackDrawer(true)
        window.history.pushState({}, '', parsedData.url)
        setCurrentPath(parsedData.url)
        return
      }

      // Fallback: Try to parse as full URL for legacy support
      let pathname
      try {
        const url = new URL(parsedData)
        pathname = url.pathname
      } catch {
        pathname = parsedData.startsWith('/') ? parsedData : `/${parsedData}`
      }

      // Legacy check-in code format: /checkin?code=xxx
      if (pathname === '/checkin') {
        let checkInCode
        try {
          const url = new URL(parsedData)
          checkInCode = url.searchParams.get('code')
        } catch {
          // Can't parse query params from path only
        }

        if (checkInCode) {
          console.log('✅ Legacy check-in code detected:', checkInCode)
          setShowScanner(false)
          setScannedCheckInCode(checkInCode)
          setShowCheckInDrawer(true)
          return
        }
      }

      // Invalid format
      console.error('❌ Invalid QR code format:', parsedData)
      alert(`QR code not recognized\n\nExpected: Profile, Check-in, or Feedback QR code`)
    } catch (error) {
      console.error('Error parsing QR code:', error)
      alert(`Error: ${error.message}`)
    }
  }

  const handleJoinCommunity = () => {
    // Trigger Crossmint login
    login()
  }

  const handleCheckIn = () => {
    // Open QR scanner when user clicks Check In
    setShowScanner(true)
  }

  const handleAdminClick = () => {
    setShowAdmin(true)
  }

  const handleHostClick = () => {
    setShowHost(true)
  }

  const handleSponsorClick = () => {
    setShowSponsor(true)
  }

  // Monitor auth status changes
  useEffect(() => {
    addDebugLog('Auth status changed', {
      status,
      hasUser: !!user,
      userEmail: user?.email
    })
  }, [status])

  useEffect(() => {
    addDebugLog('Wallet status changed', {
      walletStatus,
      hasWallet: !!wallet,
      walletAddress: wallet?.address
    })
  }, [walletStatus, wallet?.address])

  // Auto-register user in database when they log in
  useEffect(() => {
    const registerUser = async () => {
      addDebugLog('Registration check triggered', {
        status,
        hasUser: !!user,
        userEmail: user?.email,
        walletStatus,
        hasWallet: !!wallet,
        walletAddress: wallet?.address,
      })

      // Register if user is logged in (email-based registration)
      if (status === 'logged-in' && user && user.email) {
        try {
          // Use wallet address if available, otherwise use email as identifier
          const walletAddress = wallet?.address || `email:${user.email}`

          addDebugLog('🟢 STARTING USER REGISTRATION', {
            walletAddress,
            email: user.email,
            displayName: user.name || user.email?.split('@')[0],
            method: wallet?.address ? 'wallet' : 'email'
          })

          const userData = await getOrCreateUser({
            walletAddress,
            email: user.email,
            displayName: user.name || user.email?.split('@')[0] || null,
          })

          setDbUser(userData)
          addDebugLog('🟢 USER REGISTERED SUCCESSFULLY', userData)

          // Generate and store JWT tokens for API authentication
          try {
            const authData = await jwtLogin({ walletAddress })
            addDebugLog('🟢 JWT TOKENS GENERATED', {
              hasAccessToken: !!authData.accessToken,
              hasRefreshToken: !!authData.refreshToken
            })
          } catch (jwtError) {
            addDebugLog('🟡 JWT TOKEN GENERATION FAILED (non-critical)', {
              error: jwtError.message
            })
            console.warn('JWT token generation failed, but user can still proceed:', jwtError)
          }
        } catch (error) {
          addDebugLog('🔴 USER REGISTRATION FAILED', {
            error: error.message,
            stack: error.stack
          })
          console.error('Full error:', error)
        }
      } else if (status === 'logged-in' && user && !user.email) {
        addDebugLog('🔴 User logged in but no email available', { user })
      } else if (status === 'not-authenticated') {
        addDebugLog('⚪ User not authenticated', { status })
      }
    }

    registerUser()
  }, [status, user?.email, wallet?.address])

  // Clear state on logout
  useEffect(() => {
    if (status === 'not-authenticated') {
      setProfileComplete(null)
      setShowOnboarding(false)
      jwtLogout() // Clear JWT tokens from localStorage
      addDebugLog('🔵 CLEARED STATE ON LOGOUT (including JWT tokens)')
    }
  }, [status])

  // Check profile completion after user registration
  useEffect(() => {
    const checkProfileCompletion = async () => {
      // Only check if we haven't checked yet (profileComplete is null)
      if (status === 'logged-in' && dbUser && profileComplete === null) {
        const walletAddress = wallet?.address || (user?.email ? `email:${user.email}` : null)

        if (walletAddress) {
          addDebugLog('🔍 Checking profile completion', {
            walletAddress
          })

          try {
            addDebugLog('🔵 About to call isProfileComplete API')
            const isComplete = await isProfileComplete(walletAddress)
            addDebugLog('🔵 isProfileComplete returned', { isComplete, type: typeof isComplete })

            addDebugLog('🔵 About to call setProfileComplete', { value: isComplete })
            setProfileComplete(isComplete)
            addDebugLog('🔵 Called setProfileComplete - waiting for re-render')

            if (!isComplete) {
              addDebugLog('⚠️ Profile incomplete - will show onboarding')
              setShowOnboarding(true)
            } else {
              addDebugLog('✅ Profile complete - proceeding to app')
              setShowOnboarding(false)
            }
          } catch (error) {
            addDebugLog('🔴 Profile completion check failed', { error: error.message, stack: error.stack })
            // If check fails, assume profile needs completion
            setProfileComplete(false)
            setShowOnboarding(true)
          }
        }
      }
    }

    checkProfileCompletion()
  }, [status, dbUser, wallet?.address, user?.email, profileComplete])

  // Auto-rotate carousel - must be before any conditional returns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % 4) // 4 benefits
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  // Handle onboarding completion
  const handleOnboardingComplete = () => {
    addDebugLog('🎉 Onboarding completed')
    setProfileComplete(true)
    setShowOnboarding(false)
  }

  // Check if user is authenticated
  const isAuthenticated = status === 'logged-in' && user

  // Handle routes and open appropriate drawers
  React.useEffect(() => {
    console.log('🔍 Current path:', currentPath)

    // Handle /profile/:wallet route - open profile drawer
    const profileMatch = currentPath.match(/^\/profile\/(.+)$/)
    if (profileMatch) {
      const walletAddress = decodeURIComponent(profileMatch[1])
      console.log('✅ Profile match found for wallet:', walletAddress)
      setViewedWalletAddress(walletAddress)
      setShowProfileDrawer(true)
      return
    }

    const checkInMatch = currentPath.match(/^\/event\/(\d+)\/check-in$/)
    if (checkInMatch) {
      const eventId = checkInMatch[1]
      console.log('✅ Check-in match found for event:', eventId)
      setSelectedEventId(eventId)
      setShowEventCheckInDrawer(true)
      return
    }

    const feedbackMatch = currentPath.match(/^\/event\/(\d+)\/feedback$/)
    if (feedbackMatch) {
      const eventId = feedbackMatch[1]
      console.log('✅ Feedback match found for event:', eventId)
      setSelectedEventId(eventId)
      setShowEventFeedbackDrawer(true)
      return
    }

    // Handle /event/:id route - open event detail drawer
    const eventDetailMatch = currentPath.match(/^\/event\/(\d+)$/)
    if (eventDetailMatch) {
      const eventId = eventDetailMatch[1]
      console.log('✅ Event detail match found for event:', eventId)

      // Fetch event data
      fetch(`/api/events/${eventId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.event) {
            setSelectedEventDetail(data.event)
            setShowEventDetailDrawer(true)
          } else if (data.event) {
            setSelectedEventDetail(data.event)
            setShowEventDetailDrawer(true)
          } else {
            console.error('❌ Failed to load event:', data)
          }
        })
        .catch(error => {
          console.error('❌ Error fetching event:', error)
        })
      return
    }

    // If path is '/', close all drawers
    if (currentPath === '/') {
      setShowEventDetailDrawer(false)
      setSelectedEventDetail(null)
      setShowProfileDrawer(false)
      setViewedWalletAddress(null)
    }
  }, [currentPath])

  // Handle drawer closing - reset URL
  const handleCloseEventCheckIn = () => {
    console.log('🚪 Closing check-in drawer')
    setShowEventCheckInDrawer(false)
    setSelectedEventId(null)
    if (currentPath.includes('/event/')) {
      window.history.pushState({}, '', '/')
      setCurrentPath('/')
    }
  }

  const handleCloseEventFeedback = () => {
    console.log('🚪 Closing feedback drawer')
    setShowEventFeedbackDrawer(false)
    setSelectedEventId(null)
    if (currentPath.includes('/event/')) {
      window.history.pushState({}, '', '/')
      setCurrentPath('/')
    }
  }

  const handleCloseEventDetail = () => {
    console.log('🚪 Closing event detail drawer')
    setShowEventDetailDrawer(false)
    setSelectedEventDetail(null)
    if (currentPath.includes('/event/')) {
      window.history.pushState({}, '', '/')
      setCurrentPath('/')
    }
  }

  const handleCloseProfileDrawer = () => {
    console.log('🚪 Closing profile drawer')
    setShowProfileDrawer(false)
    setViewedWalletAddress(null)
    if (currentPath.includes('/profile/')) {
      window.history.pushState({}, '', '/')
      setCurrentPath('/')
    }
  }

  const handleEventRsvp = async (rsvpStatus) => {
    if (!isAuthenticated || !selectedEventDetail) {
      alert('Please sign in to RSVP for events')
      return
    }

    const walletAddress = wallet?.address || (user?.email ? `email:${user.email}` : null)

    try {
      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEventDetail.id,
          walletAddress,
          status: rsvpStatus
        })
      })

      const data = await response.json()
      if (data.success) {
        setEventRsvpStatus(prev => ({
          ...prev,
          [selectedEventDetail.id]: rsvpStatus
        }))
      }
    } catch (error) {
      console.error('Failed to RSVP:', error)
    }
  }

  // Handle invite redemption page - store code and redirect to onboarding
  const inviteMatch = currentPath.match(/^\/invite\/([A-Z0-9-]+)$/);
  if (inviteMatch) {
    const inviteCode = inviteMatch[1];

    // Store invite code for onboarding
    try {
      localStorage.setItem('pendingInviteCode', inviteCode);
    } catch (e) {
      console.error('Failed to store invite code:', e);
    }

    // If not logged in, trigger login
    if (status !== 'logged-in') {
      return (
        <InviteRedemption
          inviteCode={inviteCode}
          isAuthenticated={false}
          user={user}
          wallet={wallet}
          onLogin={handleJoinCommunity}
        />
      );
    }

    // If logged in, redirect to home (onboarding will pick up the stored invite code)
    window.history.pushState({}, '', '/');
    setCurrentPath('/');
    window.location.reload();
    return null;
  }

  // Handle check-in page
  if (currentPath === '/checkin') {
    const checkInCode = searchParams.get('code')
    const walletAddress = wallet?.address || (user?.email ? `email:${user.email}` : null)

    return (
      <div className="min-h-screen">
        <CheckInConfirmation
          checkInCode={checkInCode}
          userWalletHash={walletAddress}
        />
      </div>
    )
  }

  // Handle profile edit page
  if (currentPath === '/profile/edit') {
    const walletAddress = wallet?.address || (user?.email ? `email:${user.email}` : null)

    const handleBackFromProfile = () => {
      window.history.pushState({}, '', '/')
      setCurrentPath('/')
    }

    // Wait for user to be registered in database before showing profile
    if (status === 'logged-in' && !dbUser) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Setting up your profile...</p>
          </div>
        </div>
      )
    }

    return (
      <ProfileEditPage
        user={user}
        walletAddress={walletAddress}
        onBack={handleBackFromProfile}
      />
    )
  }

  // Handle settings page
  if (currentPath === '/settings') {
    const walletAddress = wallet?.address || (user?.email ? `email:${user.email}` : null)

    const handleBackFromSettings = () => {
      window.history.pushState({}, '', '/')
      setCurrentPath('/')
    }

    // Wait for user to be registered in database before showing settings
    if (status === 'logged-in' && !dbUser) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      )
    }

    return (
      <SettingsPage
        user={user}
        dbUser={dbUser}
        walletAddress={walletAddress}
        onBack={handleBackFromSettings}
        onLogout={logout}
      />
    )
  }

  // Handle viewing someone's profile via QR code
  const viewProfileWallet = searchParams.get('viewProfile')
  if (viewProfileWallet && currentPath === '/') {
    const currentUserWallet = wallet?.address || (user?.email ? `email:${user.email}` : null)

    return (
      <PublicProfileView
        viewWalletAddress={viewProfileWallet}
        isAuthenticated={isAuthenticated}
        onLogin={handleJoinCommunity}
        currentUserWallet={currentUserWallet}
      />
    )
  }

  const benefits = [
    {
      icon: '🤝',
      title: 'Network with Developers',
      description: 'Connect with over 1,000 Milwaukee developers through monthly events and hackathons'
    },
    {
      icon: '💡',
      title: 'Inspire Innovation',
      description: 'Collaborate on creative projects and showcase your skills in our biannual hackathons'
    },
    {
      icon: '🎯',
      title: 'Career Growth',
      description: 'Access quarterly resume workshops and connect directly with hiring companies'
    },
    {
      icon: '🚀',
      title: 'Build Together',
      description: 'Join a vibrant community of tech enthusiasts, engineers, and entrepreneurs'
    },
    {
      icon: '📅',
      title: 'Regular Events',
      description: 'Attend morning and evening networking events with 30-50 passionate developers'
    },
    {
      icon: '⚡',
      title: 'Learn & Grow',
      description: 'Gain valuable learning opportunities and stay connected with Milwaukee tech'
    }
  ]

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % benefits.length)
  }

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + benefits.length) % benefits.length)
  }

  const currentBenefit = benefits[currentIndex]

  // If authenticated, show Community Hub or Admin Dashboard
  if (isAuthenticated) {
    const walletAddress = wallet?.address || (user?.email ? `email:${user.email}` : null)

    // DEBUG: Log render decisions (using console.log to avoid state updates during render)
    console.log('🔍 RENDER DECISION CHECK', {
      profileComplete,
      showOnboarding,
      isAuthenticated,
      walletAddress
    })

    // Show loading while checking profile completion
    if (profileComplete === null) {
      console.log('📍 RENDERING: Loading Screen')
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your profile...</p>
          </div>
        </div>
      )
    }

    // Show onboarding if profile is not complete
    if (showOnboarding && profileComplete === false) {
      console.log('📍 RENDERING: Onboarding Flow')
      return (
        <OnboardingFlow
          user={user}
          walletAddress={walletAddress}
          onComplete={handleOnboardingComplete}
        />
      )
    }

    console.log('📍 RENDERING: Main App (Community Hub with Drawers)')

    return (
      <>
        {/* Sponsor Banner - Shows at top of app */}
        <SponsorBanner />

        <CommunityHub
          user={user}
          dbUser={dbUser}
          walletAddress={walletAddress}
          onCheckIn={handleCheckIn}
          onLogout={logout}
          onAdminClick={handleAdminClick}
          onHostClick={handleHostClick}
          onSponsorClick={handleSponsorClick}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
        />

        {/* Admin Drawer - Opens when admin button is clicked */}
        <AdminDrawer
          isOpen={showAdmin}
          onClose={() => setShowAdmin(false)}
          user={user}
          dbUser={dbUser}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
        />

        {/* Host Drawer - Opens when host button is clicked */}
        <HostDrawer
          isOpen={showHost}
          onClose={() => setShowHost(false)}
          user={user}
          dbUser={dbUser}
        />

        {/* Sponsor Drawer - Opens when sponsor button is clicked */}
        <SponsorDrawer
          isOpen={showSponsor}
          onClose={() => setShowSponsor(false)}
          user={user}
        />

        {/* Universal QR Scanner - Opens when Check In is clicked */}
        <UnifiedQRScanner
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={handleScanSuccess}
          mode="generic"
        />

        {/* Profile Drawer - Opens when profile QR is scanned or profile link clicked */}
        <ProfileDrawer
          walletHash={viewedWalletAddress}
          onClose={handleCloseProfileDrawer}
          currentUserWallet={walletAddress}
          isAuthenticated={isAuthenticated}
          onLogin={handleJoinCommunity}
        />

        {/* Check-In Form Drawer - Opens after successful QR scan */}
        <CheckInFormDrawer
          isOpen={showCheckInDrawer}
          onClose={() => {
            setShowCheckInDrawer(false)
            setScannedCheckInCode(null)
          }}
          checkInCode={scannedCheckInCode}
          userWalletHash={walletAddress}
        />

        {/* Event Check-In Drawer - Opens from QR code URL */}
        <EventCheckInDrawer
          isOpen={showEventCheckInDrawer}
          onClose={handleCloseEventCheckIn}
          eventId={selectedEventId}
        />

        {/* Event Feedback Drawer - Opens from QR code URL */}
        <EventFeedbackDrawer
          isOpen={showEventFeedbackDrawer}
          onClose={handleCloseEventFeedback}
          eventId={selectedEventId}
        />

        {/* Event Detail Drawer - Opens from /event/:id URL */}
        {selectedEventDetail && (
          <EventDetailDrawer
            event={selectedEventDetail}
            onClose={handleCloseEventDetail}
            onRsvp={handleEventRsvp}
            rsvpStatus={eventRsvpStatus[selectedEventDetail.id]}
            walletAddress={wallet?.address || (user?.email ? `email:${user.email}` : null)}
            onViewProfile={(walletHash) => {
              // Navigate to profile view
              window.history.pushState({}, '', `/profile/${walletHash}`)
              setCurrentPath(`/profile/${walletHash}`)
            }}
          />
        )}
      </>
    )
  }

  // Show public events view for non-authenticated users
  if (showPublicEvents && !isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col pb-20">
        {/* Header - Responsive */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center gap-2">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <Button
                  onClick={() => setShowPublicEvents(false)}
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0"
                >
                  <span className="hidden sm:inline">← Back</span>
                  <span className="sm:hidden">←</span>
                </Button>
                <img
                  src={mitobyteLogoLarge}
                  alt="Mitobyte"
                  className="h-6 sm:h-8 w-auto"
                />
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <PWAInstallButton variant="ghost" size="icon" className="rounded-full" />
                <Button
                  onClick={toggleDarkMode}
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                >
                  {darkMode ? '☀️' : '🌙'}
                </Button>
                <Button
                  onClick={handleJoinCommunity}
                  variant="default"
                  size="sm"
                  disabled={status === 'loading'}
                  className="whitespace-nowrap"
                >
                  {status === 'loading' ? 'Connecting...' : <><span className="hidden sm:inline">Join to RSVP</span><span className="sm:hidden">Join</span></>}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Events List */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">Upcoming Events</h1>
            <p className="text-muted-foreground">
              Discover and join Milwaukee's tech community events. Sign in to RSVP!
            </p>
          </div>
          <EventsList user={null} walletAddress={null} />
        </div>

        {/* Event Check-In Drawer - Works for non-authenticated users */}
        <EventCheckInDrawer
          isOpen={showEventCheckInDrawer}
          onClose={handleCloseEventCheckIn}
          eventId={selectedEventId}
        />

        {/* Event Feedback Drawer - Works for non-authenticated users (anonymous) */}
        <EventFeedbackDrawer
          isOpen={showEventFeedbackDrawer}
          onClose={handleCloseEventFeedback}
          eventId={selectedEventId}
        />

        {/* Event Detail Drawer - Works for non-authenticated users */}
        {selectedEventDetail && (
          <EventDetailDrawer
            event={selectedEventDetail}
            onClose={handleCloseEventDetail}
            onRsvp={() => alert('Please sign in to RSVP for events')}
            rsvpStatus={null}
            walletAddress={null}
            onViewProfile={() => alert('Please sign in to view profiles')}
          />
        )}
      </div>
    )
  }

  // Landing page - Show when not authenticated
  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 sm:mb-12">
        <motion.img
          src={mitobyteLogoLarge}
          alt="Mitobyte"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="h-10 sm:h-12 md:h-14 w-auto"
        />
        <div className="flex gap-2 items-center">
          <PWAInstallButton variant="ghost" size="icon" className="rounded-full" />
          <Button
            onClick={toggleDarkMode}
            variant="ghost"
            size="icon"
            className="rounded-full"
          >
            {darkMode ? '☀️' : '🌙'}
          </Button>
        </div>
      </div>

      {/* Main Content - Centered */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full">

        {/* Carousel */}
        <div className="w-full mb-8 sm:mb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              {/* Icon */}
              <motion.div
                className="text-8xl sm:text-9xl md:text-[10rem] mb-6 sm:mb-8"
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {currentBenefit.icon}
              </motion.div>

              {/* Title */}
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
                {currentBenefit.title}
              </h2>

              {/* Description */}
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground px-4">
                {currentBenefit.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Carousel Indicators */}
          <div className="flex justify-center items-center gap-2 mt-8">
            <button
              onClick={goToPrev}
              className="p-2 hover:bg-accent rounded-full transition-colors"
              aria-label="Previous"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>

            <div className="flex gap-2 mx-4">
              {benefits.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? 'w-8 bg-primary'
                      : 'w-2 bg-muted-foreground/30'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            <button
              onClick={goToNext}
              className="p-2 hover:bg-accent rounded-full transition-colors"
              aria-label="Next"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="w-full space-y-3 sm:space-y-4">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              size="lg"
              className="w-full h-14 sm:h-16 text-base sm:text-lg font-semibold rounded-full shadow-lg"
              onClick={() => setShowPublicEvents(true)}
            >
              Explore Events
            </Button>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              size="lg"
              variant="outline"
              className="w-full h-14 sm:h-16 text-base sm:text-lg font-semibold rounded-full"
              onClick={handleJoinCommunity}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Connecting...' : 'Join the Community'}
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-xs sm:text-sm text-muted-foreground mt-8"
      >
        <p>Fostering collaboration, creativity, and growth in Milwaukee tech</p>
      </motion.div>

      {/* Event Check-In Drawer - Works for non-authenticated users */}
      <EventCheckInDrawer
        isOpen={showEventCheckInDrawer}
        onClose={handleCloseEventCheckIn}
        eventId={selectedEventId}
      />

      {/* Event Feedback Drawer - Works for non-authenticated users (anonymous) */}
      <EventFeedbackDrawer
        isOpen={showEventFeedbackDrawer}
        onClose={handleCloseEventFeedback}
        eventId={selectedEventId}
      />

      {/* Event Detail Drawer - Works for non-authenticated users */}
      {selectedEventDetail && (
        <EventDetailDrawer
          event={selectedEventDetail}
          onClose={handleCloseEventDetail}
          onRsvp={() => alert('Please sign in to RSVP for events')}
          rsvpStatus={null}
          walletAddress={null}
          onViewProfile={() => alert('Please sign in to view profiles')}
        />
      )}
    </div>
  )
}

export default App
