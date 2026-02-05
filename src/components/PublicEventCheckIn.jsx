import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Input } from './ui/input'

/**
 * Public Event Check-In Page
 * Allows guests to check in to events without logging in.
 * Collects basic info like name, email, and custom form responses.
 */
export function PublicEventCheckIn({ eventId, onNavigateHome }) {
    const [event, setEvent] = useState(null)
    const [formTemplate, setFormTemplate] = useState(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false)

    // Guest info
    const [guestName, setGuestName] = useState('')
    const [guestEmail, setGuestEmail] = useState('')

    // Custom form responses
    const [formResponses, setFormResponses] = useState({})

    useEffect(() => {
        if (eventId) {
            fetchEventAndForm()
        }
    }, [eventId])

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

            // Fetch custom form if event has one assigned
            try {
                const formRes = await fetch(`/api/event-forms?eventId=${eventId}`)
                const formData = await formRes.json()

                if (formRes.ok && formData.hasCustomForm && formData.form) {
                    setFormTemplate(formData.form)

                    // Initialize form responses with empty values
                    const initialResponses = {}
                    formData.form.questions.forEach(q => {
                        if (q.type === 'checkbox') {
                            initialResponses[q.id] = []
                        } else {
                            initialResponses[q.id] = ''
                        }
                    })
                    setFormResponses(initialResponses)
                }
            } catch (formErr) {
                console.warn('No custom form assigned:', formErr)
            }
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

    const validateForm = () => {
        // Validate required guest info
        if (!guestName.trim()) {
            setError('Please enter your name')
            return false
        }
        if (!guestEmail.trim()) {
            setError('Please enter your email')
            return false
        }
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(guestEmail)) {
            setError('Please enter a valid email address')
            return false
        }

        // Validate required custom form fields
        if (formTemplate?.questions) {
            for (const question of formTemplate.questions) {
                if (question.required) {
                    const response = formResponses[question.id]
                    if (!response ||
                        (typeof response === 'string' && !response.trim()) ||
                        (Array.isArray(response) && response.length === 0)) {
                        setError(`Please answer: ${question.label}`)
                        return false
                    }
                }
            }
        }

        return true
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)

        if (!validateForm()) {
            return
        }

        setSubmitting(true)

        try {
            // Get device info
            const deviceInfo = {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language
            }

            const response = await fetch('/api/public-checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId: parseInt(eventId),
                    guestName: guestName.trim(),
                    guestEmail: guestEmail.trim().toLowerCase(),
                    deviceInfo: JSON.stringify(deviceInfo),
                    formResponses: formTemplate ? JSON.stringify(formResponses) : null,
                    formId: formTemplate?.id || null
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

    const handleGoHome = () => {
        if (onNavigateHome) {
            onNavigateHome()
        } else {
            window.location.href = '/'
        }
    }

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
                <Card className="p-8 max-w-md w-full text-center border-primary/20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading event details...</p>
                </Card>
            </div>
        )
    }

    // Error state (no event found)
    if (error && !event) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-destructive/5">
                <Card className="p-8 max-w-md w-full text-center border-destructive/20">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold mb-2">Event Not Found</h2>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <Button onClick={handleGoHome} variant="outline">
                        Go to Homepage
                    </Button>
                </Card>
            </div>
        )
    }

    // Success state
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-green-500/5">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', bounce: 0.4 }}
                >
                    <Card className="p-8 max-w-md w-full text-center border-green-500/30">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', bounce: 0.6, delay: 0.2 }}
                            className="mx-auto w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6"
                        >
                            <svg
                                className="w-12 h-12 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </motion.div>
                        <h2 className="text-2xl font-bold mb-2 text-green-600 dark:text-green-400">
                            You're Checked In!
                        </h2>
                        <p className="text-muted-foreground mb-2">{event?.title}</p>
                        <p className="text-sm text-muted-foreground mb-6">
                            Welcome, {guestName}! We've sent a confirmation to {guestEmail}.
                        </p>
                        <div className="space-y-3">
                            <Button onClick={handleGoHome} className="w-full">
                                Done
                            </Button>
                        </div>
                    </Card>
                </motion.div>
            </div>
        )
    }

    // Main check-in form
    return (
        <div className="min-h-screen p-4 bg-gradient-to-br from-background via-background to-primary/5">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-lg mx-auto pt-8"
            >
                {/* Event Header */}
                <Card className="p-6 mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                            📍
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl font-bold mb-1 truncate">{event?.title}</h1>
                            <p className="text-sm text-muted-foreground">Event Check-In</p>
                        </div>
                    </div>

                    {event && (
                        <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 gap-3 text-sm">
                            {event.date && (
                                <div>
                                    <span className="text-muted-foreground">Date:</span>
                                    <p className="font-medium">{event.date}</p>
                                </div>
                            )}
                            {event.time && (
                                <div>
                                    <span className="text-muted-foreground">Time:</span>
                                    <p className="font-medium">{event.time}</p>
                                </div>
                            )}
                            {event.location && (
                                <div className="col-span-2">
                                    <span className="text-muted-foreground">Location:</span>
                                    <p className="font-medium">{event.location}</p>
                                </div>
                            )}
                        </div>
                    )}
                </Card>

                {/* Check-In Form */}
                <Card className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Guest Info Section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <span>👤</span>
                                <span>Your Information</span>
                            </h3>

                            <div>
                                <label htmlFor="guestName" className="block text-sm font-medium mb-2">
                                    Full Name <span className="text-destructive">*</span>
                                </label>
                                <Input
                                    id="guestName"
                                    type="text"
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    placeholder="Enter your full name"
                                    required
                                    disabled={submitting}
                                />
                            </div>

                            <div>
                                <label htmlFor="guestEmail" className="block text-sm font-medium mb-2">
                                    Email Address <span className="text-destructive">*</span>
                                </label>
                                <Input
                                    id="guestEmail"
                                    type="email"
                                    value={guestEmail}
                                    onChange={(e) => setGuestEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    disabled={submitting}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    We'll send you a confirmation email
                                </p>
                            </div>
                        </div>

                        {/* Custom Form Questions */}
                        {formTemplate?.questions && formTemplate.questions.length > 0 && (
                            <div className="space-y-4 pt-2">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <span>📋</span>
                                    <span>{formTemplate.title || 'Additional Questions'}</span>
                                </h3>

                                {formTemplate.description && (
                                    <p className="text-sm text-muted-foreground -mt-2">
                                        {formTemplate.description}
                                    </p>
                                )}

                                {formTemplate.questions.map((question) => (
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
                                                disabled={submitting}
                                            />
                                        )}

                                        {question.type === 'email' && (
                                            <Input
                                                type="email"
                                                value={formResponses[question.id] || ''}
                                                onChange={(e) => handleInputChange(question.id, e.target.value)}
                                                placeholder={question.placeholder}
                                                required={question.required}
                                                disabled={submitting}
                                            />
                                        )}

                                        {question.type === 'number' && (
                                            <Input
                                                type="number"
                                                value={formResponses[question.id] || ''}
                                                onChange={(e) => handleInputChange(question.id, e.target.value)}
                                                placeholder={question.placeholder}
                                                required={question.required}
                                                disabled={submitting}
                                            />
                                        )}

                                        {question.type === 'tel' && (
                                            <Input
                                                type="tel"
                                                value={formResponses[question.id] || ''}
                                                onChange={(e) => handleInputChange(question.id, e.target.value)}
                                                placeholder={question.placeholder}
                                                required={question.required}
                                                disabled={submitting}
                                            />
                                        )}

                                        {question.type === 'textarea' && (
                                            <textarea
                                                value={formResponses[question.id] || ''}
                                                onChange={(e) => handleInputChange(question.id, e.target.value)}
                                                placeholder={question.placeholder}
                                                required={question.required}
                                                rows={4}
                                                disabled={submitting}
                                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                                            />
                                        )}

                                        {question.type === 'select' && question.options && (
                                            <select
                                                value={formResponses[question.id] || ''}
                                                onChange={(e) => handleInputChange(question.id, e.target.value)}
                                                required={question.required}
                                                disabled={submitting}
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
                                                    <label key={idx} className="flex items-center space-x-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name={question.id}
                                                            value={option}
                                                            checked={formResponses[question.id] === option}
                                                            onChange={(e) => handleInputChange(question.id, e.target.value)}
                                                            required={question.required}
                                                            disabled={submitting}
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
                                                    <label key={idx} className="flex items-center space-x-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={(formResponses[question.id] || []).includes(option)}
                                                            onChange={() => handleInputChange(question.id, null, true, option)}
                                                            disabled={submitting}
                                                            className="h-4 w-4 rounded border-input"
                                                        />
                                                        <span className="text-sm">{option}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                                {error}
                            </div>
                        )}

                        {/* Submit Buttons */}
                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleGoHome}
                                className="flex-1"
                                disabled={submitting}
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
                </Card>

                {/* Footer note */}
                <p className="text-center text-xs text-muted-foreground mt-6 px-4">
                    By checking in, you agree to share your contact information with the event organizers.
                </p>
            </motion.div>
        </div>
    )
}

export default PublicEventCheckIn
