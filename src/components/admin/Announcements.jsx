import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { getAllAnnouncements, createAnnouncement } from '../../services/announcementsApi'
import { testPushNotification } from '../../services/pushNotifications'

export default function Announcements({ adminEmail }) {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAllAnnouncements(adminEmail)
      setAnnouncements(data)
    } catch (err) {
      console.error('Failed to fetch announcements:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSendAnnouncement = async (e) => {
    e.preventDefault()

    if (!title.trim() || !message.trim()) {
      setError('Please provide both title and message')
      return
    }

    try {
      setSending(true)
      setError(null)
      setSuccessMessage(null)

      const result = await createAnnouncement({
        adminEmail,
        title: title.trim(),
        message: message.trim()
      })

      setSuccessMessage(
        `Announcement sent successfully! Notifications sent to ${result.notificationsSent} of ${result.totalSubscriptions} subscribers.`
      )

      // Clear form
      setTitle('')
      setMessage('')

      // Refresh announcements list
      await fetchAnnouncements()
    } catch (err) {
      console.error('Failed to send announcement:', err)
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleTestNotification = async () => {
    try {
      await testPushNotification()
      alert('Test notification sent! Check your notifications.')
    } catch (err) {
      alert(`Failed to send test notification: ${err.message}`)
    }
  }

  const handleClearAllAnnouncements = async () => {
    if (!confirm('Are you sure you want to delete ALL announcements? This cannot be undone.')) {
      return
    }

    try {
      setError(null)
      const response = await fetch('/api/admin/clear-announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to clear announcements')
      }

      setSuccessMessage(`Successfully cleared ${data.deletedCount} announcements`)
      setAnnouncements([])
    } catch (err) {
      console.error('Failed to clear announcements:', err)
      setError(err.message)
    }
  }

  const handleTriggerEventNotifications = async () => {
    try {
      setError(null)
      setSuccessMessage(null)
      const response = await fetch('/api/notifications/send-event-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to send event notifications')
      }

      const total = data.notifications.reminders24h + data.notifications.reminders1h + data.notifications.feedbackRequests
      setSuccessMessage(
        `Event notifications sent! 24h reminders: ${data.notifications.reminders24h}, 1h reminders: ${data.notifications.reminders1h}, Feedback requests: ${data.notifications.feedbackRequests}`
      )
    } catch (err) {
      console.error('Failed to trigger event notifications:', err)
      setError(err.message)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">📢</div>
          <p className="text-muted-foreground">Loading announcements...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Send New Announcement Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📢</span>
              Send Announcement
            </CardTitle>
            <CardDescription>
              Send a push notification to all users in the organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendAnnouncement} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-2">
                  Title
                </label>
                <Input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Event Reminder, Important Update"
                  maxLength={100}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {title.length}/100 characters
                </p>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your announcement message here..."
                  className="w-full min-h-[120px] p-3 rounded-md border border-input bg-background text-foreground resize-y"
                  maxLength={500}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {message.length}/500 characters
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive"
                >
                  {error}
                </motion.div>
              )}

              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-sm text-green-600 dark:text-green-400"
                >
                  {successMessage}
                </motion.div>
              )}

              <div className="space-y-3">
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={sending || !title.trim() || !message.trim()}
                    className="flex-1"
                  >
                    {sending ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <span className="mr-2">📤</span>
                        Send Announcement
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestNotification}
                  >
                    <span className="mr-2">🔔</span>
                    Test
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={handleTriggerEventNotifications}
                >
                  <span className="mr-2">⚡</span>
                  Trigger Event Notifications
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Sends 24h & 1h event reminders + post-event feedback requests
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Previous Announcements */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Previous Announcements</h2>
          {announcements.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearAllAnnouncements}
            >
              <span className="mr-2">🗑️</span>
              Clear All
            </Button>
          )}
        </div>

        {announcements.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-muted-foreground">No announcements yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Send your first announcement to notify all users!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {announcements.map((announcement, index) => (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{announcement.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Sent by {announcement.sender_email}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {formatDate(announcement.sent_at)}
                          </p>
                          {announcement.notification_sent && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              ✓ Sent to {announcement.recipient_count} users
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-foreground whitespace-pre-wrap">{announcement.message}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  )
}
