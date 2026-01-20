import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

/**
 * EventFormBuilder Component
 * Create custom forms for event check-ins and feedback
 */
export default function EventFormBuilder({ adminEmail }) {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form state
  const [formTitle, setFormTitle] = useState('Check-In Form');
  const [formDescription, setFormDescription] = useState('');
  const [questions, setQuestions] = useState([]);
  const [showAddQuestion, setShowAddQuestion] = useState(false);

  // Natural language form generation
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showNLInput, setShowNLInput] = useState(false);

  // New question state
  const [newQuestion, setNewQuestion] = useState({
    label: '',
    type: 'text',
    required: true,
    placeholder: '',
    options: []
  });

  const FIELD_TYPES = [
    { value: 'text', label: 'Short Text', icon: '📝' },
    { value: 'textarea', label: 'Long Text', icon: '📄' },
    { value: 'email', label: 'Email', icon: '📧' },
    { value: 'number', label: 'Number', icon: '🔢' },
    { value: 'select', label: 'Dropdown', icon: '📋' },
    { value: 'radio', label: 'Multiple Choice', icon: '⭕' },
    { value: 'checkbox', label: 'Checkboxes', icon: '☑️' },
    { value: 'rating', label: 'Rating (1-5)', icon: '⭐' }
  ];

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchEventForm(selectedEvent.id);
    }
  }, [selectedEvent]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/events');
      const data = await response.json();
      setEvents(data.events || []);

      // Auto-select the first event
      if (data.events && data.events.length > 0) {
        setSelectedEvent(data.events[0]);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const fetchEventForm = async (eventId) => {
    try {
      const response = await fetch(`/api/admin/event-forms?eventId=${eventId}&adminEmail=${encodeURIComponent(adminEmail)}`);
      const data = await response.json();

      if (response.ok && data.form) {
        setFormTitle(data.form.title || 'Check-In Form');
        setFormDescription(data.form.description || '');
        setQuestions(data.form.questions || []);
      } else {
        // No form exists yet, reset to defaults
        setFormTitle('Check-In Form');
        setFormDescription('');
        setQuestions([]);
      }
    } catch (err) {
      console.error('Error fetching form:', err);
      // Reset to defaults on error
      setFormTitle('Check-In Form');
      setFormDescription('');
      setQuestions([]);
    }
  };

  const handleAddQuestion = () => {
    if (!newQuestion.label.trim()) {
      setError('Question label is required');
      return;
    }

    // Validate options for select/radio/checkbox
    if (['select', 'radio', 'checkbox'].includes(newQuestion.type) && newQuestion.options.length === 0) {
      setError('Please add at least one option');
      return;
    }

    setQuestions([...questions, { ...newQuestion, id: Date.now().toString() }]);
    setNewQuestion({
      label: '',
      type: 'text',
      required: true,
      placeholder: '',
      options: []
    });
    setShowAddQuestion(false);
    setError(null);
  };

  const handleRemoveQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleMoveQuestion = (index, direction) => {
    const newQuestions = [...questions];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= newQuestions.length) return;

    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    setQuestions(newQuestions);
  };

  const handleAddOption = () => {
    const option = prompt('Enter option text:');
    if (option && option.trim()) {
      setNewQuestion({
        ...newQuestion,
        options: [...newQuestion.options, option.trim()]
      });
    }
  };

  const handleRemoveOption = (index) => {
    setNewQuestion({
      ...newQuestion,
      options: newQuestion.options.filter((_, i) => i !== index)
    });
  };

  const handleGenerateFromNaturalLanguage = async () => {
    if (!naturalLanguageInput.trim()) {
      setError('Please describe the form you want to create');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/forms/parse-natural-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: naturalLanguageInput
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate form');
      }

      // Apply the generated form structure
      setFormTitle(data.form.title || formTitle);
      setFormDescription(data.form.description || formDescription);

      // Convert questions to include IDs
      const newQuestions = data.form.questions.map((q, index) => ({
        ...q,
        id: `${Date.now()}-${index}`
      }));

      setQuestions(newQuestions);
      setSuccess(`✨ Generated ${newQuestions.length} questions from your description!`);
      setNaturalLanguageInput('');
      setShowNLInput(false);
    } catch (err) {
      console.error('Failed to generate form:', err);
      setError(err.message || 'Failed to generate form from description');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveForm = async () => {
    if (!selectedEvent) {
      setError('No event selected');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/event-forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          eventId: selectedEvent.id,
          formTitle,
          formDescription,
          questions
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save form');
      }

      setSuccess('Form saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-bold mb-2">No Events Found</h3>
          <p className="text-muted-foreground">
            Create an event first to build custom forms.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Event Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {events.map(event => (
          <Button
            key={event.id}
            variant={selectedEvent?.id === event.id ? 'default' : 'outline'}
            onClick={() => setSelectedEvent(event)}
            className="whitespace-nowrap"
          >
            {event.title}
          </Button>
        ))}
      </div>

      {/* Form Builder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Form Builder</CardTitle>
            <CardDescription>
              Create a custom form for {selectedEvent?.title}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Form Settings */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Form Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Check-In Form"
                  className="w-full p-3 rounded-lg border border-input bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Form Description (Optional)
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Instructions or description for attendees..."
                  className="w-full min-h-[80px] p-3 rounded-lg border border-input bg-background resize-none"
                />
              </div>
            </div>

            {/* Natural Language Form Generation */}
            <AnimatePresence>
              {showNLInput && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-2xl">✨</span>
                      <div>
                        <h4 className="font-semibold mb-1">Generate Form with AI</h4>
                        <p className="text-sm text-muted-foreground">
                          Describe your form in plain English and let AI create the questions for you.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <textarea
                        value={naturalLanguageInput}
                        onChange={(e) => setNaturalLanguageInput(e.target.value)}
                        placeholder="Example: Create a workshop feedback form with name, email, rating from 1-5, what they learned, and suggestions for improvement"
                        className="w-full min-h-[120px] p-3 rounded-lg border border-input bg-background resize-none"
                        disabled={isGenerating}
                      />

                      <div className="flex gap-2">
                        <Button
                          onClick={handleGenerateFromNaturalLanguage}
                          disabled={isGenerating || !naturalLanguageInput.trim()}
                          className="flex-1"
                        >
                          {isGenerating ? (
                            <>
                              <span className="animate-spin mr-2">⏳</span>
                              Generating...
                            </>
                          ) : (
                            <>
                              <span className="mr-2">✨</span>
                              Generate Form
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => {
                            setShowNLInput(false);
                            setNaturalLanguageInput('');
                          }}
                          variant="outline"
                          disabled={isGenerating}
                        >
                          Cancel
                        </Button>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        💡 Tip: Be specific about question types (short text, long text, rating, multiple choice, etc.)
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Questions List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Questions ({questions.length})
                </h3>
                <div className="flex gap-2">
                  {!showNLInput && (
                    <Button
                      onClick={() => setShowNLInput(true)}
                      size="sm"
                      variant="default"
                      className="bg-gradient-to-r from-primary to-primary/80"
                    >
                      <span className="mr-1">✨</span>
                      Generate with AI
                    </Button>
                  )}
                  <Button
                    onClick={() => setShowAddQuestion(true)}
                    size="sm"
                    variant="outline"
                  >
                    + Add Question
                  </Button>
                </div>
              </div>

              {questions.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-border rounded-lg">
                  <p className="text-muted-foreground">
                    No questions added yet. Click "Add Question" to start building your form.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((question, index) => (
                    <motion.div
                      key={question.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-lg border border-border bg-muted/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">
                              {FIELD_TYPES.find(t => t.value === question.type)?.icon}
                            </span>
                            <span className="font-medium">{question.label}</span>
                            {question.required && (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Type: {FIELD_TYPES.find(t => t.value === question.type)?.label}
                          </div>
                          {question.placeholder && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Placeholder: "{question.placeholder}"
                            </div>
                          )}
                          {question.options && question.options.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Options: {question.options.join(', ')}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleMoveQuestion(index, 'up')}
                            disabled={index === 0}
                            className="p-1 hover:bg-foreground/10 rounded disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => handleMoveQuestion(index, 'down')}
                            disabled={index === questions.length - 1}
                            className="p-1 hover:bg-foreground/10 rounded disabled:opacity-30"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => handleRemoveQuestion(question.id)}
                            className="p-1 hover:bg-destructive/10 text-destructive rounded"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 text-green-600 dark:text-green-400 p-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            {/* Save Button */}
            <Button
              onClick={handleSaveForm}
              disabled={saving}
              className="w-full"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Form'
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Add Question Modal */}
      <AnimatePresence>
        {showAddQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddQuestion(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background border border-border rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-xl font-bold mb-4">Add Question</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Question Label <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={newQuestion.label}
                    onChange={(e) => setNewQuestion({ ...newQuestion, label: e.target.value })}
                    placeholder="What did you think of the event?"
                    className="w-full p-3 rounded-lg border border-input bg-background"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Field Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {FIELD_TYPES.map(type => (
                      <button
                        key={type.value}
                        onClick={() => setNewQuestion({ ...newQuestion, type: type.value, options: [] })}
                        className={`p-3 rounded-lg border transition-colors text-left ${
                          newQuestion.type === type.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{type.icon}</span>
                          <span className="text-sm font-medium">{type.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Placeholder (Optional)
                  </label>
                  <input
                    type="text"
                    value={newQuestion.placeholder}
                    onChange={(e) => setNewQuestion({ ...newQuestion, placeholder: e.target.value })}
                    placeholder="Enter your answer..."
                    className="w-full p-3 rounded-lg border border-input bg-background"
                  />
                </div>

                {/* Options for select/radio/checkbox */}
                {['select', 'radio', 'checkbox'].includes(newQuestion.type) && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium">
                        Options <span className="text-destructive">*</span>
                      </label>
                      <Button onClick={handleAddOption} size="sm" variant="outline">
                        + Add Option
                      </Button>
                    </div>
                    {newQuestion.options.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-3 border border-dashed rounded">
                        No options added yet
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {newQuestion.options.map((option, index) => (
                          <div key={index} className="flex items-center justify-between p-2 rounded bg-muted">
                            <span className="text-sm">{option}</span>
                            <button
                              onClick={() => handleRemoveOption(index)}
                              className="text-destructive hover:text-destructive/80"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="required"
                    checked={newQuestion.required}
                    onChange={(e) => setNewQuestion({ ...newQuestion, required: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="required" className="text-sm font-medium">
                    Required field
                  </label>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button
                  onClick={() => setShowAddQuestion(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddQuestion}
                  className="flex-1"
                >
                  Add Question
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
