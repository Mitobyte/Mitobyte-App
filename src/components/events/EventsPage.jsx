import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { EventsHeroBanner } from './EventsHeroBanner';
import { EnhancedEventCard } from './EnhancedEventCard';
import { EventDetailDrawer } from './EventDetailDrawer';
import { EventRequestForm } from './EventRequestForm';
import { getAllEvents } from '../../services/eventApi';
import { saveRsvp, getUserRsvps } from '../../services/rsvpApi';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

export function EventsPage({ user, walletAddress, isAdmin }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [rsvpStatus, setRsvpStatus] = useState({});
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [eventAttendees, setEventAttendees] = useState({});
  const [aiSearchMode, setAiSearchMode] = useState(false);
  const [aiSearchResults, setAiSearchResults] = useState([]);
  const [aiSearching, setAiSearching] = useState(false);

  // Unified filter options - combines view mode and event types
  const filterOptions = [
    { value: 'all', label: 'All Events', icon: '🎉', type: 'view' },
    { value: 'calendar', label: 'Calendar View', icon: '📅', type: 'view' },
    ...(walletAddress ? [{ value: 'my-events', label: 'My Events', icon: '✅', type: 'view', badge: Object.values(rsvpStatus).filter(s => s === 'going').length }] : []),
    { value: 'meetup', label: 'Meetups', icon: '🤝', type: 'event' },
    { value: 'workshop', label: 'Workshops', icon: '🎓', type: 'event' },
    { value: 'hackathon', label: 'Hackathons', icon: '💻', type: 'event' },
    { value: 'code_and_coffee', label: 'Code & Coffee', icon: '☕', type: 'event' },
    { value: 'code_and_brews', label: 'Code & Brews', icon: '🍺', type: 'event' }
  ];

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (walletAddress && events.length > 0) {
      loadUserRsvps();
      loadEventAttendees();
    }
  }, [walletAddress, events]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await getAllEvents({ upcoming: true });
      setEvents(data.events || []);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRsvps = async () => {
    try {
      const data = await getUserRsvps(walletAddress);
      const rsvpMap = {};
      data.rsvps?.forEach(rsvp => {
        rsvpMap[rsvp.event_id] = rsvp.rsvp_status;
      });
      setRsvpStatus(rsvpMap);
    } catch (error) {
      console.error('Failed to load RSVPs:', error);
    }
  };

  const loadEventAttendees = async () => {
    const attendeeMap = {};
    for (const event of events) {
      try {
        const response = await fetch(`/api/events/${event.id}/attendees`);
        const data = await response.json();
        if (data.success) {
          attendeeMap[event.id] = data.attendees || [];
        }
      } catch (error) {
        console.error(`Failed to load attendees for event ${event.id}:`, error);
      }
    }
    setEventAttendees(attendeeMap);
  };

  const handleRsvp = async (eventId, status) => {
    console.log('🎫 handleRsvp called:', { eventId, status, currentStatus: rsvpStatus[eventId] });

    if (!walletAddress) {
      alert('Please sign in to RSVP for events');
      return;
    }

    const newStatus = rsvpStatus[eventId] === status ? null : status;
    console.log('🎫 Computed newStatus:', newStatus);

    // Optimistically update UI
    setRsvpStatus(prev => ({
      ...prev,
      [eventId]: newStatus
    }));

    if (!newStatus) {
      console.log('🎫 newStatus is null, skipping API call');
      return;
    }

    try {
      console.log('🎫 Calling saveRsvp with:', { eventId, walletAddress, rsvpStatus: newStatus });
      const result = await saveRsvp({
        eventId,
        walletAddress,
        rsvpStatus: newStatus
      });
      console.log('🎫 saveRsvp result:', result);
      // Refresh attendees after RSVP
      loadEventAttendees();
    } catch (error) {
      console.error('Failed to save RSVP:', error);
      // Revert on error
      setRsvpStatus(prev => ({
        ...prev,
        [eventId]: rsvpStatus[eventId]
      }));
    }
  };

  const handleAiSearch = async () => {
    if (!searchTerm.trim()) {
      alert('Please enter a search query');
      return;
    }

    setAiSearching(true);
    setAiSearchMode(true);

    try {
      const response = await fetch('/api/events/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchTerm })
      });

      const data = await response.json();

      if (data.success) {
        setAiSearchResults(data.events || []);
      } else {
        alert('AI search failed: ' + (data.error || 'Unknown error'));
        setAiSearchMode(false);
      }
    } catch (error) {
      console.error('AI search error:', error);
      alert('Failed to perform AI search');
      setAiSearchMode(false);
    } finally {
      setAiSearching(false);
    }
  };

  const clearAiSearch = () => {
    setAiSearchMode(false);
    setAiSearchResults([]);
    setSearchTerm('');
  };

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Filter events based on unified filter
  const filteredEvents = useMemo(() => {
    // If AI search is active, use AI results
    if (aiSearchMode && aiSearchResults.length > 0) {
      let filtered = [...aiSearchResults];

      // Apply My Events filter to AI results
      if (selectedFilter === 'my-events') {
        filtered = filtered.filter(event => rsvpStatus[event.id] === 'going');
      }

      // Apply event type filter to AI results
      if (selectedFilter !== 'all' && selectedFilter !== 'calendar' && selectedFilter !== 'my-events') {
        filtered = filtered.filter(event => event.event_type === selectedFilter);
      }

      return filtered;
    }

    // Regular filtering
    let filtered = [...events];

    // Calendar view needs all events to show properly in monthly grid
    if (selectedFilter === 'calendar') {
      return filtered;
    }

    // Apply My Events filter
    if (selectedFilter === 'my-events') {
      filtered = filtered.filter(event => rsvpStatus[event.id] === 'going');
    }

    // Apply event type filter
    if (selectedFilter !== 'all' && selectedFilter !== 'my-events') {
      filtered = filtered.filter(event => event.event_type === selectedFilter);
    }

    // Search filtering
    if (searchTerm && !aiSearchMode) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(term) ||
        event.description.toLowerCase().includes(term) ||
        event.location.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [events, searchTerm, selectedFilter, rsvpStatus, aiSearchMode, aiSearchResults]);

  // Calendar Logic
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const weeks = [];
    let week = new Array(7).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = (startingDayOfWeek + day - 1) % 7;
      week[dayOfWeek] = day;
      if (dayOfWeek === 6 || day === daysInMonth) {
        weeks.push([...week]);
        week = new Array(7).fill(null);
      }
    }
    return { year, month, weeks, daysInMonth };
  }, [currentMonth]);

  const getEventsForDate = (day) => {
    if (!day) return [];
    const dateStr = `${calendarData.year}-${String(calendarData.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(event => event.date === dateStr);
  };

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
      {/* Hero Banner */}
      <div className="mb-8 sm:mb-10 lg:mb-12">
        <EventsHeroBanner
          onCreateEvent={() => setShowRequestForm(true)}
          isAdmin={isAdmin}
        />
      </div>

      {/* Unified Filter Pills */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {filterOptions.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setSelectedFilter(filter.value)}
              className={`flex items-center justify-center px-4 sm:px-5 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-medium transition-all touch-manipulation active:scale-95 ${selectedFilter === filter.value
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'border-2 border-border hover:bg-foreground/5 hover:border-foreground/20'
                }`}
            >
              <span className="text-base sm:text-lg">{filter.icon}</span>
              <span className="ml-1.5 sm:ml-2 whitespace-nowrap">{filter.label}</span>
              {filter.badge > 0 && (
                <Badge className="ml-1.5 sm:ml-2 text-xs" variant="secondary">
                  {filter.badge}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Hackreation Hub Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8"
      >
        <button
          onClick={() => {
            window.history.pushState({}, '', '/hack');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          className="w-full p-4 sm:p-5 rounded-xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-purple-500/20 flex items-center justify-center text-2xl sm:text-3xl">
              💻
            </div>
            <div className="text-left">
              <div className="font-bold text-base sm:text-lg group-hover:text-primary transition-colors">
                Hackreation Hub
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                Join hackathons, submit projects, and compete for prizes
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-primary">
            <span>Explore</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </button>
      </motion.div>

      {/* Filters */}
      <div id="events-list" className="space-y-5 sm:space-y-6 mb-8 sm:mb-10">
        {/* AI Search Banner */}
        {aiSearchMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-2 border-purple-500/20"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl sm:text-3xl">✨</span>
                <div>
                  <p className="font-semibold text-base sm:text-lg">AI Search Active</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Showing {aiSearchResults.length} AI-matched results for "{searchTerm}"
                  </p>
                </div>
              </div>
              <button
                onClick={clearAiSearch}
                className="px-5 py-2.5 rounded-full text-sm font-medium border-2 border-border hover:bg-foreground/5 transition-colors touch-manipulation"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-3">
          <div className="relative flex-1">
            <Input
              placeholder="✨ Try: 'morning coding events', 'learn web development'..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (aiSearchMode) setAiSearchMode(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm.trim()) {
                  handleAiSearch();
                }
              }}
              className="h-12 sm:h-14 text-base pl-4"
            />
          </div>
          <button
            onClick={handleAiSearch}
            disabled={aiSearching || !searchTerm.trim()}
            className="px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap touch-manipulation active:scale-95 shadow-lg"
          >
            {aiSearching ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block mr-2" />
                Searching...
              </>
            ) : (
              <>
                <span className="mr-2 text-lg">✨</span>
                <span className="hidden sm:inline">AI Search</span>
                <span className="sm:hidden">Search</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground px-1">
          💡 Tip: Use natural language like "evening coding events" or "learn React" for AI-powered discovery
        </p>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 sm:py-20 lg:py-24">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-3 border-foreground/20 border-t-foreground rounded-full animate-spin"></div>
            <p className="text-sm text-muted-foreground">Loading events...</p>
          </div>
        </div>
      ) : selectedFilter === 'calendar' ? (
        /* Calendar View rendering */
        <div className="animate-in fade-in duration-500">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6 bg-card border border-border rounded-xl p-3 shadow-sm">
            <button
              onClick={prevMonth}
              className="px-4 py-2 hover:bg-muted rounded-lg transition-colors"
            >
              ← Prev
            </button>
            <h3 className="text-lg font-semibold">
              {monthNames[calendarData.month]} {calendarData.year}
            </h3>
            <button
              onClick={nextMonth}
              className="px-4 py-2 hover:bg-muted rounded-lg transition-colors"
            >
              Next →
            </button>
          </div>

          <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-card">
            <div className="grid grid-cols-7 bg-muted/50 border-b border-border">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 bg-background">
              {calendarData.weeks.map((week, weekIndex) => (
                week.map((day, dayIndex) => {
                  const dayEvents = getEventsForDate(day);
                  const isToday = day &&
                    new Date().getDate() === day &&
                    new Date().getMonth() === calendarData.month &&
                    new Date().getFullYear() === calendarData.year;

                  return (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={`min-h-[120px] p-2 border-r border-b border-border/50 transition-colors ${!day ? 'bg-muted/10' : 'hover:bg-muted/20'
                        } ${isToday ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : ''}`}
                    >
                      {day && (
                        <>
                          <div className={`text-xs font-medium mb-2 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                            {day}
                          </div>
                          <div className="space-y-1.5">
                            {dayEvents.map(event => {
                              const icon = filterOptions.find(opt => opt.value === event.event_type)?.icon || '📅';
                              return (
                                <button
                                  key={event.id}
                                  onClick={() => setSelectedEvent(event)}
                                  className="w-full text-left text-xs p-1.5 rounded-md bg-secondary/50 hover:bg-secondary border border-transparent hover:border-border transition-all group"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span className="shrink-0">{icon}</span>
                                    <span className="truncate font-medium group-hover:text-primary transition-colors">{event.title}</span>
                                  </div>
                                  <div className="text-[10px] text-muted-foreground pl-5 mt-0.5">
                                    {event.time && new Date(`2000-01-01T${event.time}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              ))}
            </div>
          </div>
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
          {filteredEvents.map((event, index) => (
            <div key={event.id} className="relative">
              {/* AI Match Badge */}
              {aiSearchMode && event.relevance_score && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="absolute -top-3 -right-3 z-10"
                >
                  <div className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold shadow-lg">
                    {Math.round(event.relevance_score * 100)}% Match
                  </div>
                </motion.div>
              )}

              <EnhancedEventCard
                event={event}
                onClick={() => setSelectedEvent(event)}
                onRsvp={(status) => handleRsvp(event.id, status)}
                rsvpStatus={rsvpStatus[event.id]}
                attendeeCount={eventAttendees[event.id]?.length || 0}
                recentAttendees={eventAttendees[event.id]?.slice(0, 3) || []}
                mutualConnections={0} // TODO: Calculate mutual connections
              />

              {/* AI Match Reason */}
              {aiSearchMode && event.match_reason && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 + 0.1 }}
                  className="mt-2 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20"
                >
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-purple-600 dark:text-purple-400">Why this matches:</span>{' '}
                    {event.match_reason}
                  </p>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16 sm:py-20 lg:py-24 px-4"
        >
          <div className="text-6xl sm:text-7xl mb-5 sm:mb-6">📭</div>
          <h3 className="text-xl sm:text-2xl font-semibold mb-3">No Events Found</h3>
          <p className="text-muted-foreground mb-8 text-base sm:text-lg max-w-md mx-auto">
            {selectedFilter === 'my-events'
              ? "You haven't RSVP'd to any events yet."
              : searchTerm || selectedFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'No upcoming events scheduled.'}
          </p>
          {!isAdmin && (
            <button
              onClick={() => setShowRequestForm(true)}
              className="px-7 py-3.5 bg-primary text-primary-foreground rounded-full font-medium hover:opacity-90 transition-all touch-manipulation active:scale-95 shadow-lg text-base"
            >
              <span className="mr-2 text-lg">💡</span>
              Request an Event
            </button>
          )}
        </motion.div>
      )}

      {/* Milwaukee Highlight Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-12 sm:mt-16 lg:mt-20 p-6 sm:p-8 lg:p-10 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/20"
      >
        <h3 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">🏙️ Why Milwaukee Tech?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="space-y-3">
            <div className="text-4xl sm:text-5xl">🌆</div>
            <h4 className="font-semibold text-lg sm:text-xl">Vibrant Scene</h4>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              From Brady Street to the Third Ward, Milwaukee's tech community is thriving
            </p>
          </div>
          <div className="space-y-3">
            <div className="text-4xl sm:text-5xl">🤝</div>
            <h4 className="font-semibold text-lg sm:text-xl">Inclusive Community</h4>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              All skill levels welcome - from beginners to seasoned pros
            </p>
          </div>
          <div className="space-y-3">
            <div className="text-4xl sm:text-5xl">🚀</div>
            <h4 className="font-semibold text-lg sm:text-xl">Real Opportunities</h4>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Connect with local startups, established companies, and fellow builders
            </p>
          </div>
        </div>
      </motion.div>

      {/* Event Detail Drawer */}
      {selectedEvent && (
        <EventDetailDrawer
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onViewProfile={(walletHash) => {
            // Navigate to profile view
            const url = new URL(window.location);
            url.searchParams.set('viewProfile', walletHash);
            window.history.pushState({}, '', url);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          onRsvp={(status) => handleRsvp(selectedEvent.id, status)}
          rsvpStatus={rsvpStatus[selectedEvent.id]}
          walletAddress={walletAddress}
        />
      )}

      {/* Event Request Form */}
      {showRequestForm && (
        <EventRequestForm
          onClose={() => setShowRequestForm(false)}
          userEmail={user?.email}
        />
      )}
    </div>
  );
}
