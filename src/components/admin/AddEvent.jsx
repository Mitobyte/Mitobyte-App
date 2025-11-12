import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card } from '../ui/card'
import { createEvent } from '../../services/eventApi'

/**
 * AddEvent Component
 * Form for admins and hosts to create new community events
 */
export default function AddEvent({ user, isHost = false }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    capacity: '',
    eventType: isHost ? 'hackathon' : 'code_and_coffee', // Default based on role
    isRecurring: false,
    recurringPattern: 'weekly',
    recurringEndDate: '',
    thumbnailUrl: '',
    checkInFormId: '',
    feedbackFormId: ''
  })
  const [thumbnailPreview, setThumbnailPreview] = useState(null)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null)
  const [checkInTemplates, setCheckInTemplates] = useState([])
  const [feedbackTemplates, setFeedbackTemplates] = useState([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [showQRModal, setShowQRModal] = useState(false)
  const [createdEvent, setCreatedEvent] = useState(null)

  // Fetch form templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const [checkInRes, feedbackRes] = await Promise.all([
          fetch('/api/form-templates?type=check-in'),
          fetch('/api/form-templates?type=feedback')
        ])

        const checkInData = await checkInRes.json()
        const feedbackData = await feedbackRes.json()

        if (checkInData.success) {
          setCheckInTemplates(checkInData.templates)
        }
        if (feedbackData.success) {
          setFeedbackTemplates(feedbackData.templates)
        }
      } catch (error) {
        console.error('Failed to fetch form templates:', error)
      } finally {
        setLoadingTemplates(false)
      }
    }

    fetchTemplates()
  }, [])

  // Define all event types
  const allEventTypes = [
    { value: 'code_and_coffee', label: '☕ Code and Coffee', icon: '☕', adminOnly: true },
    { value: 'code_and_brews', label: '🍺 Code and Brews', icon: '🍺', adminOnly: true },
    { value: 'hackathon', label: '💻 Hackathon', icon: '💻', adminOnly: false },
    { value: 'workshop', label: '🎓 Workshop', icon: '🎓', adminOnly: false },
    { value: 'meetup', label: '🤝 Meetup', icon: '🤝', adminOnly: false }
  ]

  // Filter event types based on user role
  const eventTypes = isHost
    ? allEventTypes.filter(type => !type.adminOnly)
    : allEventTypes

  const recurringPatterns = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Every 2 Weeks' },
    { value: 'monthly', label: 'Monthly' }
  ]

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleThumbnailChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setThumbnailFile(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setThumbnailPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const clearThumbnail = () => {
    setThumbnailFile(null)
    setThumbnailPreview(null)
    setFormData(prev => ({ ...prev, thumbnailUrl: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      let thumbnailUrl = formData.thumbnailUrl

      // Upload thumbnail if file is selected
      if (thumbnailFile) {
        try {
          const formData = new FormData()
          formData.append('file', thumbnailFile)

          const uploadResponse = await fetch('/api/upload-thumbnail', {
            method: 'POST',
            body: formData
          })

          if (!uploadResponse.ok) {
            throw new Error('Failed to upload thumbnail')
          }

          const uploadData = await uploadResponse.json()
          thumbnailUrl = uploadData.url
        } catch (uploadError) {
          console.error('Thumbnail upload failed:', uploadError)
          setSubmitStatus({ type: 'error', message: 'Failed to upload thumbnail. Event not created.' })
          setIsSubmitting(false)
          return
        }
      }

      // Create event via API
      const eventData = {
        title: formData.title,
        description: formData.description,
        eventType: formData.eventType,
        date: formData.date,
        time: formData.time,
        location: formData.location,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        createdBy: user?.email || null,
        isRecurring: formData.isRecurring,
        recurringPattern: formData.isRecurring ? formData.recurringPattern : null,
        recurringEndDate: formData.isRecurring ? formData.recurringEndDate : null,
        thumbnailUrl: thumbnailUrl || null,
        checkInFormId: formData.checkInFormId ? parseInt(formData.checkInFormId) : null,
        feedbackFormId: formData.feedbackFormId ? parseInt(formData.feedbackFormId) : null
      }

      const result = await createEvent(eventData)

      setSubmitStatus({ type: 'success', message: 'Event created successfully!' })

      // Show QR modal if forms were assigned
      if (formData.checkInFormId || formData.feedbackFormId) {
        setCreatedEvent({
          id: result.eventId,
          title: formData.title,
          check_in_form_id: formData.checkInFormId,
          feedback_form_id: formData.feedbackFormId
        })
        setShowQRModal(true)
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        capacity: '',
        eventType: 'code_and_coffee',
        isRecurring: false,
        recurringPattern: 'weekly',
        recurringEndDate: '',
        thumbnailUrl: '',
        checkInFormId: '',
        feedbackFormId: ''
      })
      setThumbnailFile(null)
      setThumbnailPreview(null)
    } catch (error) {
      console.error('Failed to create event:', error)
      setSubmitStatus({ type: 'error', message: error.message || 'Failed to create event' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-2 sm:px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        <Card className="p-4 sm:p-6 w-full">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Create Event</h2>
            <p className="text-muted-foreground text-sm">
              Add a new community event
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 w-full">
            {/* Event Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1.5 sm:mb-2">
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
                className="w-full"
              />
            </div>

            {/* Event Type */}
            <div>
              <label className="block text-sm font-medium mb-2 sm:mb-3">
                Event Type *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 w-full">
                {eventTypes.map((type) => (
                  <motion.button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, eventType: type.value }))}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-3 rounded-lg border-2 transition-all min-w-0 ${
                      formData.eventType === type.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="text-2xl mb-1">{type.icon}</div>
                    <div className="text-xs font-medium break-words">
                      {type.label.replace(/^.\s/, '')}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1.5 sm:mb-2">
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
                      <div className="text-2xl mb-1">🖼️</div>
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

            {/* Date and Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium mb-1.5 sm:mb-2">
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
                <label htmlFor="time" className="block text-sm font-medium mb-1.5 sm:mb-2">
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

            {/* Recurring Event Options */}
            <div className="border border-border rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4 w-full">
              <div className="flex items-center space-x-3">
                <input
                  id="isRecurring"
                  name="isRecurring"
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring flex-shrink-0"
                />
                <label htmlFor="isRecurring" className="text-sm font-medium cursor-pointer">
                  🔁 Make this a recurring event
                </label>
              </div>

              {formData.isRecurring && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2 w-full"
                >
                  <div>
                    <label htmlFor="recurringPattern" className="block text-sm font-medium mb-2">
                      Repeat Pattern *
                    </label>
                    <select
                      id="recurringPattern"
                      name="recurringPattern"
                      value={formData.recurringPattern}
                      onChange={handleChange}
                      required={formData.isRecurring}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {recurringPatterns.map((pattern) => (
                        <option key={pattern.value} value={pattern.value}>
                          {pattern.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="recurringEndDate" className="block text-sm font-medium mb-2">
                      Repeat Until *
                    </label>
                    <Input
                      id="recurringEndDate"
                      name="recurringEndDate"
                      type="date"
                      value={formData.recurringEndDate}
                      onChange={handleChange}
                      required={formData.isRecurring}
                      min={formData.date}
                      className="w-full"
                    />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Form Selection */}
            <div className="border border-border rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4 w-full">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg flex-shrink-0">📋</span>
                <h3 className="text-sm font-semibold">Event Forms</h3>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Select pre-built forms for check-in and feedback, or skip to create custom forms later
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
                {/* Check-In Form Selection */}
                <div>
                  <label htmlFor="checkInFormId" className="block text-sm font-medium mb-2">
                    Check-In Form (Optional)
                  </label>
                  {loadingTemplates ? (
                    <div className="text-xs text-muted-foreground">Loading templates...</div>
                  ) : (
                    <select
                      id="checkInFormId"
                      name="checkInFormId"
                      value={formData.checkInFormId}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">No check-in form</option>
                      {checkInTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Form shown when attendees check in
                  </p>
                </div>

                {/* Feedback Form Selection */}
                <div>
                  <label htmlFor="feedbackFormId" className="block text-sm font-medium mb-2">
                    Feedback Form (Optional)
                  </label>
                  {loadingTemplates ? (
                    <div className="text-xs text-muted-foreground">Loading templates...</div>
                  ) : (
                    <select
                      id="feedbackFormId"
                      name="feedbackFormId"
                      value={formData.feedbackFormId}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">No feedback form</option>
                      {feedbackTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Form for attendees to provide feedback
                  </p>
                </div>
              </div>
            </div>

            {/* Location and Capacity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label htmlFor="location" className="block text-sm font-medium mb-1.5 sm:mb-2">
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
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="capacity" className="block text-sm font-medium mb-1.5 sm:mb-2">
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
                  className="w-full"
                />
              </div>
            </div>

            {/* Submit Status */}
            {submitStatus && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border ${
                  submitStatus.type === 'success'
                    ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
                    : 'bg-destructive/10 border-destructive/20 text-destructive'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-xl">
                    {submitStatus.type === 'success' ? '✅' : '⚠️'}
                  </span>
                  <span className="text-sm font-medium">{submitStatus.message}</span>
                </div>
              </motion.div>
            )}

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-2 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormData({
                    title: '',
                    description: '',
                    date: '',
                    time: '',
                    location: '',
                    capacity: '',
                    eventType: 'code_and_coffee',
                    isRecurring: false,
                    recurringPattern: 'weekly',
                    recurringEndDate: '',
                    thumbnailUrl: '',
                    checkInFormId: '',
                    feedbackFormId: ''
                  })
                  setThumbnailFile(null)
                  setThumbnailPreview(null)
                  setSubmitStatus(null)
                }}
                disabled={isSubmitting}
                className="w-full sm:w-auto min-w-[100px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Creating...
                  </>
                ) : (
                  <>
                    <span className="mr-2">➕</span>
                    Create Event
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>

      {/* QR Code Success Modal */}
      {showQRModal && createdEvent && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowQRModal(false)
            setCreatedEvent(null)
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-background rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6"
          >
            <div className="mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Event Created Successfully!</h2>
                  <p className="text-muted-foreground">{createdEvent.title}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowQRModal(false)
                    setCreatedEvent(null)
                  }}
                >
                  ✕
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Check-in QR Code */}
              {createdEvent.check_in_form_id && (
                <Card className="p-6">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold mb-2 flex items-center justify-center gap-2">
                        <span>📱</span> Check-in QR Code
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Scan this QR code to check in to the event
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                          `${window.location.origin}/event/${createdEvent.id}/check-in`
                        )}`}
                        alt="Check-in QR Code"
                        className="w-64 h-64"
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Or visit directly:</p>
                      <a
                        href={`/event/${createdEvent.id}/check-in`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline break-all"
                      >
                        {window.location.origin}/event/{createdEvent.id}/check-in
                      </a>
                    </div>
                  </div>
                </Card>
              )}

              {/* Feedback QR Code */}
              {createdEvent.feedback_form_id && (
                <Card className="p-6">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold mb-2 flex items-center justify-center gap-2">
                        <span>📝</span> Feedback QR Code
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Scan this QR code to submit event feedback
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                          `${window.location.origin}/event/${createdEvent.id}/feedback`
                        )}`}
                        alt="Feedback QR Code"
                        className="w-64 h-64"
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Or visit directly:</p>
                      <a
                        href={`/event/${createdEvent.id}/feedback`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline break-all"
                      >
                        {window.location.origin}/event/{createdEvent.id}/feedback
                      </a>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  window.open(`/event/${createdEvent.id}`, '_blank')
                }}
              >
                View Event Page
              </Button>
              <Button
                onClick={() => {
                  setShowQRModal(false)
                  setCreatedEvent(null)
                }}
              >
                Done
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
