import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { getAllEvents } from '../services/eventApi'
import { saveRsvp, getUserRsvps, deleteRsvp } from '../services/rsvpApi'
import EventDetails from './EventDetails'
import { downloadICS } from '../utils/icsGenerator'

/**
 * EventsList Component
 * Displays all community events in calendar or list view
 */
export default function EventsList({ user, walletAddress }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [viewMode, setViewMode] = useState('list') // 'list' or 'calendar'
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [rsvpStatus, setRsvpStatus] = useState({})
  const [savingRsvp, setSavingRsvp] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)

  const eventTypeInfo = {
    code_and_coffee: { icon: '☕', label: 'Code and Coffee' },
    code_and_brews: { icon: '🍺', label: 'Code and Brews' },
    hackathon: { icon: '💻', label: 'Hackathon' }
  }

  useEffect(() => {
    fetchEvents()
  }, [filter])

  useEffect(() => {
    if (walletAddress && events.length > 0) {
      loadUserRsvps()
    }
  }, [walletAddress, events])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      setError(null)

      const options = filter === 'upcoming' ? { upcoming: true } : {}
      const data = await getAllEvents(options)
      setEvents(data.events || [])
    } catch (err) {
      console.error('Failed to fetch events:', err)
      setError(err.message || 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const loadUserRsvps = async () => {
    try {
      const data = await getUserRsvps(walletAddress)
      const rsvpMap = {}
      data.rsvps?.forEach(rsvp => {
        rsvpMap[rsvp.event_id] = rsvp.rsvp_status
      })
      setRsvpStatus(rsvpMap)
    } catch (err) {
      console.error('Failed to load RSVPs:', err)
    }
  }

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

  const handleRsvp = async (eventId, status) => {
    if (!walletAddress) {
      console.error('No wallet address available - user must be logged in')
      // Could show a toast notification here
      return
    }

    const newStatus = rsvpStatus[eventId] === status ? null : status
    const previousStatus = rsvpStatus[eventId]

    // Optimistically update UI
    setRsvpStatus(prev => ({
      ...prev,
      [eventId]: newStatus
    }))

    try {
      setSavingRsvp(eventId)

      if (!newStatus) {
        // If deselecting, delete the RSVP from database
        await deleteRsvp(eventId, walletAddress)
        console.log('✅ RSVP removed successfully:', { eventId })
      } else {
        // Otherwise, save/update the RSVP
        await saveRsvp({
          eventId,
          walletAddress,
          rsvpStatus: newStatus
        })
        console.log('✅ RSVP saved successfully:', { eventId, status: newStatus })
      }
    } catch (err) {
      console.error('Failed to save/remove RSVP:', err)
      // Revert optimistic update on error
      setRsvpStatus(prev => ({
        ...prev,
        [eventId]: previousStatus
      }))
      // Could show error toast here
    } finally {
      setSavingRsvp(null)
    }
  }

  // Calendar helpers
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    // Get first and last day of month
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // Get starting day of week (0 = Sunday)
    const startingDayOfWeek = firstDay.getDay()

    // Create calendar grid
    const daysInMonth = lastDay.getDate()
    const weeks = []
    let week = new Array(7).fill(null)

    // Fill in the days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = (startingDayOfWeek + day - 1) % 7
      week[dayOfWeek] = day

      if (dayOfWeek === 6 || day === daysInMonth) {
        weeks.push([...week])
        week = new Array(7).fill(null)
      }
    }

    return { year, month, weeks, daysInMonth }
  }, [currentMonth])

  const getEventsForDate = (day) => {
    if (!day) return []
    const dateStr = `${calendarData.year}-${String(calendarData.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(event => event.date === dateStr)
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December']

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border border-border/40 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="text-lg">⚠️</div>
          <div>
            <h3 className="font-medium mb-1">Error Loading Events</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={fetchEvents}
              className="mt-3 px-3 h-8 rounded-full border border-border/40 hover:bg-foreground/5 transition-colors text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Event Details Modal */}
      {selectedEvent && (
        <EventDetails
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          user={user}
          walletAddress={walletAddress}
          rsvpStatus={rsvpStatus[selectedEvent.id]}
          onRsvp={(status) => handleRsvp(selectedEvent.id, status)}
        />
      )}

      <div>
      {/* Filter and View Buttons */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 h-9 rounded-full text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-foreground text-background'
                : 'border border-border/40 hover:bg-foreground/5'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 h-9 rounded-full text-sm font-medium transition-colors ${
              filter === 'upcoming'
                ? 'bg-foreground text-background'
                : 'border border-border/40 hover:bg-foreground/5'
            }`}
          >
            Upcoming
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`w-9 h-9 rounded-full transition-colors flex items-center justify-center ${
              viewMode === 'list'
                ? 'bg-foreground/10'
                : 'hover:bg-foreground/5'
            }`}
            title="List View"
          >
            📋
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`w-9 h-9 rounded-full transition-colors flex items-center justify-center ${
              viewMode === 'calendar'
                ? 'bg-foreground/10'
                : 'hover:bg-foreground/5'
            }`}
            title="Calendar View"
          >
            📅
          </button>
        </div>
      </div>

      {/* Empty State */}
      {events.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📅</div>
          <h3 className="text-base font-medium mb-2">No Events Found</h3>
          <p className="text-sm text-muted-foreground">
            {filter === 'upcoming'
              ? 'No upcoming events scheduled yet.'
              : 'No events have been created yet.'}
          </p>
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && events.length > 0 && (
        <div>
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              className="px-4 h-9 rounded-full border border-border/40 hover:bg-foreground/5 transition-colors text-sm"
            >
              ← Prev
            </button>
            <h3 className="text-base font-medium">
              {monthNames[calendarData.month]} {calendarData.year}
            </h3>
            <button
              onClick={nextMonth}
              className="px-4 h-9 rounded-full border border-border/40 hover:bg-foreground/5 transition-colors text-sm"
            >
              Next →
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="border border-border/40 rounded-lg overflow-hidden">
            <div className="grid grid-cols-7 bg-foreground/5 border-b border-border/40">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center text-xs font-medium">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarData.weeks.map((week, weekIndex) => (
                week.map((day, dayIndex) => {
                  const dayEvents = getEventsForDate(day)
                  const isToday = day &&
                    new Date().getDate() === day &&
                    new Date().getMonth() === calendarData.month &&
                    new Date().getFullYear() === calendarData.year

                  return (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={`min-h-[100px] p-2 border-r border-b border-border/40 ${
                        day ? '' : 'bg-foreground/5'
                      } ${isToday ? 'bg-foreground/10' : ''}`}
                    >
                      {day && (
                        <>
                          <div className={`text-xs font-medium mb-1 ${isToday ? 'font-bold' : ''}`}>
                            {day}
                          </div>
                          <div className="space-y-1">
                            {dayEvents.map(event => {
                              const typeInfo = eventTypeInfo[event.event_type] || eventTypeInfo.code_and_coffee
                              return (
                                <div
                                  key={event.id}
                                  onClick={() => setSelectedEvent(event)}
                                  className="text-xs p-1 rounded bg-foreground/5 hover:bg-foreground/10 cursor-pointer transition-colors"
                                  title={`${event.title} - ${formatTime(event.time)}`}
                                >
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px]">{typeInfo.icon}</span>
                                    <span className="truncate">{event.title}</span>
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">{formatTime(event.time)}</div>
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })
              ))}
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && events.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((event) => {
          const typeInfo = eventTypeInfo[event.event_type] || eventTypeInfo.code_and_coffee

          return (
            <div
              key={event.id}
              className="border border-border/40 rounded-lg overflow-hidden hover:border-foreground/40 transition-colors cursor-pointer"
              onClick={() => setSelectedEvent(event)}
            >
              {/* Thumbnail Image */}
              {event.thumbnail_url && (
                <div className="w-full h-40 overflow-hidden bg-foreground/5">
                  <img
                    src={event.thumbnail_url}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-4">
                {/* Event Type */}
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="text-sm">{typeInfo.icon}</span>
                  <span className="text-xs text-muted-foreground">{typeInfo.label}</span>
                </div>

                {/* Event Title */}
                <h3 className="text-base font-medium mb-2 line-clamp-2">
                  {event.title}
                </h3>

                {/* Event Description */}
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {event.description}
                </p>

                {/* Event Details */}
                <div className="space-y-1.5 text-sm mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">📅</span>
                    <span className="text-xs">{formatDate(event.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">🕐</span>
                    <span className="text-xs">{formatTime(event.time)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">📍</span>
                    <span className="text-xs line-clamp-1">{event.location}</span>
                  </div>
                </div>

                {/* Add to Calendar Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    downloadICS(event)
                  }}
                  className="w-full mb-4 px-3 py-2 rounded-lg border border-border/40 hover:bg-foreground/5 transition-colors text-xs font-medium flex items-center justify-center gap-2"
                >
                  <span>📅</span>
                  <span>Add to Calendar</span>
                </button>

                {/* RSVP Options */}
                {walletAddress ? (
                  <div className="pt-4 border-t border-border/40">
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRsvp(event.id, 'going')
                        }}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-colors ${
                          rsvpStatus[event.id] === 'going'
                            ? 'border-foreground bg-foreground/10'
                            : 'border-border/40 hover:bg-foreground/5'
                        }`}
                      >
                        <span className="text-lg mb-0.5">✅</span>
                        <span className="text-xs">Going</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRsvp(event.id, 'maybe')
                        }}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-colors ${
                          rsvpStatus[event.id] === 'maybe'
                            ? 'border-foreground bg-foreground/10'
                            : 'border-border/40 hover:bg-foreground/5'
                        }`}
                      >
                        <span className="text-lg mb-0.5">🤔</span>
                        <span className="text-xs">Maybe</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRsvp(event.id, 'no')
                        }}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-colors ${
                          rsvpStatus[event.id] === 'no'
                            ? 'border-foreground bg-foreground/10'
                            : 'border-border/40 hover:bg-foreground/5'
                        }`}
                      >
                        <span className="text-lg mb-0.5">❌</span>
                        <span className="text-xs">No</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-border/40">
                    <p className="text-xs text-center text-muted-foreground">
                      Sign in to RSVP
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        </div>
      )}
      </div>
    </>
  )
}
