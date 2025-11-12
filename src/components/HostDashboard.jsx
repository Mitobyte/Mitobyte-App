import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import EventQRCode from './EventQRCode';
import EventAnalytics from './EventAnalytics';
import AddEvent from './admin/AddEvent';
import FormTemplateManager from './admin/FormTemplateManager';
import AIEventCreator from './admin/AIEventCreator';
import EventCSVUpload from './admin/EventCSVUpload';
import { updateEvent, deleteEvent } from '../services/eventApi';
import mitobyteLogoLarge from '../mitobyte-c-large.png';

export default function HostDashboard({ user, dbUser, onBack, isInDrawer = false }) {
  const [activeTab, setActiveTab] = useState('events'); // 'events', 'create', 'forms'
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventForQR, setSelectedEventForQR] = useState(null);
  const [showFeedbackQR, setShowFeedbackQR] = useState(false);
  const [selectedEventForAnalytics, setSelectedEventForAnalytics] = useState(null);

  // New state for improved UI
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterTime, setFilterTime] = useState('upcoming'); // 'all', 'upcoming', 'past'
  const [selectedEventForEdit, setSelectedEventForEdit] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const isAdmin = dbUser?.is_admin === 1;

  // DEBUG: Log component props
  console.log('=== HostDashboard Component ===');
  console.log('user:', user);
  console.log('dbUser:', dbUser);
  console.log('isAdmin:', isAdmin);
  console.log('================================');

  useEffect(() => {
    console.log('DEBUG: HostDashboard useEffect triggered');
    console.log('DEBUG: user?.email:', user?.email);

    if (!user?.email) {
      console.log('DEBUG: No user email, skipping fetch');
      return;
    }

    const fetchMyEvents = async () => {
      try {
        console.log('DEBUG: Fetching events...');
        setLoading(true);
        const response = await fetch('/api/events');
        console.log('DEBUG: Events API response status:', response.status);

        const data = await response.json();
        console.log('DEBUG: Events API data:', data);

        if (data.events) {
          console.log('DEBUG: Total events from API:', data.events.length);
          console.log('DEBUG: isAdmin:', isAdmin);
          console.log('DEBUG: user.email:', user.email);

          // Admins see all events, hosts see only their events
          const userEvents = isAdmin
            ? data.events
            : data.events.filter(event => event.created_by === user.email);

          console.log('DEBUG: Filtered user events:', userEvents.length);
          console.log('DEBUG: User events:', userEvents);
          setMyEvents(userEvents);
        } else {
          console.log('DEBUG: No events property in response');
        }
      } catch (error) {
        console.error('DEBUG: Failed to fetch events:', error);
      } finally {
        setLoading(false);
        console.log('DEBUG: Fetch complete, loading set to false');
      }
    };

    fetchMyEvents();
  }, [user?.email, isAdmin]);

  // Filter and search events
  const filteredEvents = useMemo(() => {
    let filtered = [...myEvents];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(event =>
        event.title?.toLowerCase().includes(term) ||
        event.description?.toLowerCase().includes(term) ||
        event.location?.toLowerCase().includes(term)
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(event => event.event_type === filterType);
    }

    // Time filter
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (filterTime === 'upcoming') {
      filtered = filtered.filter(event => new Date(event.date) >= now);
    } else if (filterTime === 'past') {
      filtered = filtered.filter(event => new Date(event.date) < now);
    }

    // Sort by date (upcoming first, then past)
    filtered.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (filterTime === 'past') {
        return dateB - dateA; // Most recent past first
      }
      return dateA - dateB; // Nearest upcoming first
    });

    return filtered;
  }, [myEvents, searchTerm, filterType, filterTime]);

  // Handle edit event
  const handleEditEvent = (event) => {
    setSelectedEventForEdit(event);
    setShowEditModal(true);
  };

  // Handle delete event
  const handleDeleteEvent = async (event) => {
    const isPartOfSeries = event.parent_event_id || event.is_recurring;

    let deleteSeries = false;

    if (isPartOfSeries) {
      const choice = window.confirm(
        'This event is part of a recurring series.\n\n' +
        'Click OK to delete ONLY this event\n' +
        'Click Cancel to choose a different option'
      );

      if (!choice) {
        const deleteAll = window.confirm(
          'Do you want to delete ALL events in this series?\n\n' +
          'Click OK to delete the entire series\n' +
          'Click Cancel to abort'
        );

        if (!deleteAll) return;
        deleteSeries = true;
      }
    } else {
      const confirmed = window.confirm('Are you sure you want to delete this event? This action cannot be undone.');
      if (!confirmed) return;
    }

    try {
      const result = await deleteEvent(event.id, deleteSeries);

      if (deleteSeries) {
        const parentId = event.parent_event_id || event.id;
        setMyEvents(prev => prev.filter(e => e.id !== parentId && e.parent_event_id !== parentId));
        alert(result.message || `Deleted ${result.deletedCount} events in series`);
      } else {
        setMyEvents(prev => prev.filter(e => e.id !== event.id));
        alert('Event deleted successfully!');
      }
    } catch (err) {
      console.error('Failed to delete event:', err);
      alert(`Failed to delete event: ${err.message}`);
    }
  };

  // Helper functions
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getEventTypeIcon = (type) => {
    const icons = {
      'code_and_coffee': '☕',
      'code_and_brews': '🍺',
      'hackathon': '💻',
      'workshop': '🎓',
      'meetup': '🤝'
    };
    return icons[type] || '📅';
  };

  const getEventTypeLabel = (type) => {
    const labels = {
      'code_and_coffee': 'Code & Coffee',
      'code_and_brews': 'Code & Brews',
      'hackathon': 'Hackathon',
      'workshop': 'Workshop',
      'meetup': 'Meetup'
    };
    return labels[type] || type;
  };

  const isUpcoming = (dateStr) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return new Date(dateStr) >= now;
  };

  return (
    <div className={isInDrawer ? "pb-4" : "min-h-screen bg-background pb-20"}>
      {/* Header - Only show when not in drawer */}
      {!isInDrawer && (
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center gap-2">
              <div className="flex items-center gap-2 sm:gap-4">
                <Button
                  onClick={onBack}
                  variant="ghost"
                  size="sm"
                >
                  ← Back
                </Button>
                <img
                  src={mitobyteLogoLarge}
                  alt="Mitobyte"
                  className="h-6 sm:h-8 w-auto"
                />
              </div>
              <h1 className="text-lg sm:text-xl font-bold">Host Dashboard</h1>
            </div>
          </div>
        </div>
      )}

      {/* Drawer Title - Only show when in drawer */}
      {isInDrawer && (
        <div className="px-4 sm:px-6 mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span>🎯</span>
            <span>Host Dashboard</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? 'Full admin access to all events' : 'Manage your events'}
          </p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-border">
          <nav className="flex space-x-8 -mb-px">
            {[
              { id: 'events', label: 'My Events', icon: '📅' },
              { id: 'create', label: 'Create Event', icon: '➕' },
              { id: 'csv-import', label: 'Import CSV', icon: '📤' },
              { id: 'ai-create', label: 'Create with AI', icon: '🤖' },
              { id: 'forms', label: 'Form Templates', icon: '📋' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative pb-4 px-2 text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <span className="text-base">{tab.icon}</span>
                  <span>{tab.label}</span>
                </span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="hostActiveTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* My Events Tab */}
        {activeTab === 'events' && (
          <>
            {/* Welcome Card */}
            <Card>
              <CardHeader>
                <CardTitle>Welcome, {user?.displayName || user?.email}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {isAdmin
                    ? 'You have full access to all events as an admin. Manage events, view check-in QR codes, and track attendance.'
                    : 'Manage your events, view check-in QR codes, and track attendance.'}
                </p>
              </CardContent>
            </Card>

            {/* Filters and View Controls */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle>{isAdmin ? 'All Events' : 'My Events'}</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === 'card' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('card')}
                    >
                      📋 Cards
                    </Button>
                    <Button
                      variant={viewMode === 'table' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('table')}
                    >
                      📊 Table
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search and Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                  <Input
                    type="text"
                    placeholder="🔍 Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="all">All Types</option>
                    <option value="code_and_coffee">☕ Code & Coffee</option>
                    <option value="code_and_brews">🍺 Code & Brews</option>
                    <option value="hackathon">💻 Hackathon</option>
                    <option value="workshop">🎓 Workshop</option>
                    <option value="meetup">🤝 Meetup</option>
                  </select>
                  <select
                    value={filterTime}
                    onChange={(e) => setFilterTime(e.target.value)}
                    className="px-3 py-2 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="past">Past Events</option>
                    <option value="all">All Time</option>
                  </select>
                </div>

                {/* Event Count */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredEvents.length} of {myEvents.length} events
                  </p>
                </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  {myEvents.length === 0
                    ? "You haven't created any events yet."
                    : "No events match your filters."}
                </p>
                {myEvents.length === 0 && <Button onClick={() => setActiveTab('create')}>Create Event</Button>}
              </div>
            ) : viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border">
                    <tr className="text-left text-sm text-muted-foreground">
                      <th className="pb-3 font-medium">Event</th>
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map((event) => (
                      <tr key={event.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                        <td className="py-4">
                          <div className="flex items-start gap-2">
                            <span className="text-2xl">{getEventTypeIcon(event.event_type)}</span>
                            <div>
                              <p className="font-semibold">{event.title}</p>
                              <p className="text-xs text-muted-foreground">{event.location}</p>
                              <div className="flex gap-1 mt-1">
                                {event.is_recurring && (
                                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                                    🔁 Series
                                  </Badge>
                                )}
                                {event.parent_event_id && (
                                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                                    🔁 Instance
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <p className="text-sm">{formatDate(event.date)}</p>
                          <p className="text-xs text-muted-foreground">{event.time}</p>
                        </td>
                        <td className="py-4">
                          <Badge variant="secondary" className="text-xs">
                            {getEventTypeLabel(event.event_type)}
                          </Badge>
                        </td>
                        <td className="py-4">
                          {isUpcoming(event.date) ? (
                            <Badge className="bg-green-600 text-xs">Upcoming</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Past</Badge>
                          )}
                        </td>
                        <td className="py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditEvent(event)}
                              title="Edit Event"
                            >
                              ✏️
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedEventForAnalytics(event)}
                              title="View Analytics"
                            >
                              📊
                            </Button>
                            {event.check_in_form_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedEventForQR(event);
                                  setShowFeedbackQR(false);
                                }}
                                title="Check-in QR Code"
                              >
                                📱
                              </Button>
                            )}
                            {event.feedback_form_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedEventForQR(event);
                                  setShowFeedbackQR(true);
                                }}
                                title="Feedback QR Code"
                              >
                                📝
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteEvent(event)}
                              title="Delete Event"
                            >
                              🗑️
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex flex-col gap-4">
                      {/* Event Header */}
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">{getEventTypeIcon(event.event_type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-lg font-semibold">{event.title}</h3>
                            {isUpcoming(event.date) ? (
                              <Badge className="bg-green-600">Upcoming</Badge>
                            ) : (
                              <Badge variant="secondary">Past</Badge>
                            )}
                            {event.is_recurring && (
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                🔁 Series
                              </Badge>
                            )}
                            {event.parent_event_id && (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                                🔁 Instance
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            📅 {formatDate(event.date)} • 🕒 {event.time}
                          </p>
                          <p className="text-sm text-muted-foreground mb-2">
                            📍 {event.location}
                          </p>
                          <p className="text-sm line-clamp-2 mb-2">{event.description}</p>
                          {(event.check_in_form_id || event.feedback_form_id) && (
                            <div className="flex gap-2 mt-2">
                              {event.check_in_form_id && (
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                                  ✓ Check-in Form
                                </Badge>
                              )}
                              {event.feedback_form_id && (
                                <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                                  ✓ Feedback Form
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEditEvent(event)}
                          variant="outline"
                        >
                          <span className="mr-2">✏️</span>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setSelectedEventForAnalytics(event)}
                          variant="outline"
                        >
                          <span className="mr-2">📊</span>
                          Analytics
                        </Button>
                        {event.check_in_form_id && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedEventForQR(event);
                              setShowFeedbackQR(false);
                            }}
                            variant="outline"
                          >
                            <span className="mr-2">📱</span>
                            Check-in QR
                          </Button>
                        )}
                        {event.feedback_form_id && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedEventForQR(event);
                              setShowFeedbackQR(true);
                            }}
                            variant="outline"
                          >
                            <span className="mr-2">📝</span>
                            Feedback QR
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleDeleteEvent(event)}
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <span className="mr-2">🗑️</span>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Create Event Tab */}
        {activeTab === 'create' && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Event</CardTitle>
              {!isAdmin && (
                <p className="text-sm text-muted-foreground mt-2">
                  As a host, you can create Hackathons, Workshops, and Meetups.
                </p>
              )}
            </CardHeader>
            <CardContent>
              <AddEvent user={user} isHost={!isAdmin} />
            </CardContent>
          </Card>
        )}

        {/* CSV Import Tab */}
        {activeTab === 'csv-import' && (
          <EventCSVUpload
            user={user}
            onSuccess={(data) => {
              fetchMyEvents();
              setActiveTab('events');
            }}
          />
        )}

        {/* AI Create Event Tab */}
        {activeTab === 'ai-create' && (
          <Card>
            <CardHeader>
              <CardTitle>Create Event with AI</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Describe your event idea and let AI generate the details for you.
              </p>
            </CardHeader>
            <CardContent>
              <AIEventCreator user={user} isHost={!isAdmin} />
            </CardContent>
          </Card>
        )}

        {/* Form Templates Tab */}
        {activeTab === 'forms' && (
          <Card>
            <CardHeader>
              <CardTitle>Form Templates</CardTitle>
              {!isAdmin && (
                <p className="text-sm text-muted-foreground mt-2">
                  You can see system templates and your own custom forms.
                </p>
              )}
            </CardHeader>
            <CardContent>
              <FormTemplateManager adminEmail={user?.email} isHost={!isAdmin} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Analytics Modal */}
      {selectedEventForAnalytics && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedEventForAnalytics(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-background rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold">{selectedEventForAnalytics.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedEventForAnalytics.date} at {selectedEventForAnalytics.time}
                </p>
              </div>
              <EventAnalytics
                event={selectedEventForAnalytics}
                onClose={() => setSelectedEventForAnalytics(null)}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* QR Code Modal */}
      {selectedEventForQR && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedEventForQR(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-background rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-bold">{selectedEventForQR.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {showFeedbackQR ? 'Feedback Form QR Code' : 'Check-in QR Code'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEventForQR(null)}
                >
                  ✕
                </Button>
              </div>
              {showFeedbackQR ? (
                selectedEventForQR.feedback_form_id ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="text-center">
                          <h3 className="text-lg font-semibold mb-2">Feedback Form</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Scan this QR code to access the event feedback form
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                              `${window.location.origin}/event/${selectedEventForQR.id}/feedback`
                            )}`}
                            alt="Feedback Form QR Code"
                            className="w-64 h-64"
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-2">Or visit directly:</p>
                          <a
                            href={`/event/${selectedEventForQR.id}/feedback`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline break-all"
                          >
                            {window.location.origin}/event/{selectedEventForQR.id}/feedback
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="text-6xl mb-4">⚠️</div>
                      <h3 className="text-lg font-semibold mb-2">No Feedback Form Assigned</h3>
                      <p className="text-muted-foreground mb-4">
                        This event doesn't have a feedback form assigned yet.
                      </p>
                    </CardContent>
                  </Card>
                )
              ) : (
                selectedEventForQR.check_in_form_id ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="text-center">
                          <h3 className="text-lg font-semibold mb-2">Check-In Form</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Scan this QR code to access the event check-in form
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                              `${window.location.origin}/event/${selectedEventForQR.id}/check-in`
                            )}`}
                            alt="Check-In Form QR Code"
                            className="w-64 h-64"
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-2">Or visit directly:</p>
                          <a
                            href={`/event/${selectedEventForQR.id}/check-in`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline break-all"
                          >
                            {window.location.origin}/event/{selectedEventForQR.id}/check-in
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <EventQRCode event={selectedEventForQR} />
                )
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Event Modal */}
      <AnimatePresence>
        {showEditModal && selectedEventForEdit && (
          <EditEventModal
            event={selectedEventForEdit}
            user={user}
            onClose={() => {
              setShowEditModal(false);
              setSelectedEventForEdit(null);
            }}
            onSuccess={() => {
              // Refresh events list
              const refreshEvents = async () => {
                const response = await fetch('/api/events');
                const data = await response.json();
                if (data.events) {
                  const userEvents = isAdmin
                    ? data.events
                    : data.events.filter(event => event.created_by === user.email);
                  setMyEvents(userEvents);
                }
              };
              refreshEvents();
              setShowEditModal(false);
              setSelectedEventForEdit(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Edit Event Modal Component
function EditEventModal({ event, user, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    date: event?.date || '',
    time: event?.time || '',
    location: event?.location || '',
    capacity: event?.capacity || '',
    eventType: event?.event_type || 'hackathon',
    thumbnailUrl: event?.thumbnail_url || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [updateSeries, setUpdateSeries] = useState(false);

  const isPartOfSeries = event && (event.parent_event_id || event.is_recurring);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const eventData = {
        title: formData.title,
        description: formData.description,
        eventType: formData.eventType,
        date: formData.date,
        time: formData.time,
        location: formData.location,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        thumbnailUrl: formData.thumbnailUrl || null
      };

      const result = await updateEvent(event.id, eventData, updateSeries);

      if (result.updatedCount > 1) {
        alert(`Updated ${result.updatedCount} events in series`);
      } else {
        alert('Event updated successfully!');
      }

      onSuccess();
    } catch (err) {
      console.error('Failed to update event:', err);
      setError(err.message || 'Failed to update event');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-background border border-border rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Edit Event</h2>
          <p className="text-muted-foreground text-sm">Update event details</p>
          {isPartOfSeries && (
            <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-primary/20">🔁 Recurring Series</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                This event is part of a recurring series
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateSeries}
                  onChange={(e) => setUpdateSeries(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
                />
                <span className="text-sm font-medium">
                  Apply changes to all events in this series
                </span>
              </label>
              <p className="text-xs text-muted-foreground mt-1 ml-6">
                {updateSeries
                  ? 'All events in the series will be updated (dates will remain unchanged)'
                  : 'Only this specific event occurrence will be updated'}
              </p>
            </div>
          )}
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

          {/* Thumbnail URL */}
          <div>
            <label htmlFor="thumbnailUrl" className="block text-sm font-medium mb-2">
              Thumbnail URL (optional)
            </label>
            <Input
              id="thumbnailUrl"
              name="thumbnailUrl"
              type="url"
              value={formData.thumbnailUrl}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Updating...
                </>
              ) : (
                <>
                  <span className="mr-2">💾</span>
                  Update Event
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
