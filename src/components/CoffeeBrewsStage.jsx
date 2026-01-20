import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import CodeCoffeeRoom from './CodeCoffeeRoom';

export default function CoffeeBrewsStage({ walletAddress }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    if (!selectedEvent) {
      fetchEvents();
    }
  }, [selectedEvent]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/events');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch events');
      }

      // Filter for Code & Coffee and Code & Brews events
      const coffeeBrewsEvents = data.events.filter(
        event => event.event_type === 'code_and_coffee' || event.event_type === 'code_and_brews'
      );

      setEvents(coffeeBrewsEvents);
      setError(null);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeInfo = (eventType) => {
    if (eventType === 'code_and_coffee') {
      return {
        icon: '☕',
        label: 'Code & Coffee',
        color: 'bg-amber-500/10 text-amber-600 border-amber-500/20'
      };
    }
    return {
      icon: '🍺',
      label: 'Code & Brews',
      color: 'bg-orange-500/10 text-orange-600 border-orange-500/20'
    };
  };

  const formatEventDate = (dateString) => {
    if (!dateString) return 'Date TBD';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';

    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 0) return 'Past Event';
    if (diffDays < 7) return `In ${diffDays} days`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // If an event is selected, show the room
  if (selectedEvent) {
    return (
      <CodeCoffeeRoom
        event={selectedEvent}
        walletAddress={walletAddress}
        onBack={() => setSelectedEvent(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold mb-2">Error Loading Events</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchEvents} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">Coffee & Brews Rooms</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Join Code & Coffee and Code & Brews event rooms to see what the community is working on
        </p>
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">☕</div>
            <h3 className="text-xl font-bold mb-2">No Events Yet</h3>
            <p className="text-muted-foreground">
              Check back soon for upcoming Code & Coffee and Code & Brews events
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {events.map((event, index) => {
            const typeInfo = getEventTypeInfo(event.event_type);
            const dateLabel = formatEventDate(event.date);
            const isPastEvent = dateLabel === 'Past Event';

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <Card className={`h-full active:scale-[0.98] transition-all ${
                  isPastEvent ? 'opacity-60' : ''
                }`}>
                  {event.thumbnail_url && (
                    <div className="aspect-video w-full overflow-hidden rounded-t-xl">
                      <img
                        src={event.thumbnail_url}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="p-3 sm:p-4 md:p-6">
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] xs:text-xs font-medium border ${typeInfo.color}`}>
                            <span className="text-sm">{typeInfo.icon}</span>
                            <span className="hidden xs:inline">{typeInfo.label}</span>
                          </span>
                          <span className="text-[10px] xs:text-xs text-muted-foreground font-medium">
                            {dateLabel}
                          </span>
                        </div>
                        <CardTitle className="text-base sm:text-lg mb-1 leading-tight">{event.title}</CardTitle>
                        <CardDescription className="text-xs sm:text-sm line-clamp-2">
                          {event.description}
                        </CardDescription>
                      </div>
                      {!event.thumbnail_url && (
                        <div className="text-2xl sm:text-3xl flex-shrink-0">
                          {typeInfo.icon}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                    <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm mb-3 sm:mb-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="text-sm sm:text-base">📅</span>
                        <span>{event.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="text-sm sm:text-base">🕐</span>
                        <span>{event.time}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="text-sm sm:text-base">📍</span>
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                      {event.total_rsvps !== undefined && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="text-sm sm:text-base">👥</span>
                          <span>{event.total_rsvps} {event.total_rsvps === 1 ? 'person' : 'people'} going</span>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => setSelectedEvent(event)}
                      className="w-full touch-manipulation min-h-[44px] text-sm sm:text-base"
                      variant={isPastEvent ? 'outline' : 'default'}
                    >
                      {isPastEvent ? '📋 View Event Room' : '🚪 Enter Room'}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
