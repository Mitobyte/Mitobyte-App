import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { downloadICS } from '../../utils/icsGenerator';

const EVENT_TYPE_INFO = {
  code_and_coffee: {
    icon: '☕',
    label: 'Code & Coffee',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20'
  },
  code_and_brews: {
    icon: '🍺',
    label: 'Code & Brews',
    color: 'bg-orange-500/10 text-orange-600 border-orange-500/20'
  },
  hackathon: {
    icon: '💻',
    label: 'Hackathon',
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/20'
  },
  workshop: {
    icon: '🎓',
    label: 'Workshop',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20'
  },
  meetup: {
    icon: '🤝',
    label: 'Meetup',
    color: 'bg-green-500/10 text-green-600 border-green-500/20'
  }
};

export function EnhancedEventCard({
  event,
  onClick,
  onRsvp,
  rsvpStatus,
  attendeeCount = 0,
  recentAttendees = [],
  mutualConnections = 0
}) {
  const [timeUntil, setTimeUntil] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  const typeInfo = EVENT_TYPE_INFO[event.event_type] || EVENT_TYPE_INFO.meetup;

  // Calculate countdown
  useEffect(() => {
    const calculateTimeUntil = () => {
      const eventDate = new Date(`${event.date}T${event.time}`);
      const now = new Date();
      const diff = eventDate - now;

      if (diff < 0) {
        setTimeUntil('Event passed');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days > 0) {
        setTimeUntil(`in ${days} day${days > 1 ? 's' : ''}`);
      } else if (hours > 0) {
        setTimeUntil(`in ${hours} hour${hours > 1 ? 's' : ''}`);
      } else {
        setTimeUntil('Starting soon!');
      }
    };

    calculateTimeUntil();
    const interval = setInterval(calculateTimeUntil, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [event.date, event.time]);

  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative rounded-xl overflow-hidden border border-border/40 hover:border-primary/40 transition-all cursor-pointer bg-card"
      onClick={onClick}
    >
      {/* Event Image */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
        {event.thumbnail_url ? (
          <img
            src={event.thumbnail_url}
            alt={event.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">
            {typeInfo.icon}
          </div>
        )}

        {/* Countdown Badge */}
        {timeUntil && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-sm border border-border/40 text-xs font-medium"
          >
            {timeUntil}
          </motion.div>
        )}

        {/* Event Type Badge */}
        <div className="absolute top-3 left-3">
          <Badge className={typeInfo.color}>
            <span className="mr-1">{typeInfo.icon}</span>
            {typeInfo.label}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Title */}
        <h3 className="text-lg font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {event.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {event.description}
        </p>

        {/* Date, Time, Location */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-base">📅</span>
            <span className="font-medium">{formatDate(event.date)}</span>
            <span className="text-muted-foreground">at {formatTime(event.time)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-base">📍</span>
            <span className="text-muted-foreground line-clamp-1">{event.location}</span>
          </div>
        </div>

        {/* Add to Calendar Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            downloadICS(event);
          }}
          className="w-full mb-3 px-3 py-2 rounded-lg border border-border/40 hover:bg-foreground/5 transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
          <span>📅</span>
          <span>Add to Calendar</span>
        </button>

        {/* Attendees */}
        {(attendeeCount > 0 || recentAttendees.length > 0) && (
          <div className="mb-4 pb-4 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Avatar Stack */}
                {recentAttendees.length > 0 && (
                  <div className="flex -space-x-2">
                    {recentAttendees.slice(0, 3).map((attendee, index) => (
                      <div
                        key={index}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 border-2 border-background flex items-center justify-center text-xs font-bold"
                        title={attendee.display_name || attendee.email}
                      >
                        {(attendee.display_name || attendee.email || '?')[0].toUpperCase()}
                      </div>
                    ))}
                  </div>
                )}

                {/* Attendee Count */}
                <div className="text-sm">
                  <span className="font-medium">{attendeeCount}</span>
                  <span className="text-muted-foreground"> attending</span>
                </div>
              </div>

              {/* Mutual Connections */}
              {mutualConnections > 0 && (
                <div className="text-xs text-muted-foreground">
                  {mutualConnections} friend{mutualConnections > 1 ? 's' : ''} going
                </div>
              )}
            </div>
          </div>
        )}

        {/* RSVP Button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onRsvp?.(rsvpStatus === 'going' ? null : 'going');
          }}
          variant={rsvpStatus === 'going' ? 'default' : 'outline'}
          className="w-full rounded-full"
          size="sm"
        >
          {rsvpStatus === 'going' ? (
            <>
              <span className="mr-2">✅</span>
              You're Going!
            </>
          ) : (
            <>
              <span className="mr-2">🎟️</span>
              Join Event
            </>
          )}
        </Button>

        {/* Additional Badges */}
        {event.is_beginner_friendly && (
          <div className="mt-3 flex justify-center">
            <Badge variant="outline" className="text-xs">
              <span className="mr-1">🌱</span>
              Beginner Friendly
            </Badge>
          </div>
        )}
      </div>
    </motion.div>
  );
}
