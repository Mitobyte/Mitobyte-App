import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

export default function NotificationBell({ walletAddress }) {
  const [isOpen, setIsOpen] = useState(false)
  const [announcements, setAnnouncements] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (walletAddress) {
      fetchAnnouncements()
      // Poll for new announcements every 2 minutes
      const interval = setInterval(fetchAnnouncements, 120000)
      return () => clearInterval(interval)
    }
  }, [walletAddress])

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/announcements?walletAddress=${encodeURIComponent(walletAddress)}`)
      const data = await response.json()

      if (data.success) {
        setAnnouncements(data.announcements)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('Error fetching announcements:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (announcementId) => {
    try {
      await fetch(`/api/announcements/${announcementId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      })

      // Update local state
      setAnnouncements(prev =>
        prev.map(a => a.id === announcementId ? { ...a, is_read: 1 } : a)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking announcement as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/announcements/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      })

      // Update local state
      setAnnouncements(prev => prev.map(a => ({ ...a, is_read: 1 })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="ghost"
        size="icon"
        className="rounded-full relative"
        aria-label="Notifications"
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
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 mt-2 sm:w-96 z-50"
          >
            <Card className="shadow-2xl border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span>🔔</span>
                    <span>Notifications</span>
                  </CardTitle>
                  {unreadCount > 0 && (
                    <Button
                      onClick={markAllAsRead}
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                    >
                      Mark all read
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[60vh] overflow-y-auto">
                  {loading && announcements.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : announcements.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="text-4xl mb-2">📭</div>
                      <p className="text-sm text-muted-foreground">No announcements yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {announcements.map((announcement) => (
                        <motion.div
                          key={announcement.id}
                          className={`p-4 hover:bg-accent/50 transition-colors cursor-pointer ${
                            !announcement.is_read ? 'bg-primary/5' : ''
                          }`}
                          onClick={() => !announcement.is_read && markAsRead(announcement.id)}
                        >
                          <div className="flex items-start gap-3">
                            {!announcement.is_read && (
                              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className={`font-semibold text-sm ${
                                  !announcement.is_read ? 'text-foreground' : 'text-muted-foreground'
                                }`}>
                                  {announcement.title}
                                </h4>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatDate(announcement.sent_at)}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {announcement.message}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {announcements.length > 0 && (
                  <div className="p-3 border-t border-border bg-muted/50 space-y-2">
                    {unreadCount > 0 && (
                      <Button
                        onClick={markAllAsRead}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <span className="mr-2">✓</span>
                        Clear All ({unreadCount})
                      </Button>
                    )}
                    <p className="text-xs text-center text-muted-foreground">
                      Showing announcements from the last 30 days
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
