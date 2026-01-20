import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from './ui/card';
import { EventDetailDrawer } from './events/EventDetailDrawer';
import { ProfileDrawer } from './ProfileDrawer';

/**
 * Showcase Component (Now: Community Check-In Feed)
 * Displays recent event check-ins from the community
 */
export function Showcase({ user, walletAddress }) {
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedProfileWallet, setSelectedProfileWallet] = useState(null);
  const [rsvpStatus, setRsvpStatus] = useState({});

  useEffect(() => {
    fetchCheckInFeed();
  }, []);

  useEffect(() => {
    if (walletAddress && checkIns.length > 0) {
      loadUserRsvps();
    }
  }, [walletAddress, checkIns]);

  const fetchCheckInFeed = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/checkins/feed');
      const data = await response.json();

      console.log('🔍 DEBUG: Check-in feed response:', data);
      console.log('🔍 DEBUG: First check-in:', data.checkIns?.[0]);

      if (data.success) {
        setCheckIns(data.checkIns || []);
      }
    } catch (error) {
      console.error('Error fetching check-in feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRsvps = async () => {
    try {
      const response = await fetch(`/api/rsvps?walletAddress=${encodeURIComponent(walletAddress)}`);
      const data = await response.json();
      const rsvpMap = {};
      data.rsvps?.forEach(rsvp => {
        rsvpMap[rsvp.event_id] = rsvp.rsvp_status;
      });
      setRsvpStatus(rsvpMap);
    } catch (error) {
      console.error('Failed to load RSVPs:', error);
    }
  };

  const handleRsvp = async (eventId, status) => {
    if (!walletAddress) {
      alert('Please sign in to RSVP for events');
      return;
    }

    const newStatus = rsvpStatus[eventId] === status ? null : status;

    // Optimistically update UI
    setRsvpStatus(prev => ({
      ...prev,
      [eventId]: newStatus
    }));

    if (!newStatus) {
      return;
    }

    try {
      const response = await fetch('/api/rsvps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          walletAddress,
          rsvpStatus: newStatus
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save RSVP');
      }
    } catch (error) {
      console.error('Failed to save RSVP:', error);
      // Revert on error
      setRsvpStatus(prev => ({
        ...prev,
        [eventId]: rsvpStatus[eventId]
      }));
    }
  };

  const handleEventClick = async (checkIn) => {
    console.log('🔍 DEBUG: handleEventClick called');
    console.log('🔍 DEBUG: checkIn object:', checkIn);
    console.log('🔍 DEBUG: checkIn.eventId:', checkIn.eventId);
    console.log('🔍 DEBUG: checkIn.event_id:', checkIn.event_id);

    const eventId = checkIn.eventId || checkIn.event_id;
    console.log('🔍 DEBUG: Using eventId:', eventId);

    if (!eventId) {
      console.error('❌ DEBUG: No event ID found!');
      return;
    }

    // Fetch full event details
    try {
      const url = `/api/events/${eventId}`;
      console.log('🔍 DEBUG: Fetching from:', url);

      const response = await fetch(url);
      console.log('🔍 DEBUG: Response status:', response.status);

      const data = await response.json();
      console.log('🔍 DEBUG: Response data:', data);
      console.log('🔍 DEBUG: data.success:', data.success);
      console.log('🔍 DEBUG: data.event:', data.event);
      console.log('🔍 DEBUG: typeof data.success:', typeof data.success);
      console.log('🔍 DEBUG: Boolean check (data.success && data.event):', !!(data.success && data.event));

      if (data.success && data.event) {
        console.log('✅ DEBUG: Setting selected event:', data.event);
        setSelectedEvent(data.event);
      } else if (data.event && !data.success) {
        console.warn('⚠️ DEBUG: Event exists but success is false/missing - using event anyway');
        setSelectedEvent(data.event);
      } else {
        console.error('❌ DEBUG: No event in response or failed:', data);
      }
    } catch (error) {
      console.error('❌ DEBUG: Failed to load event:', error);
    }
  };

  const handleViewProfile = (walletHash) => {
    // Open profile drawer instead of navigating
    setSelectedProfileWallet(walletHash);
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getEventTypeIcon = (eventType) => {
    switch (eventType) {
      case 'code_and_coffee': return '☕';
      case 'code_and_brews': return '🍺';
      case 'hackathon': return '💻';
      case 'workshop': return '🎓';
      case 'meetup': return '🤝';
      default: return '🎉';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 sm:py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-foreground/20 border-t-foreground rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">Loading check-ins...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8"
    >
      {/* Page Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Community Check-Ins</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          See what events the Milwaukee tech community is attending
        </p>
      </div>

      {/* Check-In Feed */}
      {checkIns.length > 0 ? (
        <div className="space-y-4 sm:space-y-5">
          {checkIns.map((checkIn, index) => (
            <motion.div
              key={checkIn.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-4 sm:p-5 hover:shadow-md transition-shadow">
                {/* User & Event Info */}
                <div className="flex items-start gap-3 sm:gap-4 mb-4">
                  {/* User Avatar */}
                  <div className="flex-shrink-0">
                    {checkIn.avatarUrl ? (
                      <img
                        src={checkIn.avatarUrl}
                        alt={checkIn.username}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-border"
                      />
                    ) : (
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center text-lg sm:text-xl font-bold border-2 border-border">
                        {checkIn.profileVisibility === 'private' ? '?' : (checkIn.username || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* User & Event Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      {checkIn.walletHash ? (
                        <button
                          onClick={() => handleViewProfile(checkIn.walletHash)}
                          className="font-semibold text-base sm:text-lg hover:text-primary transition-colors cursor-pointer text-left"
                        >
                          {checkIn.username}
                        </button>
                      ) : (
                        <h3 className="font-semibold text-base sm:text-lg text-muted-foreground">
                          {checkIn.username}
                        </h3>
                      )}
                      <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                        {formatTimeAgo(checkIn.checkedInAt || checkIn.checked_in_at)}
                      </span>
                    </div>

                    {/* Event Info - Clickable */}
                    <div className="flex items-center gap-2 text-sm sm:text-base text-muted-foreground mb-2">
                      <span className="text-lg sm:text-xl">{getEventTypeIcon(checkIn.eventType || checkIn.event_type)}</span>
                      <button
                        onClick={() => handleEventClick(checkIn)}
                        className="font-medium truncate hover:text-primary transition-colors text-left hover:underline"
                      >
                        {checkIn.eventTitle || checkIn.event_title}
                      </button>
                    </div>

                    {(checkIn.eventDate || checkIn.event_date) && (
                      <button
                        onClick={() => handleEventClick(checkIn)}
                        className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors text-left hover:underline"
                      >
                        📅 {new Date(checkIn.eventDate || checkIn.event_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </button>
                    )}
                  </div>
                </div>

                {/* Standup Responses (if available) */}
                {(checkIn.workingOn || checkIn.working_on || checkIn.canHelpWith || checkIn.can_help_with) && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3">
                    {(checkIn.workingOn || checkIn.working_on) && (
                      <div className="bg-primary/5 rounded-lg p-3">
                        <p className="text-xs sm:text-sm font-medium text-primary mb-1">💻 Working on:</p>
                        <p className="text-sm sm:text-base">{checkIn.workingOn || checkIn.working_on}</p>
                      </div>
                    )}

                    {(checkIn.canHelpWith || checkIn.can_help_with) && (
                      <div className="bg-secondary/5 rounded-lg p-3">
                        <p className="text-xs sm:text-sm font-medium text-secondary mb-1">🤝 Can help with:</p>
                        <p className="text-sm sm:text-base">{checkIn.canHelpWith || checkIn.can_help_with}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Badge support coming soon */}
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="p-8 sm:p-12 text-center">
          <div className="text-6xl sm:text-7xl mb-4">📭</div>
          <h3 className="text-xl sm:text-2xl font-semibold mb-2">No Check-Ins Yet</h3>
          <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
            Be the first to check in to an event and share what you're working on!
          </p>
        </Card>
      )}

      {/* Event Detail Drawer */}
      {selectedEvent && (
        <EventDetailDrawer
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onRsvp={handleRsvp}
          rsvpStatus={rsvpStatus[selectedEvent.id]}
          walletAddress={walletAddress}
          onViewProfile={handleViewProfile}
        />
      )}

      {/* Profile Drawer */}
      {selectedProfileWallet && (
        <ProfileDrawer
          walletHash={selectedProfileWallet}
          onClose={() => setSelectedProfileWallet(null)}
          currentUserWallet={walletAddress}
          isAuthenticated={!!walletAddress}
        />
      )}
    </motion.div>
  );
}
