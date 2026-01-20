import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

export function EventRequestForm({ onClose, userEmail }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    event_type: 'meetup',
    expected_attendees: '',
    isRecurring: false,
    recurringPattern: 'weekly',
    recurringEndDate: '',
    externalUrl: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [importMode, setImportMode] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState(null);

  const recurringPatterns = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Every 2 Weeks' },
    { value: 'monthly', label: 'Monthly' }
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // AI parsing state
  const [aiInput, setAiInput] = useState('');
  const [aiParsing, setAiParsing] = useState(false);
  const [aiConfidence, setAiConfidence] = useState(null);
  const [showAIInput, setShowAIInput] = useState(false);

  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) {
      setImportStatus({ type: 'error', message: 'Please enter a valid URL' });
      return;
    }

    setIsImporting(true);
    setImportStatus(null);

    try {
      const response = await fetch('/api/scrape-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.hint || 'Failed to import event');
      }

      const { data } = result;

      // Auto-populate form with scraped data
      setFormData(prev => ({
        ...prev,
        title: data.title || prev.title,
        description: data.description || prev.description,
        date: data.date || prev.date,
        time: data.time || prev.time,
        location: data.location || prev.location,
        event_type: data.eventType || prev.event_type,
        externalUrl: data.externalUrl || importUrl // Always set the external URL
      }));

      setImportStatus({
        type: 'success',
        message: `Successfully imported event from ${data.platform || 'external source'}! Review and edit the details below.`
      });

      // Switch to manual mode so user can review/edit
      setImportMode(false);
      setImportUrl('');

    } catch (error) {
      console.error('Import error:', error);
      setImportStatus({
        type: 'error',
        message: error.message || 'Failed to import event from URL'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleAIParse = async () => {
    if (!aiInput.trim()) {
      alert('Please enter an event description');
      return;
    }

    setAiParsing(true);
    try {
      const response = await fetch('/api/events/parse-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: aiInput })
      });

      const data = await response.json();
      if (data.success && data.event) {
        // Pre-fill form with AI-parsed data
        setFormData({
          title: data.event.title || '',
          description: data.event.description || '',
          date: data.event.date || '',
          time: data.event.time || '',
          location: data.event.location || '',
          event_type: data.event.event_type || 'meetup',
          expected_attendees: data.event.expected_attendees || ''
        });
        setAiConfidence(data.event.confidence);
        setShowAIInput(false); // Hide AI input after successful parse
      } else {
        alert('Failed to parse event: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to parse event with AI:', error);
      alert('Failed to parse event. Please try again.');
    } finally {
      setAiParsing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/event-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          title: formData.title,
          description: formData.description,
          date: formData.date,
          time: formData.time,
          location: formData.location,
          category: formData.event_type,
          maxAttendees: formData.expected_attendees ? parseInt(formData.expected_attendees) : null,
          externalUrl: formData.externalUrl || null,
          walletAddress: userEmail,
          requesterName: userEmail
        })
      });

      const data = await response.json();
      if (data.success) {
        setSubmitted(true);
        setTimeout(() => {
          onClose?.();
        }, 2000);
      } else {
        alert('Failed to submit event request: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to submit event request:', error);
      alert('Failed to submit event request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const eventTypes = [
    { value: 'meetup', label: 'Meetup', icon: '🤝' },
    { value: 'workshop', label: 'Workshop', icon: '🎓' },
    { value: 'hackathon', label: 'Hackathon', icon: '💻' },
    { value: 'code_and_coffee', label: 'Code & Coffee', icon: '☕' },
    { value: 'code_and_brews', label: 'Code & Brews', icon: '🍺' }
  ];

  return (
    <AnimatePresence>
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        />

        {/* Modal */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-2xl max-h-[90vh] bg-background rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div>
              <h2 className="text-2xl font-bold">Request an Event</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Submit your event idea for admin approval
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-foreground/10 flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-xl font-semibold mb-2">Request Submitted!</h3>
                <p className="text-muted-foreground text-center">
                  Your event request has been sent to the admins for review.
                  <br />
                  You'll be notified once it's approved.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Import from URL */}
                <div className="border border-border rounded-lg p-4 bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <span className="text-lg">🔗</span>
                        Import from External Platform
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Automatically extract event details from Eventbrite, Meetup, Facebook Events, etc.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={importMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setImportMode(!importMode);
                        setImportStatus(null);
                      }}
                    >
                      {importMode ? '📝 Manual Entry' : '🔗 Import from URL'}
                    </Button>
                  </div>

                  {importMode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      <div className="flex gap-2">
                        <Input
                          type="url"
                          value={importUrl}
                          onChange={(e) => setImportUrl(e.target.value)}
                          placeholder="https://eventbrite.com/event/..."
                          className="flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleImportFromUrl();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          onClick={handleImportFromUrl}
                          disabled={isImporting || !importUrl.trim()}
                        >
                          {isImporting ? (
                            <>
                              <span className="animate-spin mr-2">⏳</span>
                              Importing...
                            </>
                          ) : (
                            <>
                              <span className="mr-2">📥</span>
                              Import
                            </>
                          )}
                        </Button>
                      </div>

                      {importStatus && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-3 rounded-lg border ${
                            importStatus.type === 'success'
                              ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
                              : 'bg-destructive/10 border-destructive/20 text-destructive'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-lg flex-shrink-0">
                              {importStatus.type === 'success' ? '✅' : '⚠️'}
                            </span>
                            <span className="text-xs">{importStatus.message}</span>
                          </div>
                        </motion.div>
                      )}

                      <div className="text-xs text-muted-foreground">
                        <strong>Supported platforms:</strong> Eventbrite, Meetup, Facebook Events, and any site with event metadata
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Import Success Message */}
                {!importMode && importStatus && importStatus.type === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg border bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xl flex-shrink-0">✅</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{importStatus.message}</p>
                        <p className="text-xs mt-1 opacity-80">
                          You can now edit any fields below before submitting the request.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setImportStatus(null)}
                        className="flex-shrink-0"
                      >
                        ✕
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* AI Natural Language Input */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">✨</span>
                      <div>
                        <h3 className="font-semibold">Describe with AI</h3>
                        <p className="text-xs text-muted-foreground">
                          Describe your event in plain English and let AI fill the form
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAIInput(!showAIInput)}
                    >
                      {showAIInput ? 'Hide' : 'Show'}
                    </Button>
                  </div>

                  {showAIInput && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      <textarea
                        rows={4}
                        placeholder="Example: 'Let's do a React workshop next Friday at 6pm at Ward4. We'll build a todo app and learn hooks. Expecting around 20 people.'"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background resize-none"
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                      />
                      <Button
                        type="button"
                        onClick={handleAIParse}
                        disabled={aiParsing || !aiInput.trim()}
                        className="w-full"
                      >
                        {aiParsing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin mr-2" />
                            Parsing with AI...
                          </>
                        ) : (
                          <>
                            <span className="mr-2">✨</span>
                            Parse with AI
                          </>
                        )}
                      </Button>
                    </motion.div>
                  )}

                  {aiConfidence && !showAIInput && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Badge variant={aiConfidence > 0.8 ? 'success' : aiConfidence > 0.6 ? 'warning' : 'secondary'}>
                        AI Confidence: {Math.round(aiConfidence * 100)}%
                      </Badge>
                      <span className="text-muted-foreground">Review and edit the fields below</span>
                    </div>
                  )}
                </div>

                {/* Divider */}
                {showAIInput && <div className="border-t border-border" />}

                {/* Event Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Event Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {eventTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, event_type: type.value })}
                        className={`p-3 rounded-lg border transition-colors ${
                          formData.event_type === type.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:bg-foreground/5'
                        }`}
                      >
                        <div className="text-2xl mb-1">{type.icon}</div>
                        <div className="text-xs font-medium">{type.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Event Title */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Event Title</label>
                  <Input
                    required
                    placeholder="e.g., React Workshop: Building Modern UIs"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="What's this event about? What will attendees learn or do?"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <Input
                      required
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Time</label>
                    <Input
                      required
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Input
                    required
                    placeholder="e.g., Ward4, 424 E Wisconsin Ave, Milwaukee, WI"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>

                {/* External URL */}
                <div className="space-y-2 border border-border rounded-lg p-3 bg-blue-50/50 dark:bg-blue-950/20">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">🔗</span>
                    <label className="text-sm font-medium">External Event URL (Optional)</label>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    If this event is hosted on another platform (Eventbrite, Meetup, etc.), add the link here
                  </p>
                  <Input
                    type="url"
                    placeholder="https://eventbrite.com/event/..."
                    value={formData.externalUrl}
                    onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                  />
                </div>

                {/* Expected Attendees */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Expected Attendees (optional)</label>
                  <Input
                    type="number"
                    placeholder="Approximate number of attendees"
                    value={formData.expected_attendees}
                    onChange={(e) => setFormData({ ...formData, expected_attendees: e.target.value })}
                  />
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
                          className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
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

                {/* Info Banner */}
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> Your event request will be reviewed by admins.
                    You'll receive a notification once it's approved and added to the calendar.
                  </p>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full"
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">📝</span>
                      Submit Event Request
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
          </motion.div>
        </div>
      </>
    </AnimatePresence>
  );
}
