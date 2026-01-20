import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { DOCS_DATA } from '../lib/docsData';

/**
 * DocsViewer Component
 * Displays platform documentation with navigation and search
 */
export default function DocsViewer({ role = 'host', onClose }) {
  const [docs, setDocs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadDocs = async () => {
      try {
        setLoading(true);
        console.log('Fetching docs for role:', role);

        try {
          // Try to fetch from API first
          const response = await fetch(`/api/docs?role=${role}`);
          console.log('Docs API response status:', response.status);

          const data = await response.json();
          console.log('Docs API data:', data);

          if (data.success) {
            setDocs(data.documentation);
            // Set first section as active by default
            if (data.documentation.sections && data.documentation.sections.length > 0) {
              setActiveSection(data.documentation.sections[0].id);
            }
            return;
          }
        } catch (apiError) {
          console.log('API not available, using local data:', apiError.message);
        }

        // Fallback to local data
        const localDoc = DOCS_DATA[role];
        if (localDoc) {
          console.log('Using local documentation data');
          setDocs(localDoc);
          if (localDoc.sections && localDoc.sections.length > 0) {
            setActiveSection(localDoc.sections[0].id);
          }
        } else {
          setError(`Documentation not found for role: ${role}`);
        }
      } catch (err) {
        console.error('Error loading docs:', err);
        setError(`Failed to load documentation: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadDocs();
  }, [role]);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching docs for role:', role);
      const response = await fetch(`/api/docs?role=${role}`);
      console.log('Docs API response status:', response.status);

      const data = await response.json();
      console.log('Docs API data:', data);

      if (data.success) {
        setDocs(data.documentation);
        // Set first section as active by default
        if (data.documentation.sections && data.documentation.sections.length > 0) {
          setActiveSection(data.documentation.sections[0].id);
        }
      } else {
        console.error('Docs API error:', data.error);
        setError(data.error || 'Failed to load documentation');
      }
    } catch (err) {
      console.error('Error fetching docs:', err);
      setError(`Failed to load documentation: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredSections = docs?.sections.filter(section => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      section.title.toLowerCase().includes(term) ||
      section.content.toLowerCase().includes(term)
    );
  });

  const currentSection = docs?.sections.find(s => s.id === activeSection);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading documentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold mb-2">Error Loading Documentation</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchDocs}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {onClose && (
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="sm"
                >
                  ← Back
                </Button>
              )}
              <div>
                <h1 className="text-xl font-bold">{docs?.title}</h1>
                <p className="text-sm text-muted-foreground">{docs?.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
              >
                🖨️ Print
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-3">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-base">Table of Contents</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Search */}
                <div className="mb-4">
                  <Input
                    type="text"
                    placeholder="🔍 Search sections..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="text-sm"
                  />
                </div>

                {/* Navigation */}
                <nav className="space-y-1">
                  {filteredSections?.map((section, index) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        activeSection === section.id
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs opacity-60">{index + 1}.</span>
                        <span className="flex-1">{section.title}</span>
                      </div>
                    </button>
                  ))}
                </nav>

                {searchTerm && filteredSections?.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">No matching sections</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9">
            <AnimatePresence mode="wait">
              {currentSection && (
                <motion.div
                  key={currentSection.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>{currentSection.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        {currentSection.content.split('\n').map((paragraph, idx) => {
                          // Handle different markdown elements
                          if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                            // Bold headers
                            return (
                              <h3 key={idx} className="text-lg font-semibold mt-6 mb-3">
                                {paragraph.replace(/\*\*/g, '')}
                              </h3>
                            );
                          } else if (paragraph.startsWith('**') && paragraph.includes(':**')) {
                            // Bold labels with content
                            const parts = paragraph.split(':**');
                            return (
                              <p key={idx} className="mb-3">
                                <strong>{parts[0].replace(/\*\*/g, '')}: </strong>
                                {parts[1]}
                              </p>
                            );
                          } else if (paragraph.startsWith('- ')) {
                            // List items
                            return (
                              <li key={idx} className="ml-4 mb-2">
                                {paragraph.substring(2).replace(/\*\*/g, '')}
                              </li>
                            );
                          } else if (paragraph.match(/^\d+\./)) {
                            // Numbered lists
                            return (
                              <li key={idx} className="ml-4 mb-2 list-decimal">
                                {paragraph.replace(/^\d+\.\s/, '').replace(/\*\*/g, '')}
                              </li>
                            );
                          } else if (paragraph.trim() === '') {
                            // Empty lines
                            return <div key={idx} className="h-2" />;
                          } else {
                            // Regular paragraphs with inline formatting
                            const formatted = paragraph
                              .split(/(\*\*.*?\*\*)/)
                              .map((part, i) => {
                                if (part.startsWith('**') && part.endsWith('**')) {
                                  return (
                                    <strong key={i}>
                                      {part.replace(/\*\*/g, '')}
                                    </strong>
                                  );
                                }
                                return part;
                              });

                            return (
                              <p key={idx} className="mb-3 leading-relaxed">
                                {formatted}
                              </p>
                            );
                          }
                        })}
                      </div>

                      {/* Navigation Buttons */}
                      <div className="flex justify-between items-center pt-8 mt-8 border-t border-border">
                        <Button
                          variant="outline"
                          onClick={() => {
                            const currentIndex = docs.sections.findIndex(s => s.id === activeSection);
                            if (currentIndex > 0) {
                              setActiveSection(docs.sections[currentIndex - 1].id);
                            }
                          }}
                          disabled={docs.sections.findIndex(s => s.id === activeSection) === 0}
                        >
                          ← Previous
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const currentIndex = docs.sections.findIndex(s => s.id === activeSection);
                            if (currentIndex < docs.sections.length - 1) {
                              setActiveSection(docs.sections[currentIndex + 1].id);
                            }
                          }}
                          disabled={docs.sections.findIndex(s => s.id === activeSection) === docs.sections.length - 1}
                        >
                          Next →
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
