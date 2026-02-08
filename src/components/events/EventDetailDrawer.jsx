import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

const EVENT_TYPE_INFO = {
  code_and_coffee: { icon: '☕', label: 'Code & Coffee', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  code_and_brews: { icon: '🍺', label: 'Code & Brews', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  hackathon: { icon: '💻', label: 'Hackathon', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  workshop: { icon: '🎓', label: 'Workshop', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  meetup: { icon: '🤝', label: 'Meetup', color: 'bg-green-500/10 text-green-600 border-green-500/20' }
};

export function EventDetailDrawer({ event, onClose, onRsvp, rsvpStatus, walletAddress, onViewProfile }) {
  const [attendees, setAttendees] = useState([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const typeInfo = EVENT_TYPE_INFO[event.event_type] || EVENT_TYPE_INFO.meetup;

  useEffect(() => {
    if (event) {
      fetchAttendees();
    }
  }, [event]);

  const fetchAttendees = async () => {
    try {
      setLoadingAttendees(true);
      const response = await fetch(`/api/events/${event.id}/attendees`);
      const data = await response.json();
      if (data.success) {
        setAttendees(data.attendees || []);
      }
    } catch (error) {
      console.error('Failed to load attendees:', error);
    } finally {
      setLoadingAttendees(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <AnimatePresence mode="wait">
      {event && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            style={{ pointerEvents: 'auto' }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[500px] bg-background border-l border-border z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold">Event Details</h2>
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
            <div className="p-6 space-y-6">
              {/* Event Image */}
              {event.thumbnail_url && (
                <div className="rounded-xl overflow-hidden">
                  <img
                    src={event.thumbnail_url}
                    alt={event.title}
                    className="w-full h-64 object-cover"
                  />
                </div>
              )}

              {/* Event Type Badge */}
              <Badge className={typeInfo.color}>
                <span className="mr-1">{typeInfo.icon}</span>
                {typeInfo.label}
              </Badge>

              {/* Title */}
              <h1 className="text-2xl font-bold">{event.title}</h1>

              {/* Description */}
              <p className="text-muted-foreground leading-relaxed">
                {event.description}
              </p>

              {/* Date & Time */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📅</span>
                  <div>
                    <div className="font-medium">{formatDate(event.date)}</div>
                    <div className="text-sm text-muted-foreground">{formatTime(event.time)}</div>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📍</span>
                  <div>
                    <div className="font-medium">{event.location}</div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      View on map →
                    </a>
                  </div>
                </div>
              </div>

              {/* RSVP Section */}
              <div className="space-y-3">
                <h3 className="font-semibold">RSVP Status</h3>
                {walletAddress ? (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => onRsvp?.('going')}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-colors ${rsvpStatus === 'going'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-foreground/5'
                        }`}
                    >
                      <span className="text-2xl mb-1">✅</span>
                      <span className="text-sm font-medium">Going</span>
                    </button>
                    <button
                      onClick={() => onRsvp?.('maybe')}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-colors ${rsvpStatus === 'maybe'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-foreground/5'
                        }`}
                    >
                      <span className="text-2xl mb-1">🤔</span>
                      <span className="text-sm font-medium">Maybe</span>
                    </button>
                    <button
                      onClick={() => onRsvp?.('no')}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-colors ${rsvpStatus === 'no'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-foreground/5'
                        }`}
                    >
                      <span className="text-2xl mb-1">❌</span>
                      <span className="text-sm font-medium">Can't Go</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 text-center space-y-3">
                    <p className="text-lg font-medium">👋 Join the Mitobyte Community!</p>
                    <p className="text-sm text-muted-foreground">
                      Sign in to RSVP for this event, connect with other members, and participate in Milwaukee's tech community.
                    </p>
                    <p className="text-xs text-muted-foreground italic">
                      Create an account or sign in to get started
                    </p>
                  </div>
                )}
              </div>

              {/* Attendees */}
              <div className="space-y-3">
                <h3 className="font-semibold">Who's Attending</h3>
                {loadingAttendees ? (
                  <div className="flex justify-center p-6">
                    <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin"></div>
                  </div>
                ) : attendees.length > 0 ? (
                  <div className="space-y-2">
                    {attendees.map((attendee, index) => {
                      const displayName = attendee.name || attendee.display_name || attendee.email?.split('@')[0] || 'Member';
                      const initials = displayName[0]?.toUpperCase() || '?';
                      return (
                        <button
                          key={index}
                          onClick={() => {
                            if (attendee.user_wallet_hash) {
                              onViewProfile?.(attendee.user_wallet_hash);
                            }
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-foreground/5 transition-colors cursor-pointer text-left"
                        >
                          {attendee.avatar_url ? (
                            <img
                              src={attendee.avatar_url}
                              alt={displayName}
                              className="w-10 h-10 rounded-full object-cover border-2 border-border"
                              onError={(e) => {
                                const div = document.createElement('div');
                                div.className = 'w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center text-sm font-bold';
                                div.textContent = initials;
                                e.target.replaceWith(div);
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center text-sm font-bold">
                              {initials}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {displayName}
                            </div>
                            {attendee.name && attendee.display_name && (
                              <div className="text-xs text-muted-foreground truncate">
                                @{attendee.display_name}
                              </div>
                            )}
                          </div>
                          {attendee.rsvp_status === 'going' && (
                            <Badge variant="outline" className="text-xs">✅ Going</Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center p-6 border border-border rounded-lg">
                    No one has RSVP'd yet. Be the first!
                  </p>
                )}
              </div>

              {/* Share */}
              <div className="space-y-3">
                <h3 className="font-semibold">Share Event</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const eventUrl = `${window.location.origin}/event/${event.id}`;
                      try {
                        await navigator.clipboard.writeText(eventUrl);
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2000);
                      } catch (error) {
                        console.error('Failed to copy link:', error);
                      }
                    }}
                  >
                    <span className="mr-2">{linkCopied ? '✅' : '🔗'}</span>
                    {linkCopied ? 'Link Copied!' : 'Copy Link'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const text = `Check out ${event.title} on Mitobyte!`;
                      const url = `${window.location.origin}/event/${event.id}`;
                      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
                    }}
                  >
                    <span className="mr-2">🐦</span>
                    Tweet
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
