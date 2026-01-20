import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Drawer } from './ui/drawer'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Input } from './ui/input'
import { useAuth, useWallet } from '@crossmint/client-sdk-react-ui'

export function EventCheckInDrawer({ isOpen, onClose, eventId }) {
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

      // Check if event has a check-in form assigned
      if (!eventData.event.check_in_form_id) {
        setError('This event does not have a check-in form configured.')
        setLoading(false)
        return
      }

      // Fetch the form template
      const formRes = await fetch(`/api/form-templates/${eventData.event.check_in_form_id}`)
      const formData = await formRes.json()

      if (!formRes.ok) {
        throw new Error('Failed to load check-in form')
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

      if (!walletAddress) {
        throw new Error('Please log in to check in to this event')
      }

      if (!event?.check_in_code) {
        throw new Error('This event does not have a check-in code configured')
      }

      // Submit check-in with form responses using the correct API format
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkInCode: event.check_in_code,
          userWalletHash: walletAddress,
          customFormResponses: JSON.stringify(formResponses),
          formId: event.check_in_form_id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check in')
      }

      setSuccess(true)
    } catch (err) {
      console.error('Check-in error:', err)
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
            <p className="text-muted-foreground">Loading check-in form...</p>
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
            <h2 className="text-2xl font-bold mb-2">Check-in Successful!</h2>
            <p className="text-muted-foreground mb-6">You've successfully checked in to {event?.title}</p>
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
              <p className="text-muted-foreground">Check-In Form</p>
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
                    <div className="flex gap-2 justify-center">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handleInputChange(question.id, rating.toString());
                          }}
                          className={`p-3 rounded-lg transition-all touch-manipulation active:scale-95 ${
                            formResponses[question.id] && parseInt(formResponses[question.id]) >= rating
                              ? 'text-yellow-500 bg-yellow-500/10'
                              : 'text-gray-300 hover:text-yellow-400 active:text-yellow-400'
                          }`}
                          title={`${rating} star${rating !== 1 ? 's' : ''}`}
                        >
                          <span className="text-3xl leading-none block">⭐</span>
                        </button>
                      ))}
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
                      Checking in...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">✓</span>
                      Check In
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
