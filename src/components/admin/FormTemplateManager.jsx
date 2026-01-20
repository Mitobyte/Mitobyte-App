import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

/**
 * FormTemplateManager Component
 * Standalone form builder for creating reusable form templates
 * Admins can create custom templates or use system defaults
 * Hosts can only see their own templates
 */
export default function FormTemplateManager({ adminEmail, isHost = false }) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'check-in', 'feedback'

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    formType: 'check-in',
    title: '',
    description: '',
    questions: []
  });
  const [showAddQuestion, setShowAddQuestion] = useState(false);

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
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const url = isHost
        ? `/api/form-templates-manager?includeCustom=true&userOnly=true&userEmail=${encodeURIComponent(adminEmail)}`
        : '/api/form-templates-manager?includeCustom=true';

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load form templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setSelectedTemplate(null);
    setFormData({
      name: '',
      formType: 'check-in',
      title: '',
      description: '',
      questions: []
    });
  };

  const handleEditTemplate = (template) => {
    setIsCreating(false);
    setIsEditing(false);
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      formType: template.form_type,
      title: template.title,
      description: template.description || '',
      questions: template.questions || []
    });
  };

  const handleEnterEditMode = () => {
    if (selectedTemplate?.is_system === 1) {
      setError('System templates cannot be edited. Create a new template based on this one instead.');
      return;
    }
    setIsEditing(true);
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

    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, { ...newQuestion, id: Date.now().toString() }]
    }));

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
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== id)
    }));
  };

  const handleMoveQuestion = (index, direction) => {
    const newQuestions = [...formData.questions];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= newQuestions.length) return;

    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    setFormData(prev => ({...prev, questions: newQuestions}));
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

  const handleSaveTemplate = async () => {
    if (!formData.name.trim()) {
      setError('Template name is required');
      return;
    }
    if (!formData.title.trim()) {
      setError('Form title is required');
      return;
    }
    if (formData.questions.length === 0) {
      setError('Please add at least one question');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const url = selectedTemplate
        ? `/api/form-templates-manager/${selectedTemplate.id}`
        : '/api/form-templates-manager';

      const method = selectedTemplate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          ...formData
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save template');
      }

      setSuccess(selectedTemplate ? 'Template updated successfully!' : 'Template created successfully!');
      setTimeout(() => setSuccess(null), 3000);

      // Refresh templates list
      await fetchTemplates();

      // Exit edit/create mode
      if (isCreating) {
        setIsCreating(false);
        setSelectedTemplate(null);
      } else if (isEditing) {
        setIsEditing(false);
      }

      setFormData({
        name: '',
        formType: 'check-in',
        title: '',
        description: '',
        questions: []
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId, isSystem) => {
    if (isSystem) {
      setError('System templates cannot be deleted');
      return;
    }

    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/form-templates-manager/${templateId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete template');
      }

      setSuccess('Template deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);

      // Refresh templates list
      await fetchTemplates();

      // Reset if deleted template was selected
      if (selectedTemplate?.id === templateId) {
        setIsCreating(false);
        setSelectedTemplate(null);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredTemplates = templates.filter(t => {
    if (activeTab === 'all') return true;
    return t.form_type === activeTab;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Form Template Manager</h2>
          <p className="text-muted-foreground text-sm">
            Create and manage reusable form templates for events
          </p>
        </div>
        <Button onClick={handleCreateNew} className="gap-2">
          <span className="text-lg">➕</span>
          Create Template
        </Button>
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

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Templates</CardTitle>
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant={activeTab === 'all' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('all')}
                >
                  All
                </Button>
                <Button
                  size="sm"
                  variant={activeTab === 'check-in' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('check-in')}
                >
                  Check-In
                </Button>
                <Button
                  size="sm"
                  variant={activeTab === 'feedback' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('feedback')}
                >
                  Feedback
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No templates found
                </div>
              ) : (
                filteredTemplates.map(template => (
                  <motion.div
                    key={template.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleEditTemplate(template)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">
                            {template.name}
                          </span>
                          {template.is_system === 1 && (
                            <Badge variant="secondary" className="text-xs">System</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {template.form_type} • {template.questions.length} questions
                        </div>
                      </div>
                      {template.is_system === 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(template.id, template.is_system === 1);
                          }}
                          className="text-destructive hover:text-destructive/80 text-sm"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Form Editor */}
        <div className="lg:col-span-2">
          {!isCreating && !selectedTemplate ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-bold mb-2">No Template Selected</h3>
                <p className="text-muted-foreground mb-4">
                  Select a template to view details or create a new one
                </p>
                <Button onClick={handleCreateNew}>
                  Create New Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>
                        {isCreating ? 'Create New Template' : selectedTemplate?.name}
                      </CardTitle>
                      {selectedTemplate?.is_system === 1 && !isEditing && (
                        <p className="text-sm text-muted-foreground mt-1">
                          System template (read-only)
                        </p>
                      )}
                      {selectedTemplate?.is_system === 0 && !isEditing && !isCreating && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Custom template
                        </p>
                      )}
                    </div>
                    {selectedTemplate && !isCreating && !isEditing && selectedTemplate.is_system === 0 && (
                      <Button onClick={handleEnterEditMode} size="sm">
                        Edit Template
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Edit Mode - for creating new or editing custom templates */}
                  {(isCreating || isEditing) && (
                    <>
                      {/* Template Settings */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Template Name *
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                            placeholder="My Custom Check-In Form"
                            className="w-full p-3 rounded-lg border border-input bg-background"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Form Type *
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({...prev, formType: 'check-in'}))}
                              className={`p-3 rounded-lg border transition-colors ${
                                formData.formType === 'check-in'
                                  ? 'border-primary bg-primary/10'
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              <div className="text-xl mb-1">👋</div>
                              <div className="text-sm font-medium">Check-In</div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({...prev, formType: 'feedback'}))}
                              className={`p-3 rounded-lg border transition-colors ${
                                formData.formType === 'feedback'
                                  ? 'border-primary bg-primary/10'
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              <div className="text-xl mb-1">💬</div>
                              <div className="text-sm font-medium">Feedback</div>
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Form Title *
                          </label>
                          <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
                            placeholder="Event Check-In"
                            className="w-full p-3 rounded-lg border border-input bg-background"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Form Description (Optional)
                          </label>
                          <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                            placeholder="Instructions or description for attendees..."
                            className="w-full min-h-[80px] p-3 rounded-lg border border-input bg-background resize-none"
                          />
                        </div>
                      </div>

                      {/* Questions List */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">
                            Questions ({formData.questions.length})
                          </h3>
                          <Button
                            onClick={() => setShowAddQuestion(true)}
                            size="sm"
                            variant="outline"
                          >
                            + Add Question
                          </Button>
                        </div>

                        {formData.questions.length === 0 ? (
                          <div className="text-center py-8 border border-dashed border-border rounded-lg">
                            <p className="text-muted-foreground">
                              No questions added yet. Click "Add Question" to start building your form.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {formData.questions.map((question, index) => (
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
                                      disabled={index === formData.questions.length - 1}
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

                      {/* Save Button */}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            if (isCreating) {
                              setIsCreating(false);
                              setSelectedTemplate(null);
                            } else if (isEditing) {
                              setIsEditing(false);
                            }
                          }}
                          variant="outline"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSaveTemplate}
                          disabled={saving}
                          className="flex-1"
                        >
                          {saving ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                              Saving...
                            </>
                          ) : (
                            'Save Template'
                          )}
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Template Preview Mode - for both system and custom templates */}
                  {selectedTemplate && !isCreating && !isEditing && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-muted">
                        <div className="font-medium text-lg mb-2">{selectedTemplate.title}</div>
                        {selectedTemplate.description && (
                          <div className="text-sm text-muted-foreground mb-4">
                            {selectedTemplate.description}
                          </div>
                        )}
                        <div className="space-y-3">
                          {selectedTemplate.questions.map((question, index) => (
                            <div key={question.id} className="p-4 rounded-lg border border-border bg-background">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xl">
                                    {FIELD_TYPES.find(t => t.value === question.type)?.icon}
                                  </span>
                                  <span className="font-medium">{question.label}</span>
                                  {question.required && (
                                    <Badge variant="destructive" className="text-xs">Required</Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground pl-7">
                                  <span className="font-medium">Type:</span> {FIELD_TYPES.find(t => t.value === question.type)?.label}
                                </div>
                                {question.placeholder && (
                                  <div className="text-xs text-muted-foreground pl-7">
                                    <span className="font-medium">Placeholder:</span> "{question.placeholder}"
                                  </div>
                                )}
                                {question.options && question.options.length > 0 && (
                                  <div className="text-xs text-muted-foreground pl-7">
                                    <span className="font-medium">Options:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {question.options.map((opt, idx) => (
                                        <span key={idx} className="px-2 py-1 bg-muted rounded text-xs">
                                          {opt}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {selectedTemplate.is_system === 1 ? (
                        <Button onClick={handleCreateNew} className="w-full">
                          Create New Template Based on This
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button onClick={handleEnterEditMode} className="flex-1">
                            Edit Template
                          </Button>
                          <Button
                            onClick={() => handleDeleteTemplate(selectedTemplate.id, false)}
                            variant="destructive"
                            className="flex-1"
                          >
                            Delete Template
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>

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
