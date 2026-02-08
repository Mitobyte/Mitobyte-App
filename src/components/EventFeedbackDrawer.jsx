import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Drawer } from './ui/drawer'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Input } from './ui/input'
import { useAuth, useWallet } from '@crossmint/client-sdk-react-ui'

export function EventFeedbackDrawer({ isOpen, onClose, eventId }) {
  const [event, setEvent] = useState(null)
  const [formTemplate, setFormTemplate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [formResponses, setFormResponses] = useState({})
  const { user } = useAuth()
  const { wallet } = useWallet()

  useEffect(() => {
    if (isOpen && eventId) {
      fetchEventAndForm()
    }
  }, [isOpen, eventId])

  const fetchEventAndForm = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch event details
      const eventRes = await fetch(`/api/events/${eventId}`)
      const eventData = await eventRes.json()

      if (!eventRes.ok) {
        throw new Error(eventData.error || 'Event not found')
      }

      setEvent(eventData.event)

      // Check if event has a feedback form assigned
      if (!eventData.event.feedback_form_id) {
        setError('This event does not have a feedback form configured.')
        setLoading(false)
        return
      }

      // Fetch the form template
      const formRes = await fetch(`/api/form-templates/${eventData.event.feedback_form_id}`)
      const formData = await formRes.json()

      if (!formRes.ok) {
        throw new Error('Failed to load feedback form')
      }

      setFormTemplate(formData.template)

      // Initialize form responses
      const initialResponses = {}
      if (formData.template.questions) {
        formData.template.questions.forEach(q => {
          if (q.type === 'checkbox') {
            initialResponses[q.id] = []
          } else {
            initialResponses[q.id] = ''
          }
        })
      }
      setFormResponses(initialResponses)
    } catch (err) {
      console.error('Error fetching event/form:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (questionId, value, isCheckbox = false, optionValue = null) => {
    setFormResponses(prev => {
      if (isCheckbox) {
        const currentValues = prev[questionId] || []
        const newValues = currentValues.includes(optionValue)
          ? currentValues.filter(v => v !== optionValue)
          : [...currentValues, optionValue]
        return { ...prev, [questionId]: newValues }
      }
      return { ...prev, [questionId]: value }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const walletAddress = wallet?.address || (user?.email ? `email:${user.email}` : null)

      // Submit feedback (allow anonymous submissions)
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: parseInt(eventId),
          walletAddress: walletAddress || 'anonymous',
          formResponses: JSON.stringify(formResponses)
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback')
      }

      setSuccess(true)
    } catch (err) {
      console.error('Feedback submission error:', err)
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      <div className="p-6 max-w-2xl mx-auto">
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">Loading feedback form...</p>
          </div>
        )}

        {error && !event && !loading && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-2">Error</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold mb-2">Feedback Submitted!</h2>
            <p className="text-muted-foreground mb-6">Thank you for your feedback on {event?.title}</p>
            <Button onClick={onClose}>Close</Button>
          </motion.div>
        )}

        {event && formTemplate && !success && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">{event.title}</h2>
              <p className="text-muted-foreground">Event Feedback Form</p>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {formTemplate.questions?.map((question) => (
                <div key={question.id} className="space-y-2">
                  <label className="block text-sm font-medium">
                    {question.label}
                    {question.required && <span className="text-destructive ml-1">*</span>}
                  </label>

                  {question.type === 'text' && (
                    <Input
                      type="text"
                      value={formResponses[question.id] || ''}
                      onChange={(e) => handleInputChange(question.id, e.target.value)}
                      placeholder={question.placeholder}
                      required={question.required}
                    />
                  )}

                  {question.type === 'email' && (
                    <Input
                      type="email"
                      value={formResponses[question.id] || ''}
                      onChange={(e) => handleInputChange(question.id, e.target.value)}
                      placeholder={question.placeholder}
                      required={question.required}
                    />
                  )}

                  {question.type === 'number' && (
                    <Input
                      type="number"
                      value={formResponses[question.id] || ''}
                      onChange={(e) => handleInputChange(question.id, e.target.value)}
                      placeholder={question.placeholder}
                      required={question.required}
                    />
                  )}

                  {question.type === 'tel' && (
                    <Input
                      type="tel"
                      value={formResponses[question.id] || ''}
                      onChange={(e) => handleInputChange(question.id, e.target.value)}
                      placeholder={question.placeholder}
                      required={question.required}
                    />
                  )}

                  {question.type === 'textarea' && (
                    <textarea
                      value={formResponses[question.id] || ''}
                      onChange={(e) => handleInputChange(question.id, e.target.value)}
                      placeholder={question.placeholder}
                      required={question.required}
                      rows={4}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    />
                  )}

                  {question.type === 'select' && question.options && (
                    <select
                      value={formResponses[question.id] || ''}
                      onChange={(e) => handleInputChange(question.id, e.target.value)}
                      required={question.required}
                      className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Select an option...</option>
                      {question.options.map((option, idx) => (
                        <option key={idx} value={option}>{option}</option>
                      ))}
                    </select>
                  )}

                  {question.type === 'radio' && question.options && (
                    <div className="space-y-2">
                      {question.options.map((option, idx) => (
                        <label key={idx} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name={question.id}
                            value={option}
                            checked={formResponses[question.id] === option}
                            onChange={(e) => handleInputChange(question.id, e.target.value)}
                            required={question.required}
                            className="h-4 w-4"
                          />
                          <span className="text-sm">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.type === 'checkbox' && question.options && (
                    <div className="space-y-2">
                      {question.options.map((option, idx) => (
                        <label key={idx} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={(formResponses[question.id] || []).includes(option)}
                            onChange={() => handleInputChange(question.id, null, true, option)}
                            className="h-4 w-4 rounded border-input"
                          />
                          <span className="text-sm">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.type === 'rating' && (
                    <div className="flex gap-1 justify-center py-2">
                      {[1, 2, 3, 4, 5].map((rating) => {
                        const isSelected = formResponses[question.id] && parseInt(formResponses[question.id]) >= rating;
                        return (
                          <button
                            key={rating}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              handleInputChange(question.id, rating.toString());
                            }}
                            className={`p-3 sm:p-4 rounded-xl transition-all touch-manipulation hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50 ${isSelected
                                ? 'text-yellow-400 scale-105'
                                : 'text-muted-foreground/30 hover:text-yellow-400/70'
                              }`}
                            title={`${rating} star${rating !== 1 ? 's' : ''}`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill={isSelected ? "currentColor" : "none"}
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-sm"
                            >
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">📝</span>
                      Submit Feedback
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </Drawer>
  )
}
