import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Drawer } from './ui/drawer';
import { Button } from './ui/button';
import { Card } from './ui/card';

export function CheckInFormDrawer({ isOpen, onClose, checkInCode, userWalletHash }) {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInId, setCheckInId] = useState(null);
  const [error, setError] = useState(null);

  // Badge state
  const [badge, setBadge] = useState(null);
  const [badgeGenerating, setBadgeGenerating] = useState(false);

  // Custom form state
  const [customForm, setCustomForm] = useState(null);
  const [hasCustomForm, setHasCustomForm] = useState(false);
  const [formResponses, setFormResponses] = useState({});

  // Raw standup responses (legacy)
  const [workingOn, setWorkingOn] = useState('');
  const [canHelpWith, setCanHelpWith] = useState('');
  const [needHelpWith, setNeedHelpWith] = useState('');

  // Preview/edit state
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [standupPreview, setStandupPreview] = useState(null);

  // Editable cleaned responses
  const [editedWorkingOn, setEditedWorkingOn] = useState('');
  const [editedCanHelpWith, setEditedCanHelpWith] = useState('');
  const [editedNeedHelpWith, setEditedNeedHelpWith] = useState('');

  // Standup is now optional - only show if no custom form is assigned
  const showStandupOption = !hasCustomForm && (event?.event_type === 'code_and_coffee' || event?.event_type === 'code_and_brews');

  useEffect(() => {
    if (isOpen && checkInCode) {
      fetchEventDetails();
    }
  }, [isOpen, checkInCode]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/checkin?code=${checkInCode}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch event details');
      }

      setEvent(data.event);

      // Fetch custom form if event has one
      await fetchCustomForm(data.event.id);
    } catch (err) {
      console.error('Error fetching event:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomForm = async (eventId) => {
    try {
      const response = await fetch(`/api/event-forms?eventId=${eventId}`);
      const data = await response.json();

      if (response.ok && data.hasCustomForm) {
        setCustomForm(data.form);
        setHasCustomForm(true);

        // Initialize form responses with empty values
        const initialResponses = {};
        data.form.questions.forEach(q => {
          if (q.type === 'checkbox') {
            initialResponses[q.id] = [];
          } else {
            initialResponses[q.id] = '';
          }
        });
        setFormResponses(initialResponses);
      } else {
        setHasCustomForm(false);
        setCustomForm(null);
      }
    } catch (err) {
      console.error('Error fetching custom form:', err);
      // Don't show error - just fall back to legacy behavior
      setHasCustomForm(false);
      setCustomForm(null);
    }
  };

  const handleFormResponseChange = (questionId, value, type) => {
    setFormResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const validateCustomForm = () => {
    if (!customForm) return true;

    // Check required fields
    for (const question of customForm.questions) {
      if (question.required) {
        const response = formResponses[question.id];
        if (!response ||
            (typeof response === 'string' && !response.trim()) ||
            (Array.isArray(response) && response.length === 0)) {
          return false;
        }
      }
    }
    return true;
  };

  const handleProcessStandup = async (e) => {
    e.preventDefault();

    if (!workingOn.trim() && !canHelpWith.trim()) {
      setError('Please provide at least one stand-up response');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const response = await fetch('/api/checkin/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workingOn,
          canHelpWith,
          needHelpWith: needHelpWith.trim() || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process standup responses');
      }

      // Set preview data
      setStandupPreview(data.preview);
      setEditedWorkingOn(data.preview.workingOn);
      setEditedCanHelpWith(data.preview.canHelpWith);
      setEditedNeedHelpWith(data.preview.needHelpWith || '');

      // Show preview/edit form
      setShowPreview(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckIn = async () => {
    if (!userWalletHash) {
      setError('Please connect your wallet to check in');
      return;
    }

    // Validate custom form if present
    if (hasCustomForm && !validateCustomForm()) {
      setError('Please answer all required questions');
      return;
    }

    try {
      setCheckingIn(true);
      setError(null);

      // Get device info
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      };

      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checkInCode,
          userWalletHash,
          deviceInfo: JSON.stringify(deviceInfo),
          // Custom form responses
          customFormResponses: hasCustomForm ? JSON.stringify(formResponses) : null,
          formId: hasCustomForm ? customForm?.id : null,
          // Optional standup responses (legacy support)
          workingOn: showStandupOption && showPreview ? editedWorkingOn : null,
          canHelpWith: showStandupOption && showPreview ? editedCanHelpWith : null,
          needHelpWith: showStandupOption && showPreview ? (editedNeedHelpWith || null) : null,
          rawWorkingOn: showStandupOption && showPreview ? workingOn : null,
          rawCanHelpWith: showStandupOption && showPreview ? canHelpWith : null,
          rawNeedHelpWith: showStandupOption && showPreview ? (needHelpWith || null) : null,
          isProcessed: showStandupOption && showPreview ? showPreview : false
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.alreadyCheckedIn) {
          setCheckedIn(true);
          setError('You have already checked in to this event');
        } else {
          throw new Error(data.error || 'Failed to check in');
        }
      } else {
        setCheckedIn(true);
        setCheckInId(data.checkInId);

        // Start polling for badge
        setBadgeGenerating(true);
        pollForBadge(data.checkInId);
      }
    } catch (err) {
      console.error('Error checking in:', err);
      setError(err.message);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setStandupPreview(null);
  };

  const pollForBadge = async (id) => {
    let attempts = 0;
    const maxAttempts = 20; // 20 attempts * 2 seconds = 40 seconds max

    const poll = async () => {
      try {
        const response = await fetch(`/api/badges/${id}`);
        const data = await response.json();

        if (data.success && data.badge) {
          // Badge is ready
          setBadge(data.badge);
          setBadgeGenerating(false);
        } else if (data.generating && attempts < maxAttempts) {
          // Still generating, poll again in 2 seconds
          attempts++;
          setTimeout(poll, 2000);
        } else {
          // Max attempts reached or error
          setBadgeGenerating(false);
          console.warn('Badge generation timed out or failed');
        }
      } catch (error) {
        console.error('Error polling for badge:', error);
        setBadgeGenerating(false);
      }
    };

    // Start polling
    poll();
  };

  const handleClose = () => {
    // Reset state when closing
    setEvent(null);
    setLoading(true);
    setCheckingIn(false);
    setCheckedIn(false);
    setCheckInId(null);
    setError(null);
    setBadge(null);
    setBadgeGenerating(false);
    setCustomForm(null);
    setHasCustomForm(false);
    setFormResponses({});
    setWorkingOn('');
    setCanHelpWith('');
    setNeedHelpWith('');
    setShowPreview(false);
    setStandupPreview(null);
    onClose();
  };

  return (
    <Drawer isOpen={isOpen} onClose={handleClose} title="Check In">
      <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading event details...</p>
          </div>
        )}

        {error && !event && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-sm">
            {error}
          </div>
        )}

        {checkedIn && !error && event && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center space-y-4 py-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.6 }}
              className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center"
            >
              <svg
                className="w-10 h-10 text-primary-foreground"
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

            <div>
              <h2 className="text-xl font-bold text-primary">Successfully Checked In!</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Welcome to {event.title}
              </p>
            </div>

            {/* Badge Generation Status */}
            <div className="mt-6 space-y-3">
              {badgeGenerating && !badge && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    <p className="text-sm text-foreground">Generating your personalized badge...</p>
                  </div>
                </div>
              )}

              {badge && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/30 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-center gap-2 text-sm font-semibold text-primary">
                    <span>🎨</span>
                    <span>Your Event Badge</span>
                  </div>

                  <div className="relative aspect-square max-w-xs mx-auto rounded-lg overflow-hidden shadow-lg border-2 border-primary/20">
                    <img
                      src={badge.image}
                      alt="Event Badge"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <p className="text-xs text-muted-foreground text-center italic">
                    {badge.prompt}
                  </p>

                  <Button
                    onClick={onClose}
                    variant="default"
                    size="sm"
                    className="w-full"
                  >
                    Close
                  </Button>
                </motion.div>
              )}

              {!badgeGenerating && !badge && (
                <Button
                  onClick={onClose}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  Close
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {event && !checkedIn && (
          <>
            {/* Event Details */}
            <div className="space-y-3 bg-muted rounded-lg p-4">
              <div>
                <h3 className="font-bold text-base">{event.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t border-border">
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-semibold">{event.date}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Time:</span>
                  <p className="font-semibold">{event.time}</p>
                </div>
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground">Location:</span>
                <p className="font-semibold">{event.location}</p>
              </div>

              {event.checkInCount !== undefined && (
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm text-muted-foreground">Checked in:</span>
                  <span className="font-semibold">
                    {event.checkInCount}
                    {event.spotsRemaining !== null && ` / ${event.capacity}`}
                  </span>
                </div>
              )}
            </div>

            {/* Custom Form */}
            {hasCustomForm && customForm && (
              <div className="space-y-4 bg-primary/5 rounded-lg p-4 border border-primary/20">
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <span>📋</span>
                    <span>{customForm.title}</span>
                  </h4>
                  {customForm.description && (
                    <p className="text-xs text-muted-foreground mb-4">
                      {customForm.description}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  {customForm.questions.map((question) => (
                    <div key={question.id}>
                      <label htmlFor={`q-${question.id}`} className="block text-sm font-medium mb-2">
                        {question.label}
                        {question.required && <span className="text-destructive ml-1">*</span>}
                      </label>

                      {/* Text input */}
                      {question.type === 'text' && (
                        <input
                          id={`q-${question.id}`}
                          type="text"
                          value={formResponses[question.id] || ''}
                          onChange={(e) => handleFormResponseChange(question.id, e.target.value, 'text')}
                          placeholder={question.placeholder}
                          className="w-full p-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          disabled={checkingIn}
                        />
                      )}

                      {/* Textarea */}
                      {question.type === 'textarea' && (
                        <textarea
                          id={`q-${question.id}`}
                          value={formResponses[question.id] || ''}
                          onChange={(e) => handleFormResponseChange(question.id, e.target.value, 'textarea')}
                          placeholder={question.placeholder}
                          className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                          disabled={checkingIn}
                        />
                      )}

                      {/* Email input */}
                      {question.type === 'email' && (
                        <input
                          id={`q-${question.id}`}
                          type="email"
                          value={formResponses[question.id] || ''}
                          onChange={(e) => handleFormResponseChange(question.id, e.target.value, 'email')}
                          placeholder={question.placeholder}
                          className="w-full p-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          disabled={checkingIn}
                        />
                      )}

                      {/* Number input */}
                      {question.type === 'number' && (
                        <input
                          id={`q-${question.id}`}
                          type="number"
                          value={formResponses[question.id] || ''}
                          onChange={(e) => handleFormResponseChange(question.id, e.target.value, 'number')}
                          placeholder={question.placeholder}
                          className="w-full p-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          disabled={checkingIn}
                        />
                      )}

                      {/* Select dropdown */}
                      {question.type === 'select' && (
                        <select
                          id={`q-${question.id}`}
                          value={formResponses[question.id] || ''}
                          onChange={(e) => handleFormResponseChange(question.id, e.target.value, 'select')}
                          className="w-full p-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          disabled={checkingIn}
                        >
                          <option value="">Select an option</option>
                          {question.options?.map((option, idx) => (
                            <option key={idx} value={option}>{option}</option>
                          ))}
                        </select>
                      )}

                      {/* Radio buttons */}
                      {question.type === 'radio' && (
                        <div className="space-y-2">
                          {question.options?.map((option, idx) => (
                            <label key={idx} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`q-${question.id}`}
                                value={option}
                                checked={formResponses[question.id] === option}
                                onChange={(e) => handleFormResponseChange(question.id, e.target.value, 'radio')}
                                className="w-4 h-4"
                                disabled={checkingIn}
                              />
                              <span className="text-sm">{option}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Checkboxes */}
                      {question.type === 'checkbox' && (
                        <div className="space-y-2">
                          {question.options?.map((option, idx) => (
                            <label key={idx} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                value={option}
                                checked={(formResponses[question.id] || []).includes(option)}
                                onChange={(e) => {
                                  const current = formResponses[question.id] || [];
                                  const updated = e.target.checked
                                    ? [...current, option]
                                    : current.filter(v => v !== option);
                                  handleFormResponseChange(question.id, updated, 'checkbox');
                                }}
                                className="w-4 h-4"
                                disabled={checkingIn}
                              />
                              <span className="text-sm">{option}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Rating (1-5 stars) */}
                      {question.type === 'rating' && (
                        <div className="flex gap-2 justify-center">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                handleFormResponseChange(question.id, rating.toString(), 'rating');
                              }}
                              className={`p-3 rounded-lg transition-all touch-manipulation active:scale-95 ${
                                formResponses[question.id] && parseInt(formResponses[question.id]) >= rating
                                  ? 'text-yellow-500 bg-yellow-500/10'
                                  : 'text-gray-300 hover:text-yellow-400 active:text-yellow-400'
                              }`}
                              disabled={checkingIn}
                              title={`${rating} star${rating !== 1 ? 's' : ''}`}
                            >
                              <span className="text-3xl leading-none block">⭐</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stand-up Form for Code and Coffee / Code and Brews (Legacy) */}
            {requiresStandUp && !hasCustomForm && !showPreview && (
              <form onSubmit={handleProcessStandup} className="space-y-4 bg-primary/5 rounded-lg p-4 border border-primary/20">
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <span>💬</span>
                    <span>Share Your Stand-up</span>
                  </h4>
                  <p className="text-xs text-muted-foreground mb-4">
                    ✨ AI will clean up your responses and check for appropriate content
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label htmlFor="workingOn" className="block text-sm font-medium mb-2">
                      What are you working on today? <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      id="workingOn"
                      value={workingOn}
                      onChange={(e) => setWorkingOn(e.target.value)}
                      placeholder="e.g., Building a React app, learning TypeScript..."
                      className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      maxLength={500}
                      disabled={isProcessing}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {workingOn.length}/500 characters
                    </p>
                  </div>

                  <div>
                    <label htmlFor="canHelpWith" className="block text-sm font-medium mb-2">
                      What can you help others with? <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      id="canHelpWith"
                      value={canHelpWith}
                      onChange={(e) => setCanHelpWith(e.target.value)}
                      placeholder="e.g., React best practices, debugging..."
                      className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      maxLength={500}
                      disabled={isProcessing}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {canHelpWith.length}/500 characters
                    </p>
                  </div>

                  <div>
                    <label htmlFor="needHelpWith" className="block text-sm font-medium mb-2">
                      What do you need help with? <span className="text-muted-foreground">(optional)</span>
                    </label>
                    <textarea
                      id="needHelpWith"
                      value={needHelpWith}
                      onChange={(e) => setNeedHelpWith(e.target.value)}
                      placeholder="e.g., Understanding async/await..."
                      className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      maxLength={500}
                      disabled={isProcessing}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {needHelpWith.length}/500 characters
                    </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isProcessing || !workingOn.trim() || !canHelpWith.trim()}
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing with AI...
                    </>
                  ) : (
                    '✨ Process with AI & Preview'
                  )}
                </Button>
              </form>
            )}

            {/* Preview/Edit Form for Stand-up Responses */}
            {requiresStandUp && showPreview && standupPreview && (
              <div className="space-y-4 bg-purple-500/5 rounded-lg p-4 border border-purple-500/30">
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <span>✏️</span>
                    <span>Review & Edit Your Stand-up</span>
                  </h4>
                  <p className="text-xs text-muted-foreground mb-4">
                    AI has cleaned up your responses. Review and edit before checking in.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      What are you working on today?
                    </label>
                    <textarea
                      value={editedWorkingOn}
                      onChange={(e) => setEditedWorkingOn(e.target.value)}
                      className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      maxLength={500}
                      disabled={checkingIn}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      What can you help others with?
                    </label>
                    <textarea
                      value={editedCanHelpWith}
                      onChange={(e) => setEditedCanHelpWith(e.target.value)}
                      className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      maxLength={500}
                      disabled={checkingIn}
                    />
                  </div>

                  {editedNeedHelpWith && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        What do you need help with?
                      </label>
                      <textarea
                        value={editedNeedHelpWith}
                        onChange={(e) => setEditedNeedHelpWith(e.target.value)}
                        className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        maxLength={500}
                        disabled={checkingIn}
                      />
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleCancelPreview}
                  variant="outline"
                  disabled={checkingIn}
                  className="w-full"
                >
                  ← Back to Edit
                </Button>
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {(hasCustomForm || !requiresStandUp || showPreview) && (
              <Button
                onClick={handleCheckIn}
                disabled={checkingIn || checkedIn || (event.spotsRemaining !== null && event.spotsRemaining <= 0)}
                className="w-full"
              >
                {checkingIn ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Checking in...
                  </>
                ) : (
                  '✅ Check In Now'
                )}
              </Button>
            )}
          </>
        )}
      </div>
    </Drawer>
  );
}
