import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './ui/button'
import Z_INDEX from '../lib/z-index'
import { MODAL_INSETS } from '../lib/responsive'
import BottomNav from './BottomNav'
import { EventsPage } from './events/EventsPage'
import { MemberDirectory } from './community/MemberDirectory'
import CodeCoffeeRoom from './CodeCoffeeRoom'
import { UserProfileRedesigned } from './social/UserProfileRedesigned'
import AppSettings from './AppSettings'
import PWAInstallButton from './PWAInstallButton'
import NotificationPrompt from './NotificationPrompt'
import BugReportButton from './BugReportButton'
import MobileMenu from './MobileMenu'
import { MinimalProfileCard } from './MinimalProfileCard'
import { Showcase } from './Showcase'
import ProfileQRCode from './ProfileQRCode'
import NotificationBell from './NotificationBell'
import mitobyteLogoLarge from '../mitobyte-c-large.png'

const CommunityHub = ({ user, dbUser, walletAddress, onCheckIn, onLogout, onAdminClick, onHostClick, onSponsorClick, darkMode, toggleDarkMode }) => {
  const [activeTab, setActiveTab] = useState('events')
  const [registeredEvents, setRegisteredEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [selectedRoomEvent, setSelectedRoomEvent] = useState(null)
  const [searchHandle, setSearchHandle] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const isAdmin = user?.email?.startsWith('carl@craftthefuture.xyz') || dbUser?.is_admin === 1 || dbUser?.is_admin === true

  // Debug logging
  React.useEffect(() => {
    console.log('🏠 [CommunityHub] Current state:', {
      activeTab,
      user: user?.email
    });
  }, [activeTab, user])

  // Load user settings and apply default view
  React.useEffect(() => {
    const fetchUserSettings = async () => {
      if (!walletAddress || settingsLoaded) return

      try {
        const response = await fetch(`/api/settings?walletAddress=${encodeURIComponent(walletAddress)}`)
        const data = await response.json()

        if (data.success && data.settings) {
          // Apply default view on initial load - validate it's a current tab
          const validTabs = ['events', 'showcase', 'checkin', 'directory', 'profile']
          if (data.settings.defaultView && validTabs.includes(data.settings.defaultView)) {
            console.log('✅ Loading saved default view:', data.settings.defaultView)
            setActiveTab(data.settings.defaultView)
          } else {
            // If saved tab is invalid or doesn't exist, default to 'events'
            console.log('⚠️ Invalid or missing default view, using "events". Saved value was:', data.settings.defaultView)
            setActiveTab('events')
          }
        }
        setSettingsLoaded(true)
      } catch (error) {
        console.error('Error fetching user settings:', error)
        setSettingsLoaded(true)
      }
    }

    fetchUserSettings()
  }, [walletAddress])

  // Fetch user's registered events (no longer needed - kept for reference)
  // Events are now loaded directly in EventsPage
  React.useEffect(() => {
    // No-op: registeredEvents state kept for backwards compatibility
  }, [walletAddress, activeTab])

  const formatEventDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays < 7) return `In ${diffDays} days`

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchHandle.trim()) return

    setSearching(true)
    try {
      // Search for ActivityPub actors via WebFinger
      const handle = searchHandle.trim()
      const [username, domain] = handle.replace('@', '').split('@')

      if (!domain) {
        alert('Please enter a full handle like @user@mastodon.social')
        return
      }

      const webfingerUrl = `https://${domain}/.well-known/webfinger?resource=acct:${username}@${domain}`
      const response = await fetch(webfingerUrl)

      if (!response.ok) {
        throw new Error('User not found')
      }

      const data = await response.json()
      const actorUrl = data.links.find(link => link.type === 'application/activity+json')?.href

      if (!actorUrl) {
        throw new Error('Not an ActivityPub actor')
      }

      setSearchResults({
        handle,
        actorUri: actorUrl,
        name: data.subject || handle
      })
    } catch (error) {
      alert(`Search failed: ${error.message}`)
      setSearchResults(null)
    } finally {
      setSearching(false)
    }
  }

  const getEventTypeInfo = (eventType) => {
    const types = {
      code_and_coffee: { icon: '☕', label: 'Code and Coffee', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
      code_and_brews: { icon: '🍺', label: 'Code and Brews', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
      hackathon: { icon: '💻', label: 'Hackathon', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' }
    }
    return types[eventType] || { icon: '📅', label: 'Event', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' }
  }

  // Handle tab change - auto-open scanner for connect tab
  const handleTabChange = (tab) => {
    if (tab === 'checkin') {
      // Immediately open scanner when connect tab is clicked
      onCheckIn()
      // Keep them on events tab visually
      setActiveTab('events')
    } else {
      setActiveTab(tab)
    }
  }

  const handleEditProfile = () => {
    window.history.pushState({}, '', '/profile/edit')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  // Fetch user profile for QR code
  React.useEffect(() => {
    const fetchProfile = async () => {
      if (!walletAddress) return

      try {
        const response = await fetch(`/api/profile?walletAddress=${encodeURIComponent(walletAddress)}`)
        const data = await response.json()

        if (data.success && data.profile) {
          setUserProfile(data.profile)
        }
      } catch (error) {
        console.error('Failed to load profile for QR code:', error)
      }
    }

    fetchProfile()
  }, [walletAddress])

  return (
    <div className="min-h-screen flex flex-col bg-background pb-16">
      {/* Minimal Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/40 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <motion.img
              src={mitobyteLogoLarge}
              alt="Mitobyte"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-6 w-auto"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <NotificationBell walletAddress={walletAddress} />
            <button
              onClick={() => setShowQRModal(true)}
              className="hidden sm:flex w-9 h-9 rounded-full hover:bg-foreground/5 items-center justify-center transition-colors"
              aria-label="My QR Code"
              title="My QR Code"
            >
              <span className="text-sm">📱</span>
            </button>
            <button
              onClick={toggleDarkMode}
              className="w-9 h-9 rounded-full hover:bg-foreground/5 flex items-center justify-center transition-colors"
              aria-label="Toggle theme"
            >
              <span className="text-sm">{darkMode ? '☀️' : '🌙'}</span>
            </button>
            <div className="hidden sm:block">
              <BugReportButton walletAddress={walletAddress} />
            </div>
            {isAdmin && (
              <button
                onClick={onAdminClick}
                className="hidden md:flex items-center gap-2 px-3 h-9 rounded-full hover:bg-foreground/5 transition-colors text-sm"
              >
                <span>🛡️</span>
                <span className="text-xs font-medium">Admin</span>
              </button>
            )}
            {(() => {
              const showHostButton = isAdmin || dbUser?.is_host;
              console.log('DEBUG: CommunityHub Host Button Check');
              console.log('DEBUG: isAdmin:', isAdmin);
              console.log('DEBUG: dbUser?.is_host:', dbUser?.is_host);
              console.log('DEBUG: showHostButton:', showHostButton);
              return showHostButton;
            })() && (
                <button
                  onClick={onHostClick}
                  className="hidden md:flex items-center gap-2 px-3 h-9 rounded-full hover:bg-foreground/5 transition-colors text-sm"
                >
                  <span>🎯</span>
                  <span className="text-xs font-medium">Host</span>
                </button>
              )}
            {dbUser?.is_sponsor && (
              <button
                onClick={onSponsorClick}
                className="hidden md:flex items-center gap-2 px-3 h-9 rounded-full hover:bg-foreground/5 transition-colors text-sm"
              >
                <span>💼</span>
                <span className="text-xs font-medium">Sponsor</span>
              </button>
            )}
            <button
              onClick={onLogout}
              className="hidden md:flex items-center gap-2 px-3 h-9 rounded-full hover:bg-foreground/5 transition-colors"
            >
              <span className="text-xs font-medium">Logout</span>
            </button>
            <div className="md:hidden">
              <MobileMenu
                items={[
                  {
                    icon: '📱',
                    label: 'My QR Code',
                    onClick: () => setShowQRModal(true),
                    className: 'sm:hidden'
                  },
                  {
                    icon: '🐛',
                    label: 'Report Bug',
                    onClick: () => document.querySelector('[aria-label="Report a bug"]')?.click(),
                    className: 'sm:hidden'
                  },
                  ...(isAdmin ? [{
                    icon: '🛡️',
                    label: 'Admin Dashboard',
                    onClick: onAdminClick
                  }] : []),
                  ...((isAdmin || dbUser?.is_host) ? [{
                    icon: '🎯',
                    label: 'Host Dashboard',
                    onClick: onHostClick
                  }] : []),
                  ...(dbUser?.is_sponsor ? [{
                    icon: '💼',
                    label: 'Sponsor Analytics',
                    onClick: onSponsorClick
                  }] : []),
                  {
                    icon: '💾',
                    label: 'Install App',
                    onClick: () => document.querySelector('[aria-label="Install App"]')?.click()
                  },
                  {
                    icon: '🚪',
                    label: 'Logout',
                    onClick: onLogout
                  }
                ]}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Hub Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full">
        {/* Event Room View */}
        {selectedRoomEvent && (
          <CodeCoffeeRoom
            event={selectedRoomEvent}
            walletAddress={walletAddress}
            onBack={() => {
              setSelectedRoomEvent(null);
              setActiveTab('events');
            }}
          />
        )}

        {/* Events Tab */}
        {activeTab === 'events' && !selectedRoomEvent && (
          <EventsPage user={user} walletAddress={walletAddress} isAdmin={isAdmin} />
        )}

        {/* Showcase Tab */}
        {activeTab === 'showcase' && !selectedRoomEvent && (
          <Showcase user={user} walletAddress={walletAddress} />
        )}

        {/* Directory Tab */}
        {activeTab === 'directory' && (
          <div className="px-4 py-6">
            <MemberDirectory currentUserWallet={walletAddress} currentUserProfile={userProfile} />
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto pb-6">
            <UserProfileRedesigned
              userId={null}
              onClose={null}
              currentUserEmail={user?.email}
              fallbackEmail={user?.email}
              fallbackName={dbUser?.displayName || user?.email}
              walletAddress={walletAddress}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground/60 py-8">
        <p>Milwaukee Tech Community</p>
      </div>


      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Notification Prompt */}
      <NotificationPrompt walletAddress={walletAddress} />

      {/* Profile QR Code Modal */}
      <ProfileQRCode
        walletAddress={walletAddress}
        profile={userProfile}
        open={showQRModal}
        onOpenChange={setShowQRModal}
      />

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettingsModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className={`fixed ${MODAL_INSETS.centered} bg-background rounded-2xl shadow-2xl overflow-hidden flex flex-col`}
              style={{ zIndex: Z_INDEX.MODAL }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
                <h2 className="text-xl sm:text-2xl font-bold">App Settings</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettingsModal(false)}
                  className="rounded-full"
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
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </Button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <AppSettings
                  user={user}
                  walletAddress={walletAddress}
                  darkMode={darkMode}
                  toggleDarkMode={toggleDarkMode}
                  onSettingsSaved={() => {
                    // Optionally close modal after saving
                    // setShowSettingsModal(false)
                  }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CommunityHub
