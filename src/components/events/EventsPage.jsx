import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Event type filters (icon-only)
  const eventTypeFilters = [
    { value: 'all', icon: '🎉', label: 'All' },
    ...(walletAddress ? [{ value: 'my-events', icon: '✅', label: 'My Events', badge: Object.values(rsvpStatus).filter(s => s === 'going').length }] : []),
    { value: 'code_and_coffee', icon: '☕', label: 'Coffee' },
    { value: 'code_and_brews', icon: '🍺', label: 'Brews' },
    { value: 'hackathon', icon: '💻', label: 'Hackathons' },
    { value: 'meetup', icon: '🤝', label: 'Meetups' },
    { value: 'workshop', icon: '🎓', label: 'Workshops' }
  ];

  // View mode options
  const [viewMode, setViewMode] = useState('grid');

  // Sort options
  const [sortBy, setSortBy] = useState('upcoming');
  const sortOptions = [
    { value: 'featured', label: 'Featured' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'past', label: 'Past' }
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

  const handleAiSearch = async (term = searchTerm) => {
    const query = term || searchTerm;
    if (!query.trim()) {
      alert('Please enter a search query');
      return;
    }

    setAiSearching(true);
    setAiSearching(true);
    // Keep search execution local to modal, don't update main view mode
    // setAiSearchMode(true);
    // Don't close modal on search, show results inline
    // setShowSearchModal(false);

    try {
      const response = await fetch('/api/events/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query })
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

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    // If AI search is active, use AI results
    if (aiSearchMode && aiSearchResults.length > 0) {
      let filtered = [...aiSearchResults];

      // Apply My Events filter to AI results
      if (selectedFilter === 'my-events') {
        filtered = filtered.filter(event => rsvpStatus[event.id] === 'going');
      }

      // Apply event type filter to AI results
      if (selectedFilter !== 'all' && selectedFilter !== 'my-events') {
        filtered = filtered.filter(event => event.event_type === selectedFilter);
      }

      return filtered;
    }

    // Regular filtering
    let filtered = [...events];

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

    // Sort based on sortBy
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (sortBy === 'past') {
      filtered = filtered.filter(event => new Date(event.date + 'T00:00:00') < today);
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date)); // Most recent past first
    } else if (sortBy === 'upcoming') {
      filtered = filtered.filter(event => new Date(event.date + 'T00:00:00') >= today);
      filtered.sort((a, b) => new Date(a.date) - new Date(b.date)); // Soonest first
    } else if (sortBy === 'featured') {
      // Featured: prioritize events with is_featured flag, then by date
      filtered.sort((a, b) => {
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return new Date(a.date) - new Date(b.date);
      });
    }

    return filtered;
  }, [events, selectedFilter, searchTerm, aiSearchMode, aiSearchResults, rsvpStatus, sortBy]);

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
          onFindEvents={() => setShowSearchModal(true)}
          isAdmin={isAdmin}
        />
      </div>

      {/* Minimalist Filter Bar - Framer Style */}
      <div className="mb-6 space-y-3">
        {/* Top row: Event Type Icons with horizontal scroll on mobile */}
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 py-2 sm:mx-0 sm:px-0 sm:py-2">
          <div className="flex items-center gap-1 min-w-max sm:min-w-0">
            {eventTypeFilters.map((filter) => (
              <motion.button
                key={filter.value}
                onClick={() => setSelectedFilter(filter.value)}
                title={filter.label}
                layout
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative h-10 rounded-xl flex items-center justify-center text-lg transition-colors flex-shrink-0 ${selectedFilter === filter.value
                  ? 'bg-primary text-primary-foreground shadow-md px-3 gap-2'
                  : 'hover:bg-foreground/5 w-10'
                  }`}
              >
                <motion.span layout="position">{filter.icon}</motion.span>
                <AnimatePresence>
                  {selectedFilter === filter.value && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {filter.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {filter.badge > 0 && selectedFilter !== filter.value && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                    {filter.badge}
                  </span>
                )}
                {filter.badge > 0 && selectedFilter === filter.value && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary-foreground/20 text-[10px] text-primary-foreground">
                    {filter.badge}
                  </span>
                )}
              </motion.button>
            ))}

            {/* Hackreation Hub Link */}
            <div className="h-8 w-px bg-border mx-1" />
            <button
              onClick={() => {
                window.history.pushState({}, '', '/hack');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="group flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-lg border border-transparent hover:border-border/40 hover:bg-foreground/5 whitespace-nowrap"
            >
              <span className="text-base">💻</span>
              <span className="hidden sm:inline">Hackreation Hub</span>
              <span className="sm:hidden">Hub</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </button>
          </div>
        </div>

        {/* Bottom row: Sort & View Controls */}
        <div className="flex items-center justify-between gap-2">
          {/* Sort Options */}
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            {sortOptions.map((sort) => (
              <motion.button
                key={sort.value}
                onClick={() => setSortBy(sort.value)}
                whileTap={{ scale: 0.95 }}
                className={`px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-colors relative ${sortBy === sort.value
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                  }`}
              >
                {sortBy === sort.value && (
                  <motion.div
                    layoutId="activeSort"
                    className="absolute inset-0 bg-foreground/10 -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
                  />
                )}
                {sort.label}
              </motion.button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <motion.button
              onClick={() => setViewMode('list')}
              title="List View"
              whileTap={{ scale: 0.9 }}
              className={`p-2 transition-colors relative ${viewMode === 'list' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {viewMode === 'list' && (
                <motion.div
                  layoutId="activeView"
                  className="absolute inset-0 bg-foreground/10 -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
                />
              )}
              ☰
            </motion.button>
            <motion.button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              whileTap={{ scale: 0.9 }}
              className={`p-2 transition-colors relative ${viewMode === 'grid' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {viewMode === 'grid' && (
                <motion.div
                  layoutId="activeView"
                  className="absolute inset-0 bg-foreground/10 -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
                />
              )}
              ▦
            </motion.button>
          </div>
        </div>
      </div>



      {/* Hackreation Hub Banner - Only for Hackathon Tab */}
      <AnimatePresence>
        {selectedFilter === 'hackathon' && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
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
        )}
      </AnimatePresence>

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
      ) : filteredEvents.length > 0 ? (
        /* Events Grid - supports list/grid view */
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6" : "flex flex-col gap-4"}>
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
                mutualConnections={0}
                viewMode={viewMode}
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
      )
      }

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
      {
        selectedEvent && (
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
        )
      }

      {/* Event Request Form */}
      {
        showRequestForm && (
          <EventRequestForm
            onClose={() => setShowRequestForm(false)}
            userEmail={user?.email}
          />
        )
      }

      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        handleSearch={handleAiSearch}
        isSearching={aiSearching}
        results={aiSearchResults}
        onSelectEvent={(event) => {
          setSelectedEvent(event);
          setShowSearchModal(false);
        }}
        onRsvp={handleRsvp}
        rsvpStatus={rsvpStatus}
        eventAttendees={eventAttendees}
      />
    </div >
  );
}

function SearchModal({
  isOpen, onClose, searchTerm, setSearchTerm, handleSearch, isSearching,
  results = [], onSelectEvent, onRsvp, rsvpStatus = {}, eventAttendees = {}
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 sm:pt-32 px-4"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-2xl bg-background rounded-2xl shadow-2xl border border-border overflow-hidden z-50 flex flex-col max-h-[80vh]"
          >
            <div className="p-6 pb-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">🔍</span>
                <h2 className="text-xl font-semibold">Find Events</h2>
                <button
                  onClick={onClose}
                  className="ml-auto w-8 h-8 flex items-center justify-center rounded-full hover:bg-foreground/10 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div className="relative">
                  <Input
                    placeholder="Describe what you're looking for..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchTerm.trim()) {
                        handleSearch();
                      }
                    }}
                    className="h-14 text-lg pl-4 shadow-sm"
                    autoFocus
                  />
                </div>

                <button
                  onClick={() => handleSearch()}
                  disabled={isSearching || !searchTerm.trim()}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {isSearching ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Searching...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <span>✨</span>
                      <span>AI Search</span>
                    </div>
                  )}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pt-2">
              {results.length > 0 ? (
                <div className="space-y-6 mt-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Found {results.length} results</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {results.map((event) => (
                      <div key={event.id} className="relative">
                        <EnhancedEventCard
                          event={event}
                          onClick={() => onSelectEvent(event)}
                          onRsvp={(status) => onRsvp(event.id, status)}
                          rsvpStatus={rsvpStatus[event.id]}
                          attendeeCount={eventAttendees[event.id]?.length || 0}
                          recentAttendees={eventAttendees[event.id]?.slice(0, 3) || []}
                          viewMode="list"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Try searching for
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['Morning coding events', 'React workshops', 'Weekend hackathons', 'Beginner friendly', 'Free food'].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setSearchTerm(suggestion);
                          handleSearch(suggestion);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-foreground/5 hover:bg-foreground/10 text-sm text-foreground/80 hover:text-foreground transition-colors border border-transparent hover:border-foreground/20"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
