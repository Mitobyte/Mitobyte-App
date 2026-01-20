import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { subscribeToPushNotifications, isPushNotificationSubscribed } from '../services/oneSignalNotifications'

export default function NotificationPrompt({ walletAddress, onDismiss }) {
  const [isVisible, setIsVisible] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    checkSubscriptionStatus()
  }, [])

  const checkSubscriptionStatus = async () => {
    try {
      // Check if notifications are supported
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        return
      }

      // Check if already subscribed (silently fail if OneSignal not available)
      const isSubscribed = await isPushNotificationSubscribed().catch(() => false)

      // Check if permission was already denied
      const permission = Notification.permission

      // Check if user has dismissed this before (stored in localStorage)
      const hasDismissed = localStorage.getItem('notificationPromptDismissed')

      // Show prompt if:
      // - Not subscribed
      // - Permission not denied
      // - Haven't dismissed before
      if (!isSubscribed && permission !== 'denied' && !hasDismissed) {
        // Wait 2 seconds before showing to not overwhelm on first load
        setTimeout(() => {
          setIsVisible(true)
        }, 2000)
      }
    } catch (error) {
      // Silently fail - don't show notification prompt if there's an error
      console.warn('OneSignal not available, skipping notification prompt:', error)
    }
  }

  const handleEnableNotifications = async () => {
    try {
      setIsSubscribing(true)
      setError(null)

      await subscribeToPushNotifications(walletAddress)

      // Success - hide the prompt
      setIsVisible(false)
      if (onDismiss) onDismiss()
    } catch (err) {
      console.error('Failed to subscribe to notifications:', err)
      // Show user-friendly error message
      if (err.message.includes('timeout')) {
        setError('Connection timed out. Please check your internet connection and try again.')
      } else if (err.message.includes('denied')) {
        setError('Notification permission denied. Please enable notifications in your browser settings.')
      } else {
        setError('Unable to enable notifications. Please try again later.')
      }
    } finally {
      setIsSubscribing(false)
    }
  }

  const handleDismiss = () => {
    // Remember that user dismissed this
    localStorage.setItem('notificationPromptDismissed', 'true')
    setIsVisible(false)
    if (onDismiss) onDismiss()
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:w-96"
        >
          <Card className="border-2 border-primary/20 shadow-2xl">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-4">
                <div className="text-4xl">🔔</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">
                    Stay Updated!
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Enable notifications to receive important announcements, event reminders, and community updates.
                  </p>

                  {error && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2 mb-3 text-xs text-destructive">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleEnableNotifications}
                      disabled={isSubscribing}
                      size="sm"
                      className="flex-1"
                    >
                      {isSubscribing ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Enabling...
                        </>
                      ) : (
                        <>
                          <span className="mr-2">✓</span>
                          Enable
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleDismiss}
                      variant="ghost"
                      size="sm"
                    >
                      Not Now
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground mt-3">
                    You can change this anytime in settings
                  </p>
                </div>

                <button
                  onClick={handleDismiss}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
