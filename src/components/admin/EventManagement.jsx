import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { getAllEvents, deleteEvent, createEvent, updateEvent } from '../../services/eventApi'
import { getEventStats } from '../../services/rsvpApi'
import { exportToCSV, formatDateForCSV } from '../../utils/csvExport'

/**
 * EventManagement Component
 * Comprehensive event management: list, create, edit, delete, view RSVPs
 */
export default function EventManagement({ user }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterTime, setFilterTime] = useState('all')
  const [showEventModal, setShowEventModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showRsvpModal, setShowRsvpModal] = useState(false)
  const [eventRsvps, setEventRsvps] = useState(null)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAllEvents()
      setEvents(data.events || [])
    } catch (err) {
      console.error('Failed to fetch events:', err)
      setError(err.message || 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  // Filter events
  const filteredEvents = useMemo(() => {
    let filtered = [...events]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(event =>
        event.title?.toLowerCase().includes(term) ||
        event.description?.toLowerCase().includes(term) ||
        event.location?.toLowerCase().includes(term)
      )
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(event => event.event_type === filterType)
    }

    // Time filter
    const now = new Date()
    if (filterTime === 'upcoming') {
      filtered = filtered.filter(event => new Date(event.date) >= now)
    } else if (filterTime === 'past') {
      filtered = filtered.filter(event => new Date(event.date) < now)
    }

    // Sort by date (most recent first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date))

    return filtered
  }, [events, searchTerm, filterType, filterTime])

  const handleDeleteEvent = async (event) => {
    const isPartOfSeries = event.parent_event_id || event.is_recurring

    let message = 'Are you sure you want to delete this event? This action cannot be undone.'
    let deleteSeries = false

    if (isPartOfSeries) {
      const choice = window.confirm(
        'This event is part of a recurring series.\n\n' +
        'Click OK to delete ONLY this event\n' +
        'Click Cancel to choose a different option'
      )

      if (!choice) {
        const deleteAll = window.confirm(
          'Do you want to delete ALL events in this series?\n\n' +
          'Click OK to delete the entire series\n' +
          'Click Cancel to abort'
        )

        if (!deleteAll) return // User cancelled
        deleteSeries = true
      }
    } else {
      const confirmed = window.confirm(message)
      if (!confirmed) return
    }

    try {
      const result = await deleteEvent(event.id, deleteSeries)

      if (deleteSeries) {
        // Remove all events in the series from the list
        const parentId = event.parent_event_id || event.id
        setEvents(prev => prev.filter(e => e.id !== parentId && e.parent_event_id !== parentId))
        alert(result.message || `Deleted ${result.deletedCount} events in series`)
      } else {
        // Remove just this event
        setEvents(prev => prev.filter(e => e.id !== event.id))
        alert('Event deleted successfully!')
      }
    } catch (err) {
      console.error('Failed to delete event:', err)
      alert(`Failed to delete event: ${err.message}`)
    }
  }

  const handleViewRsvps = async (event) => {
    try {
      const stats = await getEventStats(event.id)
      setEventRsvps({ event, stats })
      setShowRsvpModal(true)
    } catch (err) {
      console.error('Failed to fetch RSVPs:', err)
      alert(`Failed to load RSVPs: ${err.message}`)
    }
  }

  const handleEditEvent = (event) => {
    setSelectedEvent(event)
    setShowEventModal(true)
  }

  const handleCreateEvent = () => {
    setSelectedEvent(null)
    setShowEventModal(true)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const getEventTypeIcon = (type) => {
    const icons = {
      'code_and_coffee': '☕',
      'code_and_brews': '🍺',
      'hackathon': '💻',
      'workshop': '🎓',
      'meetup': '🤝'
    }
    return icons[type] || '📅'
  }

  const getEventTypeLabel = (type) => {
    const labels = {
      'code_and_coffee': 'Code & Coffee',
      'code_and_brews': 'Code & Brews',
      'hackathon': 'Hackathon',
      'workshop': 'Workshop',
      'meetup': 'Meetup'
    }
    return labels[type] || type
  }

  const isUpcoming = (dateStr) => {
    return new Date(dateStr) >= new Date()
  }

  const handleExportEvents = () => {
    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description' },
      { key: 'event_type', label: 'Event Type' },
      { key: 'date', label: 'Date' },
      { key: 'location', label: 'Location' },
      { key: 'capacity', label: 'Capacity' },
      { key: 'rsvp_count', label: 'RSVPs' },
      { key: 'check_in_code', label: 'Check-In Code' },
      { key: 'is_recurring', label: 'Is Recurring' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Created At' }
    ]

    const formattedData = events.map(event => ({
      ...event,
      date: formatDateForCSV(event.date),
      created_at: formatDateForCSV(event.created_at),
      status: isUpcoming(event.date) ? 'Upcoming' : 'Past'
    }))

    exportToCSV(formattedData, 'mitobyte_events', columns)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Event Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage all community events
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={handleExportEvents} variant="outline" className="flex-1 sm:flex-initial" disabled={events.length === 0}>
            📥 Export CSV
          </Button>
          <Button onClick={handleCreateEvent} className="flex-1 sm:flex-initial">
            <span className="mr-2">➕</span>
            Create Event
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <Input
            type="text"
            placeholder="🔍 Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All Types</option>
            <option value="code_and_coffee">☕ Code & Coffee</option>
            <option value="code_and_brews">🍺 Code & Brews</option>
            <option value="hackathon">💻 Hackathon</option>
            <option value="workshop">🎓 Workshop</option>
            <option value="meetup">🤝 Meetup</option>
          </select>

          {/* Time Filter */}
          <select
            value={filterTime}
            onChange={(e) => setFilterTime(e.target.value)}
            className="px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All Time</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past Events</option>
          </select>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">{events.length}</div>
          <div className="text-sm text-muted-foreground">Total Events</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">
            {events.filter(e => isUpcoming(e.date)).length}
          </div>
          <div className="text-sm text-muted-foreground">Upcoming</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">
            {events.filter(e => !isUpcoming(e.date)).length}
          </div>
          <div className="text-sm text-muted-foreground">Past</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{filteredEvents.length}</div>
          <div className="text-sm text-muted-foreground">Filtered</div>
        </Card>
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <div className="text-4xl mb-4">📅</div>
            <p>{searchTerm ? 'No events found matching your search' : 'No events yet'}</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredEvents.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-6 hover:border-primary/50 transition-colors">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  {/* Event Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="text-3xl flex-shrink-0">
                        {getEventTypeIcon(event.event_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-lg font-bold truncate">{event.title}</h3>
                          {isUpcoming(event.date) ? (
                            <Badge className="bg-green-600">Upcoming</Badge>
                          ) : (
                            <Badge variant="secondary">Past</Badge>
                          )}
                          {event.is_recurring && (
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                              🔁 Recurring Series
                            </Badge>
                          )}
                          {event.parent_event_id && (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                              🔁 Series Instance
                            </Badge>
                          )}
                          {event.check_in_form_id && (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                              ✓ Check-in
                            </Badge>
                          )}
                          {event.feedback_form_id && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                              ✓ Feedback
                            </Badge>
                          )}
                          {event.external_url && (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                              🔗 External
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {event.description}
                        </p>
                        {event.external_url && (
                          <a
                            href={event.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                          >
                            🔗 View on external platform
                          </a>
                        )}
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span>📅 {formatDate(event.date)}</span>
                          <span>🕒 {event.time}</span>
                          <span>📍 {event.location}</span>
                          {event.capacity && (
                            <span>👥 Cap: {event.capacity}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewRsvps(event)}
                      className="flex-1 sm:flex-none"
                    >
                      👥 RSVPs
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditEvent(event)}
                      className="flex-1 sm:flex-none"
                    >
                      ✏️ Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteEvent(event)}
                      className="text-destructive hover:bg-destructive/10 flex-1 sm:flex-none"
                    >
                      🗑️
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Event Create/Edit Modal */}
      <AnimatePresence>
        {showEventModal && (
          <EventModal
            event={selectedEvent}
            user={user}
            onClose={() => {
              setShowEventModal(false)
              setSelectedEvent(null)
            }}
            onSuccess={() => {
              fetchEvents()
              setShowEventModal(false)
              setSelectedEvent(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* RSVP View Modal */}
      <AnimatePresence>
        {showRsvpModal && eventRsvps && (
          <RsvpModal
            eventRsvps={eventRsvps}
            onClose={() => {
              setShowRsvpModal(false)
              setEventRsvps(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * EventModal Component
 * Modal for creating or editing an event
 */
function EventModal({ event, user, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    date: event?.date || '',
    time: event?.time || '',
    location: event?.location || '',
    capacity: event?.capacity || '',
    eventType: event?.event_type || 'code_and_coffee',
    isRecurring: event?.is_recurring || false,
    recurringPattern: event?.recurring_pattern || 'weekly',
    recurringEndDate: event?.recurring_end_date || '',
    thumbnailUrl: event?.thumbnail_url || '',
    checkInFormId: event?.check_in_form_id || null,
    feedbackFormId: event?.feedback_form_id || null,
    externalUrl: event?.external_url || ''
  })
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [thumbnailPreview, setThumbnailPreview] = useState(event?.thumbnail_url || null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [updateSeries, setUpdateSeries] = useState(false)
  const [checkInForms, setCheckInForms] = useState([])
  const [feedbackForms, setFeedbackForms] = useState([])
  const [loadingForms, setLoadingForms] = useState(true)

  const isPartOfSeries = event && (event.parent_event_id || event.is_recurring)

  // Fetch form templates on mount
  useEffect(() => {
    const fetchForms = async () => {
      try {
        setLoadingForms(true)
        const response = await fetch('/api/form-templates-manager?includeCustom=true')
        const data = await response.json()

        if (data.success) {
          const templates = data.templates || []
          setCheckInForms(templates.filter(t => t.form_type === 'check-in'))
          setFeedbackForms(templates.filter(t => t.form_type === 'feedback'))
        }
      } catch (error) {
        console.error('Failed to fetch form templates:', error)
      } finally {
        setLoadingForms(false)
      }
    }

    fetchForms()
  }, [])

  const eventTypes = [
    { value: 'code_and_coffee', label: 'Code and Coffee', icon: '☕' },
    { value: 'code_and_brews', label: 'Code and Brews', icon: '🍺' },
    { value: 'hackathon', label: 'Hackathon', icon: '💻' },
    { value: 'workshop', label: 'Workshop', icon: '🎓' },
    { value: 'meetup', label: 'Meetup', icon: '🤝' }
  ]

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleThumbnailChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only images are allowed.')
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 5MB.')
      return
    }

    setThumbnailFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setThumbnailPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const clearThumbnail = () => {
    setThumbnailFile(null)
    setThumbnailPreview(null)
    setFormData(prev => ({ ...prev, thumbnailUrl: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      // Ensure native validation runs (especially in the modal)
      const formEl = e.currentTarget
      if (formEl && formEl.checkValidity && !formEl.checkValidity()) {
        formEl.reportValidity && formEl.reportValidity()
        setIsSubmitting(false)
        return
      }

      // Additional trimmed validation for text inputs
      const title = (formData.title || '').trim()
      const description = (formData.description || '').trim()
      const locationVal = (formData.location || '').trim()
      const dateVal = formData.date || ''
      const timeVal = formData.time || ''
      const missing = []
      if (!title) missing.push('Event Title')
      if (!description) missing.push('Description')
      if (!dateVal) missing.push('Date')
      if (!timeVal) missing.push('Time')
      if (!locationVal) missing.push('Location')
      if (missing.length) {
        setError(`Please fill in required fields: ${missing.join(', ')}`)
        setIsSubmitting(false)
        return
      }

      let thumbnailUrl = formData.thumbnailUrl

      // Upload thumbnail if file is selected
      if (thumbnailFile) {
        setUploadingImage(true)
        try {
          const uploadFormData = new FormData()
          uploadFormData.append('file', thumbnailFile)

          const uploadResponse = await fetch('/api/upload-thumbnail', {
            method: 'POST',
            body: uploadFormData
          })

          if (!uploadResponse.ok) {
            throw new Error('Failed to upload thumbnail')
          }

          const uploadData = await uploadResponse.json()
          thumbnailUrl = uploadData.url
        } catch (uploadError) {
          console.error('Thumbnail upload failed:', uploadError)
          setError('Failed to upload thumbnail. Please try again.')
          return
        } finally {
          setUploadingImage(false)
        }
      }

      const eventData = {
        title,
        description,
        eventType: formData.eventType,
        date: dateVal,
        time: timeVal,
        location: locationVal,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        createdBy: user?.email || null,
        isRecurring: formData.isRecurring,
        recurringPattern: formData.isRecurring ? formData.recurringPattern : null,
        recurringEndDate: formData.isRecurring ? formData.recurringEndDate : null,
        thumbnailUrl: thumbnailUrl || null,
        checkInFormId: formData.checkInFormId || null,
        feedbackFormId: formData.feedbackFormId || null,
        externalUrl: formData.externalUrl || null
      }

      if (event) {
        const result = await updateEvent(event.id, eventData, updateSeries)
        if (result.updatedCount > 1) {
          alert(`Updated ${result.updatedCount} events in series`)
        }
      } else {
        await createEvent(eventData)
      }

      onSuccess()
    } catch (err) {
      console.error('Failed to save event:', err)
      setError(err.message || 'Failed to save event')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-background border border-border rounded-lg p-4 sm:p-6 max-w-2xl w-full my-2 sm:my-8 max-h-[95vh] overflow-y-auto"
      >
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">
            {event ? 'Edit Event' : 'Create Event'}
          </h2>
          <p className="text-muted-foreground text-sm">
            {event ? 'Update event details' : 'Add a new community event'}
          </p>
          {isPartOfSeries && (
            <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-primary/20">🔁 Recurring Series</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                This event is part of a recurring series
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateSeries}
                  onChange={(e) => setUpdateSeries(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring flex-shrink-0"
                />
                <span className="text-sm font-medium">
                  Apply changes to all events in this series
                </span>
              </label>
              <p className="text-xs text-muted-foreground mt-1 ml-6">
                {updateSeries
                  ? 'All events in the series will be updated (dates will remain unchanged)'
                  : 'Only this specific event occurrence will be updated'}
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 w-full">
          {/* Event Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-2">
              Event Title *
            </label>
            <Input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              placeholder="Milwaukee Tech Meetup"
              required
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium mb-2 sm:mb-3">
              Event Type *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 w-full">
              {eventTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, eventType: type.value }))}
                  className={`p-3 rounded-lg border-2 transition-all min-w-0 ${
                    formData.eventType === type.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-2xl mb-1">{type.icon}</div>
                  <div className="text-xs font-medium break-words">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your event..."
              required
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
            <div>
              <label htmlFor="date" className="block text-sm font-medium mb-2">
                Date *
              </label>
              <Input
                id="date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="time" className="block text-sm font-medium mb-2">
                Time *
              </label>
              <Input
                id="time"
                name="time"
                type="time"
                value={formData.time}
                onChange={handleChange}
                required
                className="w-full"
              />
            </div>
          </div>

          {/* Location and Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
            <div>
              <label htmlFor="location" className="block text-sm font-medium mb-2">
                Location *
              </label>
              <Input
                id="location"
                name="location"
                type="text"
                value={formData.location}
                onChange={handleChange}
                placeholder="The Commons, Milwaukee"
                required
              />
            </div>
            <div>
              <label htmlFor="capacity" className="block text-sm font-medium mb-2">
                Capacity
              </label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                value={formData.capacity}
                onChange={handleChange}
                placeholder="50"
                min="1"
              />
            </div>
          </div>

          {/* External Event Link */}
          <div className="space-y-3 border border-border rounded-lg p-4 bg-blue-50/50 dark:bg-blue-950/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🔗</span>
              <h3 className="text-sm font-semibold">External Event Link (Optional)</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              If this event is hosted on another platform (Eventbrite, Meetup, etc.), add the link here.
              Attendees will be directed to the external platform for registration while still accessing Mitobyte features like check-in and feedback.
            </p>
            <div>
              <label htmlFor="externalUrl" className="block text-sm font-medium mb-2">
                External Event URL
              </label>
              <Input
                id="externalUrl"
                name="externalUrl"
                type="url"
                value={formData.externalUrl}
                onChange={handleChange}
                placeholder="https://eventbrite.com/event/..."
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave blank if hosting directly on Mitobyte
              </p>
            </div>
          </div>

          {/* Form Assignments */}
          <div className="space-y-4 border border-border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📋</span>
              <h3 className="text-sm font-semibold">Event Forms</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Assign check-in and feedback forms to this event
            </p>

            {/* Check-In Form Selection */}
            <div>
              <label htmlFor="checkInFormId" className="block text-sm font-medium mb-2">
                Check-In Form (Optional)
              </label>
              <select
                id="checkInFormId"
                name="checkInFormId"
                value={formData.checkInFormId || ''}
                onChange={(e) => setFormData(prev => ({...prev, checkInFormId: e.target.value || null}))}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={loadingForms}
              >
                <option value="">None - No check-in form</option>
                {checkInForms.map(form => (
                  <option key={form.id} value={form.id}>
                    {form.name} {form.is_system === 1 ? '(System)' : '(Custom)'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Form attendees fill out when checking in to the event
              </p>
            </div>

            {/* Feedback Form Selection */}
            <div>
              <label htmlFor="feedbackFormId" className="block text-sm font-medium mb-2">
                Feedback Form (Optional)
              </label>
              <select
                id="feedbackFormId"
                name="feedbackFormId"
                value={formData.feedbackFormId || ''}
                onChange={(e) => setFormData(prev => ({...prev, feedbackFormId: e.target.value || null}))}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={loadingForms}
              >
                <option value="">None - No feedback form</option>
                {feedbackForms.map(form => (
                  <option key={form.id} value={form.id}>
                    {form.name} {form.is_system === 1 ? '(System)' : '(Custom)'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Form attendees fill out to provide feedback after the event
              </p>
            </div>
          </div>

          {/* Thumbnail Upload */}
          <div className="space-y-2 sm:space-y-3 w-full">
            <label className="block text-sm font-medium">
              Event Thumbnail (optional)
            </label>

            {/* Upload or URL options */}
            <div className="flex flex-col space-y-2 sm:space-y-3 w-full">
              {/* File Upload */}
              <div className="w-full">
                <label
                  htmlFor="thumbnail-file-modal"
                  className="flex items-center justify-center w-full p-3 sm:p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">🖼️</div>
                    <div className="text-sm font-medium">Upload Image</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Click to select (max 5MB)
                    </div>
                  </div>
                  <input
                    id="thumbnail-file-modal"
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* OR divider */}
              <div className="flex items-center space-x-2 w-full">
                <div className="flex-1 h-px bg-border"></div>
                <span className="text-xs text-muted-foreground flex-shrink-0">OR</span>
                <div className="flex-1 h-px bg-border"></div>
              </div>

              {/* URL Input */}
              <div className="w-full">
                <Input
                  id="thumbnailUrl"
                  name="thumbnailUrl"
                  type="url"
                  value={formData.thumbnailUrl}
                  onChange={handleChange}
                  placeholder="https://example.com/image.jpg"
                  className="w-full"
                  disabled={!!thumbnailFile}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Or paste an image URL
                </p>
              </div>
            </div>

            {/* Thumbnail Preview */}
            {(thumbnailPreview || formData.thumbnailUrl) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative rounded-lg overflow-hidden border border-border"
              >
                <img
                  src={thumbnailPreview || formData.thumbnailUrl}
                  alt="Thumbnail preview"
                  className="w-full h-48 object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={clearThumbnail}
                  className="absolute top-2 right-2"
                >
                  Remove
                </Button>
              </motion.div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto min-w-[100px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || uploadingImage}
              className="w-full sm:w-auto min-w-[140px]"
            >
              {uploadingImage ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Uploading image...
                </>
              ) : isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  {event ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <span className="mr-2">{event ? '💾' : '➕'}</span>
                  {event ? 'Update Event' : 'Create Event'}
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

/**
 * RsvpModal Component
 * Modal for viewing event RSVPs
 */
function RsvpModal({ eventRsvps, onClose }) {
  const { event, stats } = eventRsvps

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-background border border-border rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
      >
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">{event.title}</h2>
          <p className="text-sm text-muted-foreground">Event RSVPs</p>
        </div>

        {/* RSVP Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-4 bg-green-500/10 border-green-500/20">
            <div className="text-3xl font-bold text-green-600">
              {stats.going || 0}
            </div>
            <div className="text-sm text-muted-foreground">Going</div>
          </Card>
          <Card className="p-4 bg-yellow-500/10 border-yellow-500/20">
            <div className="text-3xl font-bold text-yellow-600">
              {stats.maybe || 0}
            </div>
            <div className="text-sm text-muted-foreground">Maybe</div>
          </Card>
          <Card className="p-4 bg-red-500/10 border-red-500/20">
            <div className="text-3xl font-bold text-red-600">
              {stats.not_going || 0}
            </div>
            <div className="text-sm text-muted-foreground">Not Going</div>
          </Card>
        </div>

        <div className="text-center text-muted-foreground text-sm mb-6">
          <p>Total RSVPs: {(stats.going || 0) + (stats.maybe || 0) + (stats.not_going || 0)}</p>
          {event.capacity && (
            <p className="mt-1">
              Capacity: {stats.going || 0} / {event.capacity}
              {stats.going >= event.capacity && (
                <Badge className="ml-2 bg-red-600">Full</Badge>
              )}
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
