import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { getAllEvents, deleteEvent } from '../../services/eventApi'
import { getEventStats } from '../../services/rsvpApi'
import EventQRCode from '../EventQRCode'

/**
 * EventStatsView Component
 * Displays events with RSVP statistics for admin dashboard
 */
export default function EventStatsView() {
  const [events, setEvents] = useState([])
  const [eventStats, setEventStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [loadingStats, setLoadingStats] = useState({})
  const [deletingEvent, setDeletingEvent] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [eventToDelete, setEventToDelete] = useState(null)
  const [expandedEventId, setExpandedEventId] = useState(null)

  const eventTypeInfo = {
    code_and_coffee: { icon: '☕', label: 'Code and Coffee', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    code_and_brews: { icon: '🍺', label: 'Code and Brews', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    hackathon: { icon: '💻', label: 'Hackathon', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await getAllEvents()
      setEvents(data.events || [])

      // Load stats for all events
      const statsPromises = data.events.map(event => loadEventStats(event.id))
      await Promise.all(statsPromises)
    } catch (err) {
      console.error('Failed to fetch events:', err)
      setError(err.message || 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const loadEventStats = async (eventId) => {
    try {
      setLoadingStats(prev => ({ ...prev, [eventId]: true }))
      const data = await getEventStats(eventId)
      setEventStats(prev => ({
        ...prev,
        [eventId]: data.rsvpStats
      }))
    } catch (err) {
      console.error(`Failed to load stats for event ${eventId}:`, err)
    } finally {
      setLoadingStats(prev => ({ ...prev, [eventId]: false }))
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const handleDeleteClick = (event) => {
    setEventToDelete(event)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return

    try {
      setDeletingEvent(eventToDelete.id)
      await deleteEvent(eventToDelete.id)

      // Remove event from local state
      setEvents(prev => prev.filter(e => e.id !== eventToDelete.id))
      setEventStats(prev => {
        const newStats = { ...prev }
        delete newStats[eventToDelete.id]
        return newStats
      })

      setShowDeleteConfirm(false)
      setEventToDelete(null)
    } catch (err) {
      console.error('Failed to delete event:', err)
      alert(`Failed to delete event: ${err.message}`)
    } finally {
      setDeletingEvent(null)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
    setEventToDelete(null)
  }

  const toggleQRCode = (eventId) => {
    setExpandedEventId(expandedEventId === eventId ? null : eventId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">Loading events...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-destructive/10 border border-destructive/20 rounded-lg p-6"
      >
        <div className="flex items-start space-x-3">
          <div className="text-2xl">⚠️</div>
          <div>
            <h3 className="font-semibold text-destructive mb-1">Error Loading Events</h3>
            <p className="text-sm text-destructive/80">{error}</p>
            <Button
              onClick={fetchEvents}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              Retry
            </Button>
          </div>
        </div>
      </motion.div>
    )
  }

  if (events.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-xl font-semibold mb-2">No Events Created</h3>
        <p className="text-muted-foreground">
          Create your first event to see statistics here.
        </p>
      </motion.div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">
          Showing {events.length} event{events.length !== 1 ? 's' : ''}
        </p>
        <Button
          onClick={fetchEvents}
          variant="ghost"
          size="sm"
        >
          🔄 Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {events.map((event, index) => {
          const typeInfo = eventTypeInfo[event.event_type] || eventTypeInfo.code_and_coffee
          const stats = eventStats[event.id] || { going: 0, maybe: 0, no: 0, total: 0 }
          const isLoadingStats = loadingStats[event.id]

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  {/* Event Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <Badge variant="outline" className={typeInfo.color}>
                        <span className="mr-1">{typeInfo.icon}</span>
                        {typeInfo.label}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(event)}
                        disabled={deletingEvent === event.id}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        {deletingEvent === event.id ? '⏳' : '🗑️'} Delete
                      </Button>
                    </div>

                    <h3 className="text-lg font-bold mb-2">{event.title}</h3>

                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-2">
                      <span>📅 {formatDate(event.date)}</span>
                      <span>🕐 {formatTime(event.time)}</span>
                      <span>📍 {event.location}</span>
                      {event.capacity && <span>👥 {event.capacity} capacity</span>}
                    </div>
                  </div>

                  {/* RSVP Stats */}
                  <div className="md:min-w-[300px]">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold mb-3">RSVP Statistics</h4>

                      {isLoadingStats ? (
                        <div className="text-center py-4">
                          <div className="animate-spin text-2xl">⏳</div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm flex items-center gap-2">
                              <span className="text-lg">✅</span>
                              <span>Going</span>
                            </span>
                            <span className="font-bold text-green-600">{stats.going}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm flex items-center gap-2">
                              <span className="text-lg">🤔</span>
                              <span>Maybe</span>
                            </span>
                            <span className="font-bold text-yellow-600">{stats.maybe}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm flex items-center gap-2">
                              <span className="text-lg">❌</span>
                              <span>No</span>
                            </span>
                            <span className="font-bold text-red-600">{stats.no}</span>
                          </div>
                          <div className="border-t pt-2 mt-2">
                            <div className="flex items-center justify-between font-semibold">
                              <span className="text-sm">Total Responses</span>
                              <span>{stats.total}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* QR Code Button */}
                {event.check_in_code && (
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => toggleQRCode(event.id)}
                      className="w-full"
                    >
                      {expandedEventId === event.id ? '📱 Hide QR Code' : '📱 Show Check-In QR Code'}
                    </Button>
                  </div>
                )}

                {/* QR Code Display */}
                {expandedEventId === event.id && event.check_in_code && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4"
                  >
                    <EventQRCode event={event} />
                  </motion.div>
                )}
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && eventToDelete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleDeleteCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-background border border-border rounded-lg p-6 max-w-md w-full"
          >
            <div className="flex items-start space-x-3 mb-4">
              <div className="text-3xl">⚠️</div>
              <div>
                <h3 className="text-lg font-bold mb-2">Delete Event?</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Are you sure you want to delete "{eventToDelete.title}"?
                </p>
                <p className="text-sm text-destructive font-medium">
                  This will permanently delete the event and all associated RSVPs. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={handleDeleteCancel}
                disabled={deletingEvent === eventToDelete.id}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deletingEvent === eventToDelete.id}
              >
                {deletingEvent === eventToDelete.id ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Deleting...
                  </>
                ) : (
                  <>🗑️ Delete Event</>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
