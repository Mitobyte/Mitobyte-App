import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { downloadICS } from '../utils/icsGenerator'

/**
 * EventDetails Component
 * Modal displaying full event information
 */
export default function EventDetails({ event, onClose, user, walletAddress, rsvpStatus, onRsvp }) {
  if (!event) return null

  const eventTypeInfo = {
    code_and_coffee: { icon: '☕', label: 'Code and Coffee', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    code_and_brews: { icon: '🍺', label: 'Code and Brews', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    hackathon: { icon: '💻', label: 'Hackathon', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' }
  }

  const typeInfo = eventTypeInfo[event.event_type] || eventTypeInfo.code_and_coffee

  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        >
          <Card className="overflow-hidden">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
            >
              <span className="text-xl">✕</span>
            </button>

            {/* Thumbnail Image */}
            {event.thumbnail_url && (
              <div className="w-full h-64 md:h-80 overflow-hidden">
                <img
                  src={event.thumbnail_url}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Event Content */}
            <div className="p-6 md:p-8">
              {/* Event Type Badge */}
              <div className="mb-4">
                <Badge variant="outline" className={`${typeInfo.color} text-base px-3 py-1`}>
                  <span className="mr-2">{typeInfo.icon}</span>
                  {typeInfo.label}
                </Badge>
              </div>

              {/* Event Title */}
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                {event.title}
              </h1>

              {/* Event Description */}
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                {event.description}
              </p>

              {/* Event Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-start space-x-3 p-4 rounded-lg bg-muted/30">
                  <span className="text-2xl">📅</span>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Date</div>
                    <div className="font-semibold">{formatDate(event.date)}</div>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 rounded-lg bg-muted/30">
                  <span className="text-2xl">🕐</span>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Time</div>
                    <div className="font-semibold">{formatTime(event.time)}</div>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 rounded-lg bg-muted/30">
                  <span className="text-2xl">📍</span>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Location</div>
                    <div className="font-semibold">{event.location}</div>
                  </div>
                </div>

                {event.capacity && (
                  <div className="flex items-start space-x-3 p-4 rounded-lg bg-muted/30">
                    <span className="text-2xl">👥</span>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Capacity</div>
                      <div className="font-semibold">{event.capacity} spots</div>
                    </div>
                  </div>
                )}

                {event.external_url && (
                  <div className="flex items-start space-x-3 p-4 rounded-lg bg-muted/30">
                    <span className="text-2xl">🔗</span>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Event Link</div>
                      <a
                        href={event.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-primary hover:underline break-all"
                      >
                        View on external platform
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Recurring Event Info */}
              {event.is_recurring && (
                <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-xl">🔁</span>
                    <span className="font-semibold">Recurring Event</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This event repeats {event.recurring_pattern} until {formatDate(event.recurring_end_date)}
                  </p>
                </div>
              )}

              {/* RSVP Section */}
              <div className="border-t pt-6">
                {walletAddress ? (
                  <>
                    <h3 className="text-lg font-semibold mb-4">Are you attending?</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onRsvp('going')}
                        className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                          rsvpStatus === 'going'
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-border hover:border-green-500/50'
                        }`}
                      >
                        <span className="text-3xl mb-2">✅</span>
                        <span className="text-sm font-medium">Going</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onRsvp('maybe')}
                        className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                          rsvpStatus === 'maybe'
                            ? 'border-yellow-500 bg-yellow-500/10'
                            : 'border-border hover:border-yellow-500/50'
                        }`}
                      >
                        <span className="text-3xl mb-2">🤔</span>
                        <span className="text-sm font-medium">Maybe</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onRsvp('no')}
                        className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                          rsvpStatus === 'no'
                            ? 'border-red-500 bg-red-500/10'
                            : 'border-border hover:border-red-500/50'
                        }`}
                      >
                        <span className="text-3xl mb-2">❌</span>
                        <span className="text-sm font-medium">No</span>
                      </motion.button>
                    </div>
                  </>
                ) : (
                  <div className="p-6 rounded-lg bg-primary/5 border border-primary/20 text-center">
                    <div className="text-4xl mb-3">🔐</div>
                    <h3 className="text-lg font-semibold mb-2">Sign in to RSVP</h3>
                    <p className="text-sm text-muted-foreground">
                      Join the community to RSVP for events and connect with other members
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <Button
                  onClick={() => downloadICS(event)}
                  variant="default"
                  className="w-full"
                >
                  <span className="mr-2">📅</span>
                  Add to Calendar
                </Button>
                <Button
                  onClick={() => {
                    // Share functionality - copy link or native share
                    if (navigator.share) {
                      navigator.share({
                        title: event.title,
                        text: event.description,
                        url: window.location.href
                      })
                    } else {
                      // Fallback: copy to clipboard
                      navigator.clipboard.writeText(window.location.href)
                    }
                  }}
                  variant="secondary"
                  className="w-full"
                >
                  <span className="mr-2">🔗</span>
                  Share
                </Button>
              </div>
              <div className="mt-3">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
