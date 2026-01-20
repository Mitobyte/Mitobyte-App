import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { parseEventWithAI } from '../../services/aiEventParser'
import { createEvent } from '../../services/eventApi'

/**
 * AIEventCreator Component
 * Create events using natural language AI parsing
 */
export default function AIEventCreator({ user, isHost = false }) {
  const [aiInput, setAiInput] = useState('')
  const [parsing, setParsing] = useState(false)
  const [formData, setFormData] = useState(null)
  const [aiConfidence, setAiConfidence] = useState(null)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [thumbnailPreview, setThumbnailPreview] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null)
  const [error, setError] = useState(null)
  const [checkInTemplates, setCheckInTemplates] = useState([])
  const [feedbackTemplates, setFeedbackTemplates] = useState([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)

  // Define all event types
  const allEventTypes = [
    { value: 'code_and_coffee', label: 'Code & Coffee', icon: '☕', adminOnly: true },
    { value: 'code_and_brews', label: 'Code & Brews', icon: '🍺', adminOnly: true },
    { value: 'hackathon', label: 'Hackathon', icon: '💻', adminOnly: false },
    { value: 'workshop', label: 'Workshop', icon: '🎓', adminOnly: false },
    { value: 'meetup', label: 'Meetup', icon: '🤝', adminOnly: false }
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

  // Fetch form templates on mount
  React.useEffect(() => {
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

  const handleAIParse = async () => {
    if (!aiInput.trim()) {
      setError('Please enter an event description')
      return
    }

    setParsing(true)
    setError(null)

    try {
      const result = await parseEventWithAI(aiInput, user.email)

      if (result.success && result.event) {
        setFormData({
          title: result.event.title,
          description: result.event.description,
          date: result.event.date,
          time: result.event.time,
          location: result.event.location,
          eventType: result.event.event_type,
          capacity: result.event.capacity || '',
          thumbnailUrl: '',
          isRecurring: false,
          recurringPattern: 'weekly',
          recurringEndDate: '',
          checkInFormId: '',
          feedbackFormId: ''
        })
        setAiConfidence(result.event.confidence)
        setError(null)
      } else {
        setError('AI could not parse the event. Please try a different description.')
      }
    } catch (err) {
      console.error('AI parsing failed:', err)
      setError(err.message || 'Failed to parse event with AI')
    } finally {
      setParsing(false)
    }
  }

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
    if (formData) {
      setFormData(prev => ({ ...prev, thumbnailUrl: '' }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      // Ensure native form validation runs (in modals, etc.)
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
        setSubmitStatus({ type: 'error', message: `Please fill in required fields: ${missing.join(', ')}` })
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
          setSubmitStatus({ type: 'error', message: 'Failed to upload thumbnail. Please try again.' })
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
        thumbnailUrl: thumbnailUrl || null,
        isRecurring: formData.isRecurring,
        recurringPattern: formData.isRecurring ? formData.recurringPattern : null,
        recurringEndDate: formData.isRecurring ? formData.recurringEndDate : null,
        checkInFormId: formData.checkInFormId ? parseInt(formData.checkInFormId) : null,
        feedbackFormId: formData.feedbackFormId ? parseInt(formData.feedbackFormId) : null
      }

      await createEvent(eventData)

      setSubmitStatus({ type: 'success', message: 'Event created successfully!' })

      // Reset form after delay
      setTimeout(() => {
        setFormData(null)
        setAiInput('')
        setAiConfidence(null)
        setThumbnailFile(null)
        setThumbnailPreview(null)
        setSubmitStatus(null)
      }, 2000)
    } catch (err) {
      console.error('Failed to create event:', err)
      setSubmitStatus({ type: 'error', message: err.message || 'Failed to create event' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setFormData(null)
    setAiInput('')
    setAiConfidence(null)
    setThumbnailFile(null)
    setThumbnailPreview(null)
    setError(null)
    setSubmitStatus(null)
  }

  return (
    <div className="space-y-6">
      {/* AI Input Section */}
      {!formData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center">
                  <span className="mr-2">✨</span>
                  Describe Your Event in Natural Language
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Tell me about the event you want to create, and I'll extract all the details for you!
                </p>
              </div>

              <textarea
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Example: 'We're hosting a React workshop next Friday at 6pm at Ward4. It's a hands-on session for 30 people to learn about React hooks and state management.'"
                rows={5}
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {error}
                </div>
              )}

              <Button
                onClick={handleAIParse}
                disabled={parsing || !aiInput.trim()}
                className="w-full sm:w-auto"
                size="lg"
              >
                {parsing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🤖</span>
                    Parse with AI
                  </>
                )}
              </Button>

              {/* Examples */}
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-semibold mb-2">💡 Example Descriptions:</h4>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li>"Code & Coffee this Saturday at 9am at Colectivo Coffee, casual coding session"</li>
                  <li>"Hosting a hackathon June 15-16 at UWM, 24 hour event for up to 100 participants"</li>
                  <li>"React workshop next Wednesday evening 6pm, Ward4, teaching hooks to 25 people"</li>
                  <li>"Code and Brews meetup Friday night 7pm at Good City Brewing"</li>
                </ul>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Event Form (After AI Parsing) */}
      <AnimatePresence>
        {formData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold flex items-center">
                    <span className="mr-2">📝</span>
                    Review & Edit Event Details
                  </h3>
                  {aiConfidence && (
                    <Badge variant={aiConfidence > 0.7 ? 'default' : 'secondary'}>
                      {Math.round(aiConfidence * 100)}% Confidence
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  AI has extracted the following details. Review and edit before creating the event.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
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
                    required
                  />
                </div>

                {/* Event Type */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Event Type *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {eventTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, eventType: type.value }))}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          formData.eventType === type.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="text-2xl mb-1">{type.icon}</div>
                        <div className="text-xs font-medium">{type.label}</div>
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
                    required
                    rows={3}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  />
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
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
                    />
                  </div>
                </div>

                {/* Location and Capacity */}
                <div className="grid grid-cols-2 gap-4">
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
                      min="1"
                    />
                  </div>
                </div>

                {/* Recurring Event Options */}
                <div className="border border-border rounded-lg p-4 space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      id="isRecurring"
                      name="isRecurring"
                      type="checkbox"
                      checked={formData.isRecurring}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
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
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2"
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
                        />
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Form Selection */}
                <div className="border border-border rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📋</span>
                    <h3 className="text-sm font-semibold">Event Forms</h3>
                  </div>
                  <p className="text-xs text-muted-foreground -mt-2">
                    Select pre-built forms for check-in and feedback, or skip to create custom forms later
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                {/* Thumbnail Upload */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium">
                    Event Thumbnail (optional)
                  </label>

                  {/* Upload or URL options */}
                  <div className="flex flex-col space-y-3">
                    {/* File Upload */}
                    <div>
                      <label
                        htmlFor="thumbnail-file-ai"
                        className="flex items-center justify-center w-full p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                      >
                        <div className="text-center">
                          <div className="text-3xl mb-2">🖼️</div>
                          <div className="text-sm font-medium">Upload Image</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Click to select (max 5MB)
                          </div>
                        </div>
                        <input
                          id="thumbnail-file-ai"
                          type="file"
                          accept="image/*"
                          onChange={handleThumbnailChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* OR divider */}
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 h-px bg-border"></div>
                      <span className="text-xs text-muted-foreground">OR</span>
                      <div className="flex-1 h-px bg-border"></div>
                    </div>

                    {/* URL Input */}
                    <div>
                      <Input
                        id="thumbnailUrl"
                        name="thumbnailUrl"
                        type="url"
                        value={formData.thumbnailUrl}
                        onChange={handleChange}
                        placeholder="https://example.com/image.jpg"
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

                {/* Actions */}
                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    disabled={isSubmitting}
                  >
                    Start Over
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || uploadingImage}
                    className="min-w-[140px]"
                  >
                    {uploadingImage ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Uploading...
                      </>
                    ) : isSubmitting ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <span className="mr-2">✨</span>
                        Create Event
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
